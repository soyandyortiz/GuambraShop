import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'missing_service_key' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase.rpc('marcar_alquileres_vencidos')
  if (error) {
    console.error('[marcar-vencidos]', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const marcados = data as number ?? 0

  // Notificar por Telegram solo si hay alquileres vencidos
  if (marcados > 0) {
    const token  = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (token && chatId) {
      const msg = `⚠️ *Alquileres vencidos*\n${marcados} alquiler${marcados !== 1 ? 'es' : ''} no fue${marcados !== 1 ? 'ron' : ''} devuelto${marcados !== 1 ? 's' : ''} a tiempo.\nRevisa el panel → Alquileres`
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
      })
    }
  }

  return NextResponse.json({ ok: true, marcados })
}
