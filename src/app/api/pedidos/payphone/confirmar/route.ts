/**
 * GET /api/pedidos/payphone/confirmar
 *
 * Payphone redirige al usuario de vuelta aquí con query params:
 *   ?clientTransactionId=GS-2026-xxx&id=12345&transactionStatus=Approved
 *
 * Este handler:
 * 1. Verifica el pago con la API de Payphone
 * 2. Crea el pedido real
 * 3. Llama a confirmar_pedido() → descuenta stock + confirma citas
 * 4. Notifica por email y Telegram (fire-and-forget)
 * 5. Redirige al cliente a /pedido/{numero_orden}?pago=payphone
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarPagoPayphone } from '@/lib/payphone'
import { enviarEmail } from '@/lib/email/enviar'
import type { ConfiguracionEmail } from '@/types'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin

  const clientTransactionId = url.searchParams.get('clientTransactionId')
  const id                  = url.searchParams.get('id')
  const transactionStatus   = url.searchParams.get('transactionStatus')

  if (!clientTransactionId || !id) {
    return NextResponse.redirect(`${siteUrl}/carrito?error=pago_incompleto`)
  }

  if (transactionStatus !== 'Approved') {
    return NextResponse.redirect(`${siteUrl}/carrito?error=pago_rechazado`)
  }

  try {
    const admin = crearAdmin()

    const { data: cfg } = await admin
      .from('configuracion_tienda')
      .select('payphone_token, nombre_tienda, whatsapp, simbolo_moneda')
      .single()

    if (!cfg?.payphone_token) {
      return NextResponse.redirect(`${siteUrl}/carrito?error=config`)
    }

    // Verificar el pago con Payphone
    const verificacion = await verificarPagoPayphone({
      token: cfg.payphone_token,
      id,
      clientTransactionId,
    })

    if (verificacion.transactionStatus !== 'Approved') {
      return NextResponse.redirect(`${siteUrl}/carrito?error=pago_rechazado`)
    }

    // Buscar el pedido temporal
    const { data: temporal } = await admin
      .from('pedidos_temporales')
      .select('*')
      .eq('numero_temporal', clientTransactionId)
      .maybeSingle()

    if (!temporal) {
      // Ya procesado (doble redirect de Payphone)
      return NextResponse.redirect(`${siteUrl}/?pago=payphone`)
    }

    // Crear el pedido real
    const { data: pedido, error: errPedido } = await admin
      .from('pedidos')
      .insert({
        tipo:                temporal.tipo,
        nombres:             temporal.nombres,
        email:               temporal.email,
        whatsapp:            temporal.whatsapp,
        provincia:           temporal.provincia,
        ciudad:              temporal.ciudad,
        direccion:           temporal.direccion,
        detalles_direccion:  temporal.detalles_direccion,
        items:               temporal.items,
        simbolo_moneda:      temporal.simbolo_moneda,
        subtotal:            temporal.subtotal,
        descuento_cupon:     temporal.descuento_cupon,
        cupon_codigo:        temporal.cupon_codigo,
        costo_envio:         temporal.costo_envio,
        total:               temporal.total,
        datos_facturacion:   temporal.datos_facturacion ?? null,
        estado:              'pendiente_pago',
        forma_pago:          'payphone',
        payphone_payment_id: String(id),
      })
      .select('id, numero_orden')
      .single()

    if (errPedido || !pedido) {
      console.error('[payphone/confirmar] Pedido error:', errPedido)
      return NextResponse.redirect(`${siteUrl}/carrito?error=pedido`)
    }

    // Confirmar → descuenta stock + confirma citas/alquileres
    await admin.rpc('confirmar_pedido', { p_pedido_id: pedido.id })

    // Incrementar uso de cupón (fire-and-forget)
    if (temporal.cupon_codigo) {
      admin.rpc('incrementar_uso_cupon', { p_codigo: temporal.cupon_codigo }).then(() => {})
    }

    // Limpiar temporal
    await admin.from('pedidos_temporales').delete().eq('numero_temporal', clientTransactionId)

    // Notificaciones (fire-and-forget)
    notificarEmail(admin, pedido.numero_orden, temporal, cfg).catch(() => {})
    notificarTelegram(pedido.numero_orden, temporal, String(id)).catch(() => {})

    return NextResponse.redirect(`${siteUrl}/pedido/${pedido.numero_orden}?pago=payphone`)
  } catch (err) {
    console.error('[payphone/confirmar]', err)
    return NextResponse.redirect(`${siteUrl}/carrito?error=interno`)
  }
}

// ─── Email al cliente ─────────────────────────────────────────────────────────

async function notificarEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  numeroOrden: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  temporal: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cfgTienda: any,
) {
  const { data: cfgEmail } = await admin.from('configuracion_email').select('*').single()
  if (!(cfgEmail as ConfiguracionEmail)?.activo || !temporal.email) return

  const sim          = temporal.simbolo_moneda ?? '$'
  const nombreTienda = cfgTienda.nombre_tienda ?? 'Nuestra tienda'
  const whatsapp     = cfgTienda.whatsapp ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items        = (temporal.items ?? []) as any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filasItems = items.map((i: any) => {
    const detalle = [i.variante, i.talla].filter(Boolean).join(' · ')
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px">
          ${i.nombre}${detalle ? `<br/><span style="color:#6b7280;font-size:11px">${detalle}</span>` : ''}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;text-align:center">${i.cantidad}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;text-align:right">${sim}${Number(i.subtotal).toFixed(2)}</td>
      </tr>`
  }).join('')

  const contactoWA = whatsapp
    ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0">¿Tienes alguna pregunta? <a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" style="color:#16a34a;text-decoration:none">Escríbenos por WhatsApp</a>.</p>`
    : ''

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
      <h2 style="margin:0 0 4px;font-size:22px">¡Pago confirmado!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
        Hola ${temporal.nombres}, tu pago con Payphone fue procesado exitosamente.
      </p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:12px;color:#15803d;font-weight:600;text-transform:uppercase;letter-spacing:.5px">N° de pedido</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:1px">#${numeroOrden}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#166534">Estado: En procesamiento</p>
      </div>
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Resumen</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr>
            <th style="padding:6px 0;font-size:11px;color:#9ca3af;font-weight:600;text-align:left;border-bottom:2px solid #e5e7eb;text-transform:uppercase">Producto</th>
            <th style="padding:6px 0;font-size:11px;color:#9ca3af;font-weight:600;text-align:center;border-bottom:2px solid #e5e7eb;text-transform:uppercase">Cant.</th>
            <th style="padding:6px 0;font-size:11px;color:#9ca3af;font-weight:600;text-align:right;border-bottom:2px solid #e5e7eb;text-transform:uppercase">Total</th>
          </tr>
        </thead>
        <tbody>${filasItems}</tbody>
      </table>
      <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:4px 0;color:#6b7280">Subtotal</td><td style="padding:4px 0;text-align:right">${sim}${Number(temporal.subtotal).toFixed(2)}</td></tr>
        ${Number(temporal.descuento_cupon) > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Descuento</td><td style="padding:4px 0;color:#16a34a;text-align:right">-${sim}${Number(temporal.descuento_cupon).toFixed(2)}</td></tr>` : ''}
        ${Number(temporal.costo_envio) > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Envío</td><td style="padding:4px 0;text-align:right">${sim}${Number(temporal.costo_envio).toFixed(2)}</td></tr>` : ''}
        <tr>
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb">Total pagado</td>
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;text-align:right;border-top:2px solid #e5e7eb">${sim}${Number(temporal.total).toFixed(2)}</td>
        </tr>
      </table>
      ${contactoWA}
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 16px"/>
      <p style="font-size:11px;color:#9ca3af;margin:0">${nombreTienda}</p>
    </div>
  `

  await enviarEmail({
    config:  cfgEmail as ConfiguracionEmail,
    to:      temporal.email,
    subject: `Pago confirmado — Pedido #${numeroOrden} · ${nombreTienda}`,
    html,
  })
}

// ─── Telegram al admin ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notificarTelegram(numeroOrden: string, temporal: any, payphoneId: string) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const sim   = temporal.simbolo_moneda ?? '$'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (temporal.items ?? []) as any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsLineas = items.map((i: any) =>
    `  • ${i.nombre}${i.variante ? ` (${i.variante})` : ''}${i.talla ? ` T:${i.talla}` : ''} x${i.cantidad} — ${sim}${Number(i.subtotal).toFixed(2)}`
  ).join('\n')

  const texto = [
    `💳 <b>Pago Payphone confirmado — #${numeroOrden}</b>`,
    ``,
    `👤 <b>${temporal.nombres}</b>`,
    `📞 ${temporal.whatsapp}`,
    temporal.tipo === 'delivery'
      ? `🚚 Delivery → ${[temporal.ciudad, temporal.provincia].filter(Boolean).join(', ') || '—'}`
      : `🏪 Retiro en tienda`,
    ``,
    `<b>Productos:</b>`,
    itemsLineas,
    ``,
    `💰 <b>Total: ${sim}${Number(temporal.total).toFixed(2)}</b>`,
    `🔖 Payphone ID: <code>${payphoneId}</code>`,
    ``,
    `✅ <b>Pedido en procesamiento automático.</b>`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML' }),
  })
}
