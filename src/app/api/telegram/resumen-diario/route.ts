import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  // Verificar CRON_SECRET si está configurado (Vercel lo inyecta automáticamente)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return NextResponse.json({ ok: true, skipped: true })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[Resumen diario] Falta SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ ok: false, error: 'missing_service_key' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Rango de hoy en UTC
  const ahora    = new Date()
  const inicioHoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()))
  const finHoy    = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 1))
  const fechaISO  = inicioHoy.toISOString().split('T')[0] // YYYY-MM-DD para columnas DATE

  const [
    { data: pedidosHoy },
    { count: pedidosPendientes },
    { data: citasHoy },
    { count: solicitudesNuevas },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('pedidos')
      .select('total, estado')
      .gte('creado_en', inicioHoy.toISOString())
      .lt('creado_en', finHoy.toISOString()),

    supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente'),

    supabase
      .from('citas')
      .select('hora_inicio, productos(nombre), empleados_cita(nombre_completo)')
      .eq('fecha', fechaISO)
      .in('estado', ['reservada', 'confirmada'])
      .order('hora_inicio'),

    supabase
      .from('solicitudes_evento')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'nueva'),

    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda, nombre_tienda')
      .single(),
  ])

  const sim     = config?.simbolo_moneda ?? '$'
  const pedidos = pedidosHoy ?? []
  const citas   = citasHoy ?? []

  // Ingresos del día (excluir cancelados)
  const ingresoHoy = pedidos
    .filter(p => p.estado !== 'cancelado')
    .reduce((s, p) => s + Number(p.total), 0)

  // Conteo por estado
  const porEstado: Record<string, number> = {}
  for (const p of pedidos) {
    porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1
  }

  const EMOJI_ESTADO: Record<string, string> = {
    pendiente:  '⏳',
    confirmado: '✅',
    en_proceso: '🔄',
    enviado:    '🚚',
    entregado:  '📦',
    cancelado:  '❌',
  }
  const LABEL_ESTADO: Record<string, string> = {
    pendiente:  'Pendiente',
    confirmado: 'Confirmado',
    en_proceso: 'En proceso',
    enviado:    'Enviado',
    entregado:  'Entregado',
    cancelado:  'Cancelado',
  }

  const estadoLineas = Object.entries(porEstado).map(([estado, n]) =>
    `  ${EMOJI_ESTADO[estado] ?? '•'} ${LABEL_ESTADO[estado] ?? estado}: <b>${n}</b>`
  )

  // Citas del día
  const citasLineas = citas.map(c => {
    const hora     = (c.hora_inicio as string).slice(0, 5)
    const servicio = (c.productos as unknown as { nombre: string } | null)?.nombre ?? 'Servicio'
    const empleado = (c.empleados_cita as unknown as { nombre_completo: string } | null)?.nombre_completo
    return empleado
      ? `  🕐 ${hora}  ${servicio} — ${empleado}`
      : `  🕐 ${hora}  ${servicio}`
  })

  const fechaDisplay = ahora.toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC',
  })

  const secciones: (string | null)[] = [
    `📊 <b>Resumen del día — ${fechaDisplay}</b>`,
    config?.nombre_tienda ? `<i>${config.nombre_tienda}</i>` : null,
    '',
    `🛒 <b>Pedidos hoy: ${pedidos.length}</b>`,
    ...(pedidos.length > 0
      ? [
          `💰 Ingresos (sin cancelados): <b>${sim}${ingresoHoy.toFixed(2)}</b>`,
          ...estadoLineas,
        ]
      : ['  Sin pedidos registrados hoy']),
    '',
    `⏳ Pedidos pendientes (total): <b>${pedidosPendientes ?? 0}</b>`,
    `🎉 Solicitudes de eventos nuevas: <b>${solicitudesNuevas ?? 0}</b>`,
    '',
    `📅 <b>Citas de hoy: ${citas.length}</b>`,
    ...(citasLineas.length > 0 ? citasLineas : ['  Sin citas programadas']),
  ]

  const texto = secciones.filter(s => s !== null).join('\n')

  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML' }),
      }
    )

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[Telegram] Error en resumen diario:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram] Excepción en resumen diario:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 })
  }
}
