/**
 * POST /api/pedidos/payphone/crear-orden
 *
 * Recibe los datos completos del carrito, crea un pedido_temporal,
 * llama a la API de Payphone y devuelve { payWithCard } (URL de pago).
 * El pedido real se crea en /confirmar tras el redirect de Payphone.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearTransaccionPayphone } from '@/lib/payphone'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const pedidoData = await req.json()

    if (!pedidoData.total || Number(pedidoData.total) <= 0) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 })
    }

    const admin = crearAdmin()

    const { data: cfg } = await admin
      .from('configuracion_tienda')
      .select('payphone_activo, payphone_token, payphone_store_id')
      .single()

    if (!cfg?.payphone_activo || !cfg.payphone_token) {
      return NextResponse.json({ error: 'Payphone no está configurado en esta tienda.' }, { status: 422 })
    }

    // Guardar datos del carrito en temporal (30 min — suficiente para pagar)
    const { data: temporal, error: errTemporal } = await admin
      .from('pedidos_temporales')
      .insert({
        tipo:               pedidoData.tipo,
        nombres:            pedidoData.nombres,
        email:              pedidoData.email,
        whatsapp:           pedidoData.whatsapp,
        provincia:          pedidoData.provincia ?? null,
        ciudad:             pedidoData.ciudad ?? null,
        direccion:          pedidoData.direccion ?? null,
        detalles_direccion: pedidoData.detalles_direccion ?? null,
        items:              pedidoData.items,
        simbolo_moneda:     pedidoData.simbolo_moneda,
        subtotal:           pedidoData.subtotal,
        descuento_cupon:    pedidoData.descuento_cupon,
        cupon_codigo:       pedidoData.cupon_codigo ?? null,
        costo_envio:        pedidoData.costo_envio,
        total:              pedidoData.total,
        datos_facturacion:  pedidoData.datos_facturacion ?? null,
        citas_ids:          [],
        alquileres_ids:     [],
        expira_en:          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select('numero_temporal')
      .single()

    if (errTemporal || !temporal) {
      console.error('[payphone/crear-orden] temporal error:', errTemporal)
      return NextResponse.json({ error: 'Error al preparar el pedido.' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin

    const transaccion = await crearTransaccionPayphone({
      token:               cfg.payphone_token,
      amount:              Number(pedidoData.total),
      clientTransactionId: temporal.numero_temporal,
      responseUrl:         `${siteUrl}/api/pedidos/payphone/confirmar`,
      cancellationUrl:     `${siteUrl}/carrito`,
      storeId:             cfg.payphone_store_id,
      reference:           `Pedido ${temporal.numero_temporal}`,
    })

    return NextResponse.json({ payWithCard: transaccion.payWithCard })
  } catch (err) {
    console.error('[payphone/crear-orden]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    )
  }
}
