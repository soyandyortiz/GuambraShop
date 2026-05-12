/**
 * POST /api/pedidos/paypal/crear-orden
 *
 * Recibe { numero_temporal } y crea una orden en PayPal.
 * Devuelve { paypal_order_id }.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obtenerToken, crearOrdenPayPal } from '@/lib/paypal'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function monedaDesde(pais: string): string {
  const mapa: Record<string, string> = { EC: 'USD', PE: 'PEN', CO: 'COP' }
  return mapa[pais] ?? 'USD'
}

export async function POST(req: Request) {
  try {
    const { numero_temporal } = await req.json()

    if (!numero_temporal) {
      return NextResponse.json({ error: 'Falta numero_temporal' }, { status: 400 })
    }

    const admin = crearAdmin()

    // 1. Buscar el pedido temporal
    const { data: temporal, error: errTemp } = await admin
      .from('pedidos_temporales')
      .select('id, total, expira_en')
      .eq('numero_temporal', numero_temporal)
      .single()

    if (errTemp || !temporal) {
      return NextResponse.json({ error: 'Pedido temporal no encontrado o expirado.' }, { status: 404 })
    }

    if (new Date(temporal.expira_en) < new Date()) {
      return NextResponse.json({ error: 'El tiempo límite expiró. Inicia el proceso nuevamente.' }, { status: 410 })
    }

    // 2. Obtener configuración PayPal
    const { data: cfg } = await admin
      .from('configuracion_tienda')
      .select('paypal_activo, paypal_client_id, paypal_secret, paypal_modo, pais')
      .single()

    if (!cfg?.paypal_activo || !cfg.paypal_client_id || !cfg.paypal_secret) {
      return NextResponse.json({ error: 'PayPal no está configurado en esta tienda.' }, { status: 422 })
    }

    const moneda = monedaDesde(cfg.pais ?? 'EC')

    // 3. Crear orden en PayPal
    const token = await obtenerToken(cfg.paypal_client_id, cfg.paypal_secret, cfg.paypal_modo)
    const orden = await crearOrdenPayPal({
      token,
      modo:      cfg.paypal_modo,
      total:     Number(temporal.total),
      moneda,
      referencia: numero_temporal,
    })

    return NextResponse.json({ paypal_order_id: orden.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[paypal/crear-orden]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
