/**
 * POST /api/facturacion/nota-credito
 * Body: { facturaOrigenId: string; motivo: string }
 *
 * Emite una Nota de Crédito Electrónica (código 04) que revierte totalmente
 * la factura autorizada indicada. Flujo: crea registro → genera XML → firma
 * XAdES-BES → envía al SRI → consulta autorización → actualiza BD.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { generarClaveAcceso, generarXMLNotaCredito } from '@/lib/sri/generar-xml'
import { firmarXML } from '@/lib/sri/firmar-xades'
import { emitirAlSRI } from '@/lib/sri/soap-sri'
import type { Factura, ConfiguracionFacturacion } from '@/types'

export const maxDuration = 60

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const { facturaOrigenId, motivo } = await req.json() as { facturaOrigenId: string; motivo: string }
    if (!facturaOrigenId) return NextResponse.json({ error: 'facturaOrigenId requerido' }, { status: 400 })
    if (!motivo?.trim())  return NextResponse.json({ error: 'El motivo es obligatorio' }, { status: 400 })

    const supabase = await crearClienteServidor()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Cargar factura original y config
    const [{ data: facturaOrigen }, { data: configData }] = await Promise.all([
      supabase.from('facturas').select('*').eq('id', facturaOrigenId).single(),
      supabase.from('configuracion_facturacion').select('*').single(),
    ])

    if (!facturaOrigen) return NextResponse.json({ error: 'Factura original no encontrada' }, { status: 404 })
    if (!configData)    return NextResponse.json({ error: 'Configuración SRI no encontrada' }, { status: 422 })

    const original = facturaOrigen as Factura
    const config   = configData as ConfiguracionFacturacion

    if (original.estado !== 'autorizada') {
      return NextResponse.json({ error: 'Solo se pueden emitir Notas de Crédito para facturas autorizadas' }, { status: 422 })
    }
    if (original.tipo === 'nota_credito') {
      return NextResponse.json({ error: 'No se puede emitir una Nota de Crédito sobre otra Nota de Crédito' }, { status: 422 })
    }

    // Verificar que no haya ya una NC para esta factura
    const { count: ncExistente } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .eq('factura_origen_id', facturaOrigenId)
      .neq('estado', 'rechazada')

    if ((ncExistente ?? 0) > 0) {
      return NextResponse.json({ error: 'Ya existe una Nota de Crédito activa para esta factura' }, { status: 422 })
    }

    if (!config.cert_p12_url || !config.cert_pin) {
      return NextResponse.json({ error: 'Certificado digital (.p12) o PIN no configurados' }, { status: 422 })
    }

    // Obtener secuencial NC e incrementar atómicamente
    const admin = crearAdmin()
    const secuencialNC = config.secuencial_nc_actual
    await admin.from('configuracion_facturacion')
      .update({ secuencial_nc_actual: secuencialNC + 1 })
      .eq('id', config.id)

    // Crear registro NC en BD (hereda comprador e items de la factura original)
    const hoy = new Date().toISOString().slice(0, 10)
    const { data: ncData, error: errNC } = await admin.from('facturas').insert({
      tipo:             'nota_credito',
      factura_origen_id: facturaOrigenId,
      pedido_id:        original.pedido_id,
      numero_secuencial: String(secuencialNC),
      fecha_emision:    hoy,
      estado:           'enviada',
      datos_comprador:  original.datos_comprador,
      items:            original.items,
      totales:          original.totales,
      notas:            motivo.trim(),
    }).select('*').single()

    if (errNC || !ncData) {
      return NextResponse.json({ error: 'Error al crear la Nota de Crédito en BD' }, { status: 500 })
    }

    const nc = ncData as Factura

    // Descargar certificado .p12
    const certPathMatch = config.cert_p12_url.match(/\/storage\/v1\/object\/(?:public\/)?facturacion\/(.+)/)
    const certPath = certPathMatch?.[1]
    if (!certPath) {
      return NextResponse.json({ error: 'URL del certificado inválida' }, { status: 500 })
    }
    const { data: certBlob, error: certErr } = await admin.storage.from('facturacion').download(certPath)
    if (certErr || !certBlob) {
      return NextResponse.json({ error: `No se pudo descargar el certificado: ${certErr?.message}` }, { status: 500 })
    }
    const p12Buffer = Buffer.from(await certBlob.arrayBuffer())

    // Generar clave de acceso (codDoc = '04')
    const claveAcceso = generarClaveAcceso(config, nc, '04')
    const xmlSinFirma = generarXMLNotaCredito(config, nc, original, claveAcceso)

    // Firmar
    let xmlFirmado: string
    try {
      xmlFirmado = firmarXML(xmlSinFirma, p12Buffer, config.cert_pin)
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Error de firma'
      await admin.from('facturas').update({ estado: 'rechazada', error_sri: `Error de firma: ${msg}` }).eq('id', nc.id)
      return NextResponse.json({ error: `Error al firmar la NC: ${msg}` }, { status: 500 })
    }

    // Guardar clave + xml en BD
    await admin.from('facturas').update({
      clave_acceso: claveAcceso,
      xml_firmado:  xmlFirmado,
      error_sri:    null,
    }).eq('id', nc.id)

    // Enviar al SRI
    const { recepcion, autorizacion } = await emitirAlSRI(xmlFirmado, claveAcceso, config.ambiente)

    if (!recepcion.ok) {
      const errorMsg = recepcion.mensajes.map(m => `${m.identificador}: ${m.mensaje}`).join(' | ')
      await admin.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', nc.id)
      return NextResponse.json({ ok: false, etapa: 'recepcion', estado: 'rechazada', mensajes: recepcion.mensajes })
    }

    if (!autorizacion) {
      return NextResponse.json({ ok: true, etapa: 'recepcion', estado: 'enviada', ncId: nc.id })
    }

    if (autorizacion.ok) {
      const numeroNC = `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${nc.numero_secuencial.padStart(9,'0')}`
      await admin.from('facturas').update({
        estado:              'autorizada',
        numero_autorizacion: autorizacion.numeroAutorizacion,
        numero_factura:      numeroNC,
        fecha_autorizacion:  autorizacion.fechaAutorizacion
          ? new Date(autorizacion.fechaAutorizacion).toISOString()
          : new Date().toISOString(),
        error_sri: null,
      }).eq('id', nc.id)

      return NextResponse.json({
        ok: true,
        etapa: 'autorizada',
        estado: 'autorizada',
        ncId: nc.id,
        numeroNC,
        numeroAutorizacion: autorizacion.numeroAutorizacion,
      })
    }

    const errorMsg = autorizacion.mensajes
      .map(m => `${m.identificador}: ${m.mensaje}${m.informacionAdicional ? ' — ' + m.informacionAdicional : ''}`)
      .join(' | ')
    await admin.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', nc.id)
    return NextResponse.json({ ok: false, etapa: 'autorizacion', estado: 'rechazada', mensajes: autorizacion.mensajes })

  } catch (err: unknown) {
    console.error('[facturacion/nota-credito]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
