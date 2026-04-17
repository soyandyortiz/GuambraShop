import { NextRequest, NextResponse } from 'next/server'

interface ItemStockBajo {
  nombre: string
  stock: number
}

interface BodyNotif {
  items: ItemStockBajo[]
}

export async function POST(req: NextRequest) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  let body: BodyNotif
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  if (!body.items?.length) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const lineas = body.items
    .map(i => `  ⚠️ <b>${i.nombre}</b> — quedan <b>${i.stock}</b> unidades`)
    .join('\n')

  const texto = [
    `📦 <b>Stock bajo — se requiere reposición</b>`,
    '',
    lineas,
  ].join('\n')

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
      console.error('[Telegram] Error stock bajo:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram] Excepción stock bajo:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 })
  }
}
