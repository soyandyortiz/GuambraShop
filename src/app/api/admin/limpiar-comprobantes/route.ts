/**
 * GET  /api/admin/limpiar-comprobantes → preview: cuántos archivos y bytes se pueden limpiar
 * POST /api/admin/limpiar-comprobantes → ejecuta la limpieza
 *
 * Elimina comprobantes de pago de pedidos ya procesados (completado, cancelado,
 * reembolsado, fallido) que aún tienen archivo en Storage.
 * También limpia los que tienen comprobante_eliminar_en vencido pero no fueron
 * eliminados por el cron.
 */

import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { createClient } from '@supabase/supabase-js'

const ESTADOS_PROCESADOS = ['completado', 'cancelado', 'reembolsado', 'fallido']

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function obtenerPedidosLimpiables() {
  const admin = crearAdmin()

  const { data, error } = await admin
    .from('pedidos')
    .select('id, comprobante_url')
    .not('comprobante_url', 'is', null)
    .or(
      `estado.in.(${ESTADOS_PROCESADOS.join(',')}),comprobante_eliminar_en.lt.${new Date().toISOString()}`
    )

  if (error) throw error
  return (data ?? []).filter(p => p.comprobante_url)
}

// GET — preview sin eliminar nada
export async function GET() {
  try {
    const supabase = await crearClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const pedidos = await obtenerPedidosLimpiables()
    if (pedidos.length === 0) {
      return NextResponse.json({ archivos: 0, bytes: 0 })
    }

    // Obtener tamaño real de cada archivo en Storage
    const admin = crearAdmin()
    let totalBytes = 0

    await Promise.all(pedidos.map(async p => {
      const path = p.comprobante_url as string
      const carpeta = path.split('/').slice(0, -1).join('/')
      const nombre  = path.split('/').pop()!

      const { data: lista } = await admin.storage
        .from('comprobantes')
        .list(carpeta, { search: nombre })

      const archivo = lista?.find(f => f.name === nombre)
      if (archivo?.metadata?.size) {
        totalBytes += Number(archivo.metadata.size)
      }
    }))

    return NextResponse.json({ archivos: pedidos.length, bytes: totalBytes })
  } catch (err) {
    console.error('[limpiar-comprobantes] GET error:', err)
    return NextResponse.json({ error: 'Error al consultar' }, { status: 500 })
  }
}

// POST — ejecuta la limpieza
export async function POST() {
  try {
    const supabase = await crearClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const pedidos = await obtenerPedidosLimpiables()
    if (pedidos.length === 0) {
      return NextResponse.json({ eliminados: 0, bytes: 0 })
    }

    const admin = crearAdmin()
    const paths = pedidos.map(p => p.comprobante_url as string)

    // Eliminar archivos de Storage
    const { error: errStorage } = await admin.storage
      .from('comprobantes')
      .remove(paths)

    if (errStorage) throw errStorage

    // Limpiar columnas en pedidos
    const ids = pedidos.map(p => p.id)
    await admin
      .from('pedidos')
      .update({ comprobante_url: null, comprobante_eliminar_en: null })
      .in('id', ids)

    return NextResponse.json({ eliminados: pedidos.length })
  } catch (err) {
    console.error('[limpiar-comprobantes] POST error:', err)
    return NextResponse.json({ error: 'Error al limpiar' }, { status: 500 })
  }
}
