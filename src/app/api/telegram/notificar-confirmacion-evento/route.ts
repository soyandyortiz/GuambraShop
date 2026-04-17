import { NextRequest, NextResponse } from 'next/server'

interface BodyConfirmacion {
  numeroSolicitud: string
  nombreCliente: string
  productoNombre: string
  fechaEvento?: string | null
  ciudad?: string | null
  presupuesto?: number | null
  simboloMoneda?: string
}

export async function POST(req: NextRequest) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  let body: BodyConfirmacion
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const sim = body.simboloMoneda ?? '$'

  const lineas = [
    body.fechaEvento
      ? `  Fecha: <b>${new Date(body.fechaEvento + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</b>`
      : null,
    body.ciudad
      ? `  Ciudad: ${body.ciudad}`
      : null,
    body.presupuesto
      ? `  Presupuesto: <b>${sim}${body.presupuesto.toFixed(2)}</b>`
      : null,
  ].filter(Boolean)

  const texto = [
    `✅ <b>Evento CONFIRMADO — ${body.numeroSolicitud}</b>`,
    '',
    `👤 <b>${body.nombreCliente}</b>`,
    `🎯 Servicio: <b>${body.productoNombre}</b>`,
    '',
    ...lineas,
    '',
    `Se ha generado un pedido vinculado a esta solicitud.`,
  ].filter(s => s !== null).join('\n')

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
      console.error('[Telegram] Error al notificar confirmación:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram] Excepción al notificar confirmación:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 })
  }
}
