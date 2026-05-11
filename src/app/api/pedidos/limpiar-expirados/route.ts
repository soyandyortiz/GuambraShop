/**
 * POST /api/pedidos/limpiar-expirados
 *
 * Cron job que realiza dos tareas:
 *   1. Elimina pedidos_temporales expirados + sus citas/alquileres
 *   2. Elimina comprobantes de Storage cuyo plazo de 48h venció
 *
 * Protegido por CRON_SECRET si está configurado.
 * Configurado en vercel.json para ejecutarse cada 5 minutos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  // Validar CRON_SECRET si está configurado
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const admin = crearAdmin()
  let temporalesEliminados = 0
  let comprobantesEliminados = 0

  // ── Tarea 1: pedidos temporales expirados ────────────────────────────────
  const { data: eliminados, error: errRpc } = await admin
    .rpc('limpiar_pedidos_expirados')

  if (!errRpc && eliminados != null) {
    temporalesEliminados = Number(eliminados)
  } else if (errRpc) {
    console.error('[limpiar-expirados] RPC error:', errRpc)
  }

  // ── Tarea 2: comprobantes con plazo de eliminación vencido ───────────────
  const { data: pedidosVencidos, error: errBuscar } = await admin
    .from('pedidos')
    .select('id, comprobante_url')
    .not('comprobante_url', 'is', null)
    .lt('comprobante_eliminar_en', new Date().toISOString())

  if (!errBuscar && pedidosVencidos?.length) {
    const paths = pedidosVencidos
      .map(p => p.comprobante_url as string)
      .filter(Boolean)

    if (paths.length > 0) {
      const { error: errStorage } = await admin.storage
        .from('comprobantes')
        .remove(paths)

      if (!errStorage) {
        // Limpiar las columnas en la tabla pedidos
        const ids = pedidosVencidos.map(p => p.id)
        await admin
          .from('pedidos')
          .update({
            comprobante_url:        null,
            comprobante_eliminar_en: null,
          })
          .in('id', ids)

        comprobantesEliminados = paths.length
      } else {
        console.error('[limpiar-expirados] Storage remove error:', errStorage)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    temporales_eliminados:    temporalesEliminados,
    comprobantes_eliminados:  comprobantesEliminados,
    ejecutado_en:             new Date().toISOString(),
  })
}

// GET también permitido para Vercel Cron (usa GET por defecto)
export async function GET(req: NextRequest) {
  return POST(req)
}
