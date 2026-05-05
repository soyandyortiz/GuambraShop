/**
 * POST /api/facturacion/emitir
 * Body: { facturaId: string }
 *
 * Flujo:
 *   1. Carga factura + configuracion_facturacion desde Supabase
 *   2. Descarga el .p12 desde Storage
 *   3. Genera clave de acceso + XML sin firma
 *   4. Firma con XAdES-BES
 *   5. Envía al SRI (recepción)
 *   6. Consulta autorización
 *   7. Actualiza la factura en BD con estado, numero_autorizacion y xml_firmado
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'

function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
import { generarClaveAcceso, generarXMLFactura } from '@/lib/sri/generar-xml'
import { firmarXML } from '@/lib/sri/firmar-xades'
import { emitirAlSRI } from '@/lib/sri/soap-sri'
import type { Factura, ConfiguracionFacturacion } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { facturaId } = await req.json() as { facturaId: string }
    if (!facturaId) return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })

    const supabase = await crearClienteServidor()

    // Verificar sesión
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // 1. Cargar factura
    const { data: facturaData, error: errFactura } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', facturaId)
      .single()

    if (errFactura || !facturaData) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }
    const factura = facturaData as Factura

    if (!['borrador', 'rechazada'].includes(factura.estado)) {
      return NextResponse.json({ error: `La factura está en estado "${factura.estado}" y no puede ser enviada` }, { status: 422 })
    }

    // 2. Cargar configuración SRI
    const { data: configData, error: errConfig } = await supabase
      .from('configuracion_facturacion')
      .select('*')
      .single()

    if (errConfig || !configData) {
      return NextResponse.json({ error: 'Configuración SRI no encontrada' }, { status: 422 })
    }
    const config = configData as ConfiguracionFacturacion

    if (!config.cert_p12_url || !config.cert_pin) {
      return NextResponse.json({ error: 'Certificado digital (.p12) o PIN no configurados' }, { status: 422 })
    }

    // 3. Descargar el .p12 con service role (omite RLS de Storage)
    const certPathMatch = config.cert_p12_url.match(/\/storage\/v1\/object\/(?:public\/)?facturacion\/(.+)/)
    const certPath = certPathMatch?.[1]
    if (!certPath) {
      return NextResponse.json({ error: 'URL del certificado inválida. Vuelve a subir el .p12 en Configuración SRI.' }, { status: 500 })
    }
    const admin = crearClienteAdmin()
    const { data: certBlob, error: certErr } = await admin.storage.from('facturacion').download(certPath)
    if (certErr || !certBlob) {
      const detalle = certErr?.message ?? 'blob nulo'
      return NextResponse.json({ error: `No se pudo descargar el certificado: ${detalle}` }, { status: 500 })
    }
    const p12Buffer = Buffer.from(await certBlob.arrayBuffer())

    // 4. Generar clave de acceso y XML
    const claveAcceso = generarClaveAcceso(config, factura)
    const xmlSinFirma = generarXMLFactura(config, factura, claveAcceso)

    // 5. Firmar con XAdES-BES
    let xmlFirmado: string
    try {
      xmlFirmado = firmarXML(xmlSinFirma, p12Buffer, config.cert_pin)
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Error al firmar'
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: `Error de firma: ${msg}` }).eq('id', facturaId)
      return NextResponse.json({ error: `Error al firmar el comprobante: ${msg}` }, { status: 500 })
    }

    // Actualizar la factura como "enviada" + guardar clave de acceso
    await supabase.from('facturas').update({
      estado:       'enviada',
      clave_acceso: claveAcceso,
      xml_firmado:  xmlFirmado,
      error_sri:    null,
    }).eq('id', facturaId)

    // 6. Enviar al SRI
    const { recepcion, autorizacion } = await emitirAlSRI(xmlFirmado, claveAcceso, config.ambiente)

    if (!recepcion.ok) {
      const errorMsg = recepcion.mensajes.map(m => `${m.identificador}: ${m.mensaje}`).join(' | ')
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', facturaId)
      return NextResponse.json({
        ok: false,
        etapa: 'recepcion',
        estado: 'rechazada',
        mensajes: recepcion.mensajes,
      })
    }

    // 7. Procesar resultado de autorización
    if (!autorizacion) {
      return NextResponse.json({ ok: true, etapa: 'recepcion', estado: 'enviada', mensajes: [] })
    }

    if (autorizacion.ok) {
      const numeroFactura = `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`
      await supabase.from('facturas').update({
        estado:               'autorizada',
        numero_autorizacion:  autorizacion.numeroAutorizacion,
        numero_factura:       numeroFactura,
        fecha_autorizacion:   autorizacion.fechaAutorizacion
          ? new Date(autorizacion.fechaAutorizacion).toISOString()
          : new Date().toISOString(),
        error_sri: null,
      }).eq('id', facturaId)

      return NextResponse.json({
        ok: true,
        etapa: 'autorizada',
        estado: 'autorizada',
        numeroAutorizacion: autorizacion.numeroAutorizacion,
        mensajes: autorizacion.mensajes,
      })
    }

    // Rechazada por el SRI
    const errorMsg = autorizacion.mensajes
      .map(m => `${m.identificador}: ${m.mensaje}${m.informacionAdicional ? ' — ' + m.informacionAdicional : ''}`)
      .join(' | ')

    await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', facturaId)
    return NextResponse.json({
      ok: false,
      etapa: 'autorizacion',
      estado: 'rechazada',
      mensajes: autorizacion.mensajes,
    })

  } catch (err: unknown) {
    console.error('[facturacion/emitir]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
