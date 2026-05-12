/**
 * POST /api/pedidos/paypal/capturar
 *
 * Recibe { paypal_order_id, pedido: { ...datos completos del pedido } }.
 * 1. Captura el pago en PayPal
 * 2. Crea el pedido real con forma_pago='paypal' y estado='procesando'
 * 3. Llama a confirmar_pedido() → descuenta stock + confirma citas
 * 4. Notifica por email y Telegram (fire-and-forget)
 * Devuelve { ok, numero_orden }.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obtenerToken, capturarOrdenPayPal } from '@/lib/paypal'
import { enviarEmail } from '@/lib/email/enviar'
import type { ConfiguracionEmail } from '@/types'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  try {
    const { paypal_order_id, pedido: pedidoData } = await req.json()

    if (!paypal_order_id || !pedidoData) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const admin = crearAdmin()

    const { data: cfg } = await admin
      .from('configuracion_tienda')
      .select('paypal_activo, paypal_client_id, paypal_secret, paypal_modo, nombre_tienda, whatsapp')
      .single()

    if (!cfg?.paypal_activo || !cfg.paypal_client_id || !cfg.paypal_secret) {
      return NextResponse.json({ error: 'PayPal no está configurado.' }, { status: 422 })
    }

    // 1. Capturar el pago en PayPal
    const token   = await obtenerToken(cfg.paypal_client_id, cfg.paypal_secret, cfg.paypal_modo)
    const captura = await capturarOrdenPayPal({ token, modo: cfg.paypal_modo, paypalOrderId: paypal_order_id })

    if (captura.status !== 'COMPLETED') {
      return NextResponse.json({ error: `PayPal devolvió estado inesperado: ${captura.status}` }, { status: 422 })
    }

    // 2. Crear el pedido real
    const { data: pedido, error: errPedido } = await admin
      .from('pedidos')
      .insert({
        tipo:               pedidoData.tipo,
        nombres:            pedidoData.nombres,
        email:              pedidoData.email,
        whatsapp:           pedidoData.whatsapp,
        provincia:          pedidoData.provincia,
        ciudad:             pedidoData.ciudad,
        direccion:          pedidoData.direccion,
        detalles_direccion: pedidoData.detalles_direccion,
        items:              pedidoData.items,
        simbolo_moneda:     pedidoData.simbolo_moneda,
        subtotal:           pedidoData.subtotal,
        descuento_cupon:    pedidoData.descuento_cupon,
        cupon_codigo:       pedidoData.cupon_codigo,
        costo_envio:        pedidoData.costo_envio,
        total:              pedidoData.total,
        datos_facturacion:  pedidoData.datos_facturacion ?? null,
        estado:             'pendiente_pago',
        forma_pago:         'paypal',
        paypal_order_id:    paypal_order_id,
      })
      .select('id, numero_orden')
      .single()

    if (errPedido || !pedido) {
      console.error('[paypal/capturar] Pedido error:', errPedido)
      return NextResponse.json({ error: 'Error al registrar el pedido.' }, { status: 500 })
    }

    // 3. Confirmar pedido → descuenta stock + confirma citas + estado='procesando'
    await admin.rpc('confirmar_pedido', { p_pedido_id: pedido.id })

    // 4. Incrementar uso del cupón (fire-and-forget)
    if (pedidoData.cupon_codigo) {
      admin.from('cupones')
        .select('usos_actuales')
        .eq('codigo', pedidoData.cupon_codigo)
        .single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }: { data: any }) => {
          if (data) {
            admin.from('cupones')
              .update({ usos_actuales: data.usos_actuales + 1 })
              .eq('codigo', pedidoData.cupon_codigo)
              .then(() => {})
          }
        })
    }

    // 5. Notificaciones (fire-and-forget)
    notificarEmailPayPal(admin, pedido.id, pedido.numero_orden, pedidoData, cfg).catch(() => {})
    notificarTelegramPayPal(pedido.numero_orden, pedidoData, captura.captureId).catch(() => {})

    return NextResponse.json({ ok: true, numero_orden: pedido.numero_orden })
  } catch (err) {
    console.error('[paypal/capturar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── Email al cliente ─────────────────────────────────────────────────────────

async function notificarEmailPayPal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  pedidoId: string,
  numeroOrden: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedidoData: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cfgTienda: any,
) {
  void pedidoId
  const { data: cfgEmail } = await admin.from('configuracion_email').select('*').single()
  if (!(cfgEmail as ConfiguracionEmail)?.activo || !pedidoData.email) return

  const sim          = pedidoData.simbolo_moneda ?? '$'
  const nombreTienda = cfgTienda.nombre_tienda ?? 'Nuestra tienda'
  const whatsapp     = cfgTienda.whatsapp ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items        = (pedidoData.items ?? []) as any[]

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
    ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0">¿Tienes alguna pregunta? <a href="https://wa.me/${whatsapp.replace(/\D/g,'')}" style="color:#16a34a;text-decoration:none">Escríbenos por WhatsApp</a>.</p>`
    : ''

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
      <h2 style="margin:0 0 4px;font-size:22px">¡Pago confirmado!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
        Hola ${pedidoData.nombres}, tu pago con PayPal fue procesado exitosamente.
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
        <tr><td style="padding:4px 0;color:#6b7280">Subtotal</td><td style="padding:4px 0;text-align:right">${sim}${Number(pedidoData.subtotal).toFixed(2)}</td></tr>
        ${pedidoData.descuento_cupon > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Descuento</td><td style="padding:4px 0;color:#16a34a;text-align:right">-${sim}${Number(pedidoData.descuento_cupon).toFixed(2)}</td></tr>` : ''}
        ${pedidoData.costo_envio > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Envío</td><td style="padding:4px 0;text-align:right">${sim}${Number(pedidoData.costo_envio).toFixed(2)}</td></tr>` : ''}
        <tr>
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb">Total pagado</td>
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;text-align:right;border-top:2px solid #e5e7eb">${sim}${Number(pedidoData.total).toFixed(2)}</td>
        </tr>
      </table>
      ${contactoWA}
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 16px"/>
      <p style="font-size:11px;color:#9ca3af;margin:0">${nombreTienda}</p>
    </div>
  `

  await enviarEmail({
    config:  cfgEmail as ConfiguracionEmail,
    to:      pedidoData.email,
    subject: `Pago confirmado — Pedido #${numeroOrden} · ${nombreTienda}`,
    html,
  })
}

// ─── Telegram al admin ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notificarTelegramPayPal(numeroOrden: string, pedidoData: any, captureId: string) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const sim   = pedidoData.simbolo_moneda ?? '$'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (pedidoData.items ?? []) as any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsLineas = items.map((i: any) =>
    `  • ${i.nombre}${i.variante ? ` (${i.variante})` : ''}${i.talla ? ` T:${i.talla}` : ''} x${i.cantidad} — ${sim}${Number(i.subtotal).toFixed(2)}`
  ).join('\n')

  const texto = [
    `💳 <b>Pago PayPal confirmado — #${numeroOrden}</b>`,
    ``,
    `👤 <b>${pedidoData.nombres}</b>`,
    `📞 ${pedidoData.whatsapp}`,
    pedidoData.tipo === 'delivery'
      ? `🚚 Delivery → ${[pedidoData.ciudad, pedidoData.provincia].filter(Boolean).join(', ') || '—'}`
      : `🏪 Retiro en tienda`,
    ``,
    `<b>Productos:</b>`,
    itemsLineas,
    ``,
    `💰 <b>Total: ${sim}${Number(pedidoData.total).toFixed(2)}</b>`,
    `🔖 Capture ID: <code>${captureId}</code>`,
    ``,
    `✅ <b>Pedido en procesamiento automático.</b>`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML' }),
  })
}
