import { NextRequest, NextResponse } from 'next/server'

interface BodySolicitud {
  numero_solicitud: string
  producto_nombre: string
  nombre_cliente: string
  whatsapp: string
  email: string
  fecha_evento?: string | null
  hora_evento?: string | null
  ciudad?: string | null
  tipo_evento?: string | null
  presupuesto?: number | null
  notas?: string | null
  simbolo_moneda?: string
}

export async function POST(req: NextRequest) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  let body: BodySolicitud
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const sim = body.simbolo_moneda ?? '$'

  const lineasEvento = [
    body.tipo_evento   ? `  Tipo: <b>${body.tipo_evento}</b>`                              : null,
    body.fecha_evento  ? `  Fecha: <b>${new Date(body.fecha_evento + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}</b>` : null,
    body.hora_evento   ? `  Hora: ${body.hora_evento.slice(0, 5)}`                         : null,
    body.ciudad        ? `  Ciudad: ${body.ciudad}`                                        : null,
    body.presupuesto   ? `  Presupuesto aprox.: ${sim}${body.presupuesto.toFixed(2)}`      : null,
    body.notas         ? `  Notas: <i>${body.notas}</i>`                                   : null,
  ].filter(Boolean)

  const texto = [
    `🎉 <b>Nueva solicitud de evento — ${body.numero_solicitud}</b>`,
    '',
    `👤 <b>${body.nombre_cliente}</b>`,
    `📞 ${body.whatsapp}`,
    `📧 ${body.email}`,
    '',
    `🎯 Servicio: <b>${body.producto_nombre}</b>`,
    '',
    lineasEvento.length > 0 ? `<b>Detalles del evento:</b>` : null,
    ...lineasEvento,
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
      console.error('[Telegram] Error al notificar solicitud:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram] Excepción al notificar solicitud:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 })
  }
}
