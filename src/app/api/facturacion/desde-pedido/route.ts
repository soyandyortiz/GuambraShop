/**
 * POST /api/facturacion/desde-pedido
 * Body: { pedidoId: string }
 *
 * Flujo automático completo:
 *  1. Carga pedido + configuracion_facturacion
 *  2. Construye comprador (desde datos_facturacion o datos de contacto)
 *  3. Construye ítems (prefija "ALQUILER DE TRAJE" para alquileres)
 *  4. Calcula base imponible y totales con IVA
 *  5. Inserta factura como borrador
 *  6. Genera clave de acceso + XML + firma XAdES-BES
 *  7. Envía al SRI (recepción + autorización)
 *  8. Actualiza factura con resultado
 *  9. Retorna estado final
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { generarClaveAcceso, generarXMLFactura } from '@/lib/sri/generar-xml'
import { firmarXML } from '@/lib/sri/firmar-xades'
import { emitirAlSRI } from '@/lib/sri/soap-sri'
import type { ConfiguracionFacturacion, Factura, ItemFactura, CompradorFactura } from '@/types'

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

    // 1. Cargar pedido
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedidoId)
      .single()

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    // Verificar que no tenga ya una factura activa
    const { data: facturaExistente } = await supabase
      .from('facturas')
      .select('id, estado, numero_factura')
      .eq('pedido_id', pedidoId)
      .neq('estado', 'anulada')
      .maybeSingle()

    if (facturaExistente) {
      return NextResponse.json({
        error: `Este pedido ya tiene una factura (${facturaExistente.numero_factura ?? facturaExistente.id}) en estado "${facturaExistente.estado}"`,
        facturaId: facturaExistente.id,
      }, { status: 422 })
    }

    // 2. Cargar configuración SRI
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

    // 3. Construir comprador
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

    // 4. Construir ítems con prefijo según tipo
    const itemsPedido = (pedido.items ?? []) as any[]
    const items: ItemFactura[] = itemsPedido.map((item: any) => {
      // Nombre con prefijo
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

      // Precio: el subtotal del pedido es precio * dias * cantidad (IVA incluido)
      // Separamos la base imponible
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

    // Agregar envío como ítem si aplica
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

    // 5. Calcular totales
    const subtotal_iva  = parseFloat(items.filter(i => i.iva > 0).reduce((s, i) => s + i.subtotal, 0).toFixed(2))
    const subtotal_0    = parseFloat(items.filter(i => i.iva === 0).reduce((s, i) => s + i.subtotal, 0).toFixed(2))
    const total_iva     = parseFloat((subtotal_iva * tarifa / 100).toFixed(2))
    const descuento     = parseFloat((pedido.descuento_cupon ?? 0).toFixed(2))
    const total         = parseFloat((subtotal_0 + subtotal_iva + total_iva - descuento).toFixed(2))

    const totales = { subtotal_0, subtotal_iva, total_iva, descuento, total }

    // 6. Obtener siguiente secuencial
    const { data: cfgActual } = await supabase
      .from('configuracion_facturacion')
      .select('secuencial_actual, id')
      .single()

    const seq = cfgActual!.secuencial_actual
    const seqStr = String(seq).padStart(9, '0')
    const numFactura = `${cfg.codigo_establecimiento.padStart(3,'0')}-${cfg.punto_emision.padStart(3,'0')}-${seqStr}`

    // 7. Insertar factura borrador
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

    const factura = facturaData as Factura

    // Incrementar secuencial
    await supabase
      .from('configuracion_facturacion')
      .update({ secuencial_actual: seq + 1 })
      .eq('id', cfgActual!.id)

    // 8. Descargar .p12
    const certRes = await fetch(cfg.cert_p12_url!)
    if (!certRes.ok) {
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: 'No se pudo descargar el certificado' }).eq('id', factura.id)
      return NextResponse.json({ error: 'No se pudo descargar el certificado digital', facturaId: factura.id }, { status: 500 })
    }
    const p12Buffer = Buffer.from(await certRes.arrayBuffer())

    // 9. Generar clave + XML + firma
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

    // 10. Enviar al SRI
    const { recepcion, autorizacion } = await emitirAlSRI(xmlFirmado, claveAcceso, cfg.ambiente)

    if (!recepcion.ok) {
      const errorMsg = recepcion.mensajes.map(m => `${m.identificador}: ${m.mensaje}`).join(' | ')
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', factura.id)
      return NextResponse.json({
        ok: false, estado: 'rechazada',
        error: errorMsg,
        facturaId: factura.id,
        mensajes: recepcion.mensajes,
      })
    }

    if (autorizacion?.ok) {
      await supabase.from('facturas').update({
        estado:               'autorizada',
        numero_autorizacion:  autorizacion.numeroAutorizacion,
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

    // Rechazada
    const errorMsg = (autorizacion?.mensajes ?? [])
      .map((m: any) => `${m.identificador}: ${m.mensaje}`)
      .join(' | ')

    await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', factura.id)
    return NextResponse.json({
      ok: false, estado: 'rechazada',
      error: errorMsg || 'El SRI rechazó el comprobante',
      facturaId: factura.id,
    })

  } catch (err: unknown) {
    console.error('[facturacion/desde-pedido]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
