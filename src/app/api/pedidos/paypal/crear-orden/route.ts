/**
 * POST /api/pedidos/paypal/crear-orden
 *
 * Recibe { total } y crea una orden en PayPal.
 * El pedido real se crea en /capturar tras la aprobación del usuario.
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
    const { total } = await req.json()

    if (!total || Number(total) <= 0) {
      return NextResponse.json({ error: 'Total de pedido inválido.' }, { status: 400 })
    }

    const admin = crearAdmin()

    const { data: cfg } = await admin
      .from('configuracion_tienda')
      .select('paypal_activo, paypal_client_id, paypal_secret, paypal_modo, pais')
      .single()

    if (!cfg?.paypal_activo || !cfg.paypal_client_id || !cfg.paypal_secret) {
      return NextResponse.json({ error: 'PayPal no está configurado en esta tienda.' }, { status: 422 })
    }

    const moneda     = monedaDesde(cfg.pais ?? 'EC')
    const referencia = `PP-${Date.now()}`

    const token = await obtenerToken(cfg.paypal_client_id, cfg.paypal_secret, cfg.paypal_modo)
    const orden = await crearOrdenPayPal({
      token,
      modo:       cfg.paypal_modo,
      total:      Number(total),
      moneda,
      referencia,
    })

    return NextResponse.json({ paypal_order_id: orden.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[paypal/crear-orden]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
