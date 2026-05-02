import { NextRequest, NextResponse } from 'next/server'

interface ItemNotif {
  nombre: string
  cantidad: number
  subtotal: number
  variante?: string | null
  talla?: string | null
  tipo_producto?: string
  cita?: { fecha: string; hora_inicio: string; empleado_nombre?: string } | null
  alquiler?: { fecha_inicio: string; fecha_fin: string; dias: number; hora_recogida?: string | null } | null
}

interface BodyNotif {
  numero_orden: string
  nombres: string
  whatsapp: string
  tipo: 'local' | 'delivery'
  ciudad?: string | null
  provincia?: string | null
  items: ItemNotif[]
  subtotal: number
  descuento_cupon: number
  cupon_codigo?: string | null
  costo_envio: number
  total: number
  simbolo_moneda: string
}

export async function POST(req: NextRequest) {
  const token   = process.env.TELEGRAM_BOT_TOKEN
  const chatId  = process.env.TELEGRAM_CHAT_ID

  // Si no están configurados, responder OK silenciosamente (no interrumpir el flujo)
  if (!token || !chatId) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  let body: BodyNotif
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const soloServicios  = body.items.length > 0 && body.items.every(i => i.tipo_producto === 'servicio')
  const soloAlquileres = body.items.length > 0 && body.items.every(i => i.tipo_producto === 'alquiler')

  // Encabezado y atención diferenciados por tipo
  const encabezado = soloServicios
    ? `📅 <b>Cita agendada — ${body.numero_orden}</b>`
    : soloAlquileres
      ? `👔 <b>Solicitud de alquiler — ${body.numero_orden}</b>`
      : `🛒 <b>Nuevo pedido — ${body.numero_orden}</b>`

  let atencionLinea: string
  if (soloServicios) {
    atencionLinea = `📍 Atención en local físico`
  } else if (soloAlquileres) {
    atencionLinea = body.tipo === 'delivery'
      ? `🚚 Entrega a domicilio${[body.ciudad, body.provincia].filter(Boolean).length ? ` → ${[body.ciudad, body.provincia].filter(Boolean).join(', ')}` : ''}`
      : `🏪 Retiro en local`
  } else if (body.tipo === 'delivery') {
    const destino = [body.ciudad, body.provincia].filter(Boolean).join(', ') || '—'
    atencionLinea = `🚚 Delivery → ${destino}`
  } else {
    atencionLinea = `🏪 Retiro en tienda`
  }

  const fmtFecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  const itemsLineas = body.items.map(i => {
    const extras = [i.variante, i.talla ? `T:${i.talla}` : null].filter(Boolean).join(' ')
    let linea = `  • ${i.nombre}${extras ? ` (${extras})` : ''}`
    if (i.tipo_producto === 'servicio' && i.cita) {
      const fecha = fmtFecha(i.cita.fecha)
      const hora = i.cita.hora_inicio.slice(0, 5)
      linea += `\n    Fecha: ${fecha}  Hora: ${hora}`
      if (i.cita.empleado_nombre) linea += `\n    Atencion: ${i.cita.empleado_nombre}`
    } else if (i.tipo_producto === 'alquiler' && i.alquiler) {
      const al = i.alquiler
      linea += ` <i>(alquiler)</i>`
      linea += `\n    Retiro:     ${fmtFecha(al.fecha_inicio)}`
      linea += `\n    Devolución: ${fmtFecha(al.fecha_fin)}`
      linea += `\n    Días: ${al.dias} día${al.dias !== 1 ? 's' : ''}`
      if (al.hora_recogida) linea += `  |  Hora retiro: ${al.hora_recogida.slice(0, 5)}`
      linea += `\n    Cant: ${i.cantidad}  —  ${body.simbolo_moneda}${i.subtotal.toFixed(2)}`
    } else {
      linea += ` x${i.cantidad} — ${body.simbolo_moneda}${i.subtotal.toFixed(2)}`
    }
    return linea
  }).join('\n')

  const labelItems = soloServicios
    ? `<b>Servicio(s):</b>`
    : soloAlquileres
      ? `<b>Artículo(s) en alquiler:</b>`
      : `<b>Productos:</b>`

  const resumen = [
    body.descuento_cupon > 0
      ? `  Cupón <code>${body.cupon_codigo}</code>: -${body.simbolo_moneda}${body.descuento_cupon.toFixed(2)}`
      : null,
    body.costo_envio > 0
      ? `  Envío: +${body.simbolo_moneda}${body.costo_envio.toFixed(2)}`
      : null,
  ].filter(Boolean).join('\n')

  const texto = [
    encabezado,
    '',
    `👤 <b>${body.nombres}</b>`,
    `📞 ${body.whatsapp}`,
    atencionLinea,
    '',
    labelItems,
    itemsLineas,
    resumen ? resumen : null,
    '',
    `💰 <b>Total: ${body.simbolo_moneda}${body.total.toFixed(2)}</b>`,
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
      console.error('[Telegram] Error al enviar notificación:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram] Excepción al enviar notificación:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 })
  }
}
