/**
 * POST /api/facturacion/desde-pedido
 * Body: { pedidoId: string }
 *
 * Flujo automático completo:
 *  1. Carga pedido + configuracion_facturacion
 *  2. Si existe factura rechazada → re-emite (sin crear nueva)
 *  3. Si no existe → construye comprador, ítems, totales e inserta borrador
 *  4. Descarga .p12 vía Supabase SDK (soporta buckets privados)
 *  5. Genera clave de acceso + XML + firma XAdES-BES
 *  6. Envía al SRI (recepción + autorización)
 *  7. Actualiza factura con resultado
 *  8. Retorna estado final
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export const maxDuration = 60
import { generarClaveAcceso, generarXMLFactura } from '@/lib/sri/generar-xml'
import { firmarXML } from '@/lib/sri/firmar-xades'
import { emitirAlSRI } from '@/lib/sri/soap-sri'
import type { ConfiguracionFacturacion, Factura, ItemFactura, CompradorFactura } from '@/types'

/** Cliente con service role para leer Storage sin restricciones RLS */
function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json() as { pedidoId: string }
    if (!pedidoId) return NextResponse.json({ error: 'pedidoId requerido' }, { status: 400 })

    const supabase = await crearClienteServidor()

    // Verificar sesión
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // 1. Verificar factura existente (excluye anuladas)
    const { data: facturaExistente } = await supabase
      .from('facturas')
      .select('id, estado, numero_factura, clave_acceso')
      .eq('pedido_id', pedidoId)
      .neq('estado', 'anulada')
      .maybeSingle()

    // "enviada" → el SRI ya recibió el XML; solo consultar autorización
    if (facturaExistente?.estado === 'enviada') {
      const { data: cfg } = await supabase.from('configuracion_facturacion').select('ambiente').single()
      const ambiente = (cfg?.ambiente ?? 'pruebas') as 'pruebas' | 'produccion'
      const claveAcceso = facturaExistente.clave_acceso as string | null

      if (!claveAcceso) {
        return NextResponse.json({ error: 'Factura enviada sin clave de acceso — contacta soporte' }, { status: 422 })
      }

      const { consultarAutorizacion } = await import('@/lib/sri/soap-sri')
      // Reintentar hasta 4 veces con 4 s de pausa — el SRI de pruebas puede tardar
      let autorizacion: Awaited<ReturnType<typeof consultarAutorizacion>> | null = null
      for (let intento = 0; intento < 4; intento++) {
        try {
          autorizacion = await consultarAutorizacion(claveAcceso, ambiente)
          if (autorizacion.ok || autorizacion.mensajes.length > 0) break
        } catch (fetchErr: unknown) {
          if (intento === 3) {
            const msg = (fetchErr as Error).message ?? 'Error de red'
            return NextResponse.json({
              ok: false, estado: 'enviada',
              error: `No se pudo conectar con el SRI: ${msg}. Reintenta en unos minutos.`,
              facturaId: facturaExistente.id,
            }, { status: 503 })
          }
        }
        if (intento < 3) await new Promise(r => setTimeout(r, 4000))
      }

      if (!autorizacion) {
        return NextResponse.json({ ok: false, estado: 'enviada', error: 'Sin respuesta del SRI', facturaId: facturaExistente.id })
      }

      if (autorizacion.ok) {
        const numFactura = facturaExistente.numero_factura ?? ''
        await supabase.from('facturas').update({
          estado:              'autorizada',
          numero_autorizacion: autorizacion.numeroAutorizacion,
          fecha_autorizacion:  autorizacion.fechaAutorizacion
            ? new Date(autorizacion.fechaAutorizacion).toISOString()
            : new Date().toISOString(),
          error_sri: null,
        }).eq('id', facturaExistente.id)

        return NextResponse.json({
          ok: true,
          estado:             'autorizada',
          numeroFactura:      numFactura,
          numeroAutorizacion: autorizacion.numeroAutorizacion,
          facturaId:          facturaExistente.id,
          rideUrl:            `/api/facturacion/ride?id=${facturaExistente.id}`,
        })
      }

      // SRI aún no autoriza — puede que necesite más tiempo o la rechazó
      const errorMsg = (autorizacion.mensajes ?? [])
        .map((m: any) => `${m.identificador}: ${m.mensaje}${m.informacionAdicional ? ' — ' + m.informacionAdicional : ''}`)
        .join(' | ')

      if (errorMsg) {
        await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', facturaExistente.id)
        return NextResponse.json({ ok: false, estado: 'rechazada', error: errorMsg, facturaId: facturaExistente.id })
      }

      // Sin respuesta aún → informar sin cambiar estado
      return NextResponse.json({ ok: false, estado: 'enviada', error: 'El SRI aún no ha procesado la autorización, reintenta en unos segundos', facturaId: facturaExistente.id })
    }

    // Si ya existe y NO es rechazada ni enviada → bloquear
    if (facturaExistente && facturaExistente.estado !== 'rechazada') {
      return NextResponse.json({
        error: `Este pedido ya tiene una factura (${facturaExistente.numero_factura ?? facturaExistente.id}) en estado "${facturaExistente.estado}"`,
        facturaId: facturaExistente.id,
      }, { status: 422 })
    }

    // 2. Cargar pedido
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedidoId)
      .single()

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    // 3. Cargar configuración SRI
    const { data: config } = await supabase
      .from('configuracion_facturacion')
      .select('*')
      .single()

    if (!config) return NextResponse.json({ error: 'Configura primero los datos SRI en Facturación → Configurar SRI' }, { status: 422 })
    if (!config.cert_p12_url || !config.cert_pin) {
      return NextResponse.json({ error: 'Sube el certificado .p12 y PIN en Facturación → Configurar SRI' }, { status: 422 })
    }

    const cfg = config as ConfiguracionFacturacion
    const tarifa = cfg.tarifa_iva

    // 4. Obtener o crear factura
    let factura: Factura

    if (facturaExistente) {
      // Re-emitir factura rechazada — cargar datos completos y actualizar fecha
      const hoy = new Date().toISOString().slice(0, 10)
      const { data: facturaCompleta, error: errLoad } = await supabase
        .from('facturas')
        .update({ fecha_emision: hoy, estado: 'borrador', error_sri: null })
        .eq('id', facturaExistente.id)
        .select('*')
        .single()

      if (errLoad || !facturaCompleta) {
        return NextResponse.json({ error: 'No se pudo cargar la factura rechazada' }, { status: 500 })
      }
      factura = facturaCompleta as Factura
    } else {
      // Construir comprador
      const df = (pedido as any).datos_facturacion
      let comprador: CompradorFactura

      if (df) {
        comprador = {
          tipo_identificacion: df.tipo_identificacion ?? '05',
          identificacion:      df.identificacion ?? '9999999999999',
          razon_social:        df.razon_social ?? 'CONSUMIDOR FINAL',
          email:               df.email ?? pedido.email ?? null,
          direccion:           df.direccion ?? null,
          telefono:            df.telefono ?? pedido.whatsapp ?? null,
        }
      } else {
        comprador = {
          tipo_identificacion: '07',
          identificacion:      '9999999999999',
          razon_social:        'CONSUMIDOR FINAL',
          email:               pedido.email ?? null,
          direccion:           null,
          telefono:            pedido.whatsapp ?? null,
        }
      }

      // Construir ítems
      const itemsPedido = (pedido.items ?? []) as any[]
      const items: ItemFactura[] = itemsPedido.map((item: any) => {
        let nombreBase = item.nombre as string
        const esAlquiler = item.tipo_producto === 'alquiler'
        const esServicio = item.tipo_producto === 'servicio'

        let descripcion: string
        if (esAlquiler) {
          const dias = item.alquiler?.dias ?? 1
          descripcion = `ALQUILER DE TRAJE ${nombreBase.toUpperCase()}`
          if (item.variante || item.nombre_variante) descripcion += ` - ${(item.variante || item.nombre_variante).toUpperCase()}`
          if (item.talla) descripcion += ` - TALLA ${item.talla}`
          descripcion += ` (${dias} DÍA${dias !== 1 ? 'S' : ''})`
        } else if (esServicio) {
          descripcion = `SERVICIO: ${nombreBase.toUpperCase()}`
          if (item.variante || item.nombre_variante) descripcion += ` - ${(item.variante || item.nombre_variante).toUpperCase()}`
          if (item.cita?.fecha) descripcion += ` (${item.cita.fecha})`
        } else {
          descripcion = nombreBase.toUpperCase()
          if (item.variante || item.nombre_variante) descripcion += ` - ${(item.variante || item.nombre_variante).toUpperCase()}`
          if (item.talla) descripcion += ` - TALLA ${item.talla}`
        }

        const subtotalConIVA: number = item.subtotal ?? 0
        const baseImponible = parseFloat((subtotalConIVA / (1 + tarifa / 100)).toFixed(2))
        const cantidad = item.cantidad ?? 1
        const precioUnitario = parseFloat((baseImponible / cantidad).toFixed(6))

        return {
          descripcion,
          cantidad,
          precio_unitario: precioUnitario,
          descuento: 0,
          subtotal: baseImponible,
          iva: tarifa,
        }
      })

      if (pedido.costo_envio > 0) {
        const baseEnvio = parseFloat((pedido.costo_envio / (1 + tarifa / 100)).toFixed(2))
        items.push({
          descripcion: 'COSTO DE ENVÍO',
          cantidad: 1,
          precio_unitario: baseEnvio,
          descuento: 0,
          subtotal: baseEnvio,
          iva: tarifa,
        })
      }

      // Calcular totales
      const subtotal_iva  = parseFloat(items.filter(i => i.iva > 0).reduce((s, i) => s + i.subtotal, 0).toFixed(2))
      const subtotal_0    = parseFloat(items.filter(i => i.iva === 0).reduce((s, i) => s + i.subtotal, 0).toFixed(2))
      const total_iva     = parseFloat((subtotal_iva * tarifa / 100).toFixed(2))
      const descuento     = parseFloat((pedido.descuento_cupon ?? 0).toFixed(2))
      const total         = parseFloat((subtotal_0 + subtotal_iva + total_iva - descuento).toFixed(2))
      const totales = { subtotal_0, subtotal_iva, total_iva, descuento, total }

      // Siguiente secuencial
      const { data: cfgActual } = await supabase
        .from('configuracion_facturacion')
        .select('secuencial_actual, id')
        .single()

      const seq = cfgActual!.secuencial_actual
      const seqStr = String(seq).padStart(9, '0')
      const numFactura = `${cfg.codigo_establecimiento.padStart(3,'0')}-${cfg.punto_emision.padStart(3,'0')}-${seqStr}`

      const { data: facturaData, error: errInsert } = await supabase
        .from('facturas')
        .insert({
          pedido_id:         pedidoId,
          numero_secuencial: seqStr,
          numero_factura:    numFactura,
          fecha_emision:     new Date().toISOString().slice(0, 10),
          estado:            'borrador',
          datos_comprador:   comprador,
          items,
          totales,
          notas:             `Pedido #${pedido.numero_orden}`,
        })
        .select('*')
        .single()

      if (errInsert || !facturaData) {
        throw new Error(errInsert?.message ?? 'Error al crear la factura')
      }

      factura = facturaData as Factura

      await supabase
        .from('configuracion_facturacion')
        .update({ secuencial_actual: seq + 1 })
        .eq('id', cfgActual!.id)
    }

    // 5. Descargar .p12 con service role (omite RLS de Storage)
    const certPathMatch = cfg.cert_p12_url!.match(/\/storage\/v1\/object\/(?:public\/)?facturacion\/(.+)/)
    const certPath = certPathMatch?.[1]
    if (!certPath) {
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: 'URL del certificado inválida' }).eq('id', factura.id)
      return NextResponse.json({ error: 'URL del certificado inválida. Vuelve a subir el .p12 en Configuración SRI.', facturaId: factura.id }, { status: 500 })
    }
    const admin = crearClienteAdmin()
    const { data: certBlob, error: certErr } = await admin.storage.from('facturacion').download(certPath)
    if (certErr || !certBlob) {
      const detalle = certErr?.message ?? 'blob nulo'
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: `Certificado: ${detalle}` }).eq('id', factura.id)
      return NextResponse.json({ error: `No se pudo descargar el certificado: ${detalle}`, facturaId: factura.id }, { status: 500 })
    }
    const p12Buffer = Buffer.from(await certBlob.arrayBuffer())

    // 6. Generar clave de acceso + XML + firma
    const claveAcceso = generarClaveAcceso(cfg, factura)
    const xmlSinFirma = generarXMLFactura(cfg, factura, claveAcceso)

    let xmlFirmado: string
    try {
      xmlFirmado = firmarXML(xmlSinFirma, p12Buffer, cfg.cert_pin!)
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Error al firmar'
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: `Firma: ${msg}` }).eq('id', factura.id)
      return NextResponse.json({ error: `Error al firmar: ${msg}`, facturaId: factura.id }, { status: 500 })
    }

    await supabase.from('facturas').update({
      estado:       'enviada',
      clave_acceso: claveAcceso,
      xml_firmado:  xmlFirmado,
      error_sri:    null,
    }).eq('id', factura.id)

    // 7. Enviar al SRI
    const { recepcion, autorizacion } = await emitirAlSRI(xmlFirmado, claveAcceso, cfg.ambiente)

    if (!recepcion.ok) {
      const errorMsg = recepcion.mensajes.map(m => `${m.identificador}: ${m.mensaje}`).join(' | ')
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', factura.id)
      return NextResponse.json({
        ok: false, estado: 'rechazada',
        error: errorMsg || 'El SRI devolvió el comprobante (DEVUELTA)',
        facturaId: factura.id,
        mensajes: recepcion.mensajes,
      })
    }

    if (autorizacion?.ok) {
      const numFactura = factura.numero_factura ?? `${cfg.codigo_establecimiento.padStart(3,'0')}-${cfg.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`
      await supabase.from('facturas').update({
        estado:               'autorizada',
        numero_autorizacion:  autorizacion.numeroAutorizacion,
        numero_factura:       numFactura,
        fecha_autorizacion:   autorizacion.fechaAutorizacion ? new Date(autorizacion.fechaAutorizacion).toISOString() : new Date().toISOString(),
        error_sri:            null,
      }).eq('id', factura.id)

      return NextResponse.json({
        ok: true,
        estado:             'autorizada',
        numeroFactura:      numFactura,
        numeroAutorizacion: autorizacion.numeroAutorizacion,
        facturaId:          factura.id,
        rideUrl:            `/api/facturacion/ride?id=${factura.id}`,
      })
    }

    // Rechazada por el SRI (NO AUTORIZADO)
    const errorMsg = (autorizacion?.mensajes ?? [])
      .map((m: any) => `${m.identificador}: ${m.mensaje}${m.informacionAdicional ? ' — ' + m.informacionAdicional : ''}`)
      .join(' | ')

    await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', factura.id)
    return NextResponse.json({
      ok: false, estado: 'rechazada',
      error: errorMsg || 'El SRI no autorizó el comprobante',
      facturaId: factura.id,
      mensajes: autorizacion?.mensajes ?? [],
    })

  } catch (err: unknown) {
    console.error('[facturacion/desde-pedido]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
