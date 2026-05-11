/**
 * POST /api/pedidos/subir-comprobante
 *
 * Recibe multipart/form-data con:
 *   - numero_temporal : string
 *   - archivo         : File (JPG, PNG, WEBP o PDF)
 *
 * 1. Busca el pedido temporal
 * 2. Sube el archivo a Storage bucket 'comprobantes'
 * 3. Crea el pedido real con estado 'pendiente_validacion'
 * 4. Vincula citas/alquileres al pedido real
 * 5. Elimina el pedido temporal
 * 6. Incrementa uso del cupón
 * 7. Notifica por email y Telegram (fire-and-forget)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
    const form = await req.formData()
    const numeroTemporal = form.get('numero_temporal') as string | null
    const archivo = form.get('archivo') as File | null

    if (!numeroTemporal || !archivo) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!tiposPermitidos.includes(archivo.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG, WEBP o PDF.' }, { status: 400 })
    }

    const admin = crearAdmin()

    // 1. Buscar el pedido temporal
    const { data: temporal, error: errBuscar } = await admin
      .from('pedidos_temporales')
      .select('*')
      .eq('numero_temporal', numeroTemporal)
      .single()

    if (errBuscar || !temporal) {
      return NextResponse.json({ error: 'Pedido temporal no encontrado o expirado.' }, { status: 404 })
    }

    // Verificar que no haya expirado
    if (new Date(temporal.expira_en) < new Date()) {
      return NextResponse.json({ error: 'El tiempo límite expiró. Inicia el proceso nuevamente.' }, { status: 410 })
    }

    // 2. Subir archivo a Storage
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const timestamp = Date.now()
    const storagePath = `pedidos/${temporal.id}/${timestamp}.${extension}`

    const arrayBuffer = await archivo.arrayBuffer()
    const { error: errUpload } = await admin.storage
      .from('comprobantes')
      .upload(storagePath, arrayBuffer, {
        contentType: archivo.type,
        upsert: false,
      })

    if (errUpload) {
      console.error('[subir-comprobante] Storage error:', errUpload)
      return NextResponse.json({ error: 'Error al subir el comprobante. Intenta nuevamente.' }, { status: 500 })
    }

    // 3. Crear el pedido real con estado 'pendiente_validacion'
    const { data: pedido, error: errPedido } = await admin
      .from('pedidos')
      .insert({
        tipo:               temporal.tipo,
        nombres:            temporal.nombres,
        email:              temporal.email,
        whatsapp:           temporal.whatsapp,
        provincia:          temporal.provincia,
        ciudad:             temporal.ciudad,
        direccion:          temporal.direccion,
        detalles_direccion: temporal.detalles_direccion,
        items:              temporal.items,
        simbolo_moneda:     temporal.simbolo_moneda,
        subtotal:           temporal.subtotal,
        descuento_cupon:    temporal.descuento_cupon,
        cupon_codigo:       temporal.cupon_codigo,
        costo_envio:        temporal.costo_envio,
        total:              temporal.total,
        datos_facturacion:  temporal.datos_facturacion,
        estado:             'pendiente_validacion',
        comprobante_url:    storagePath,
      })
      .select('id, numero_orden')
      .single()

    if (errPedido || !pedido) {
      // Limpiar archivo subido si falla la creación del pedido
      await admin.storage.from('comprobantes').remove([storagePath])
      console.error('[subir-comprobante] Pedido error:', errPedido)
      return NextResponse.json({ error: 'Error al registrar el pedido.' }, { status: 500 })
    }

    // 4. Vincular citas y alquileres al pedido real
    const citasIds: string[]      = temporal.citas_ids ?? []
    const alquileresIds: string[] = temporal.alquileres_ids ?? []

    if (citasIds.length > 0) {
      await admin.from('citas').update({ pedido_id: pedido.id }).in('id', citasIds)
    }
    if (alquileresIds.length > 0) {
      await admin.from('alquileres').update({ pedido_id: pedido.id }).in('id', alquileresIds)
    }

    // 5. Eliminar el pedido temporal (ya no se necesita)
    await admin.from('pedidos_temporales').delete().eq('id', temporal.id)

    // 6. Incrementar uso del cupón (si aplica)
    if (temporal.cupon_codigo) {
      admin
        .from('cupones')
        .select('usos_actuales')
        .eq('codigo', temporal.cupon_codigo)
        .single()
        .then(({ data }) => {
          if (data) {
            admin.from('cupones')
              .update({ usos_actuales: data.usos_actuales + 1 })
              .eq('codigo', temporal.cupon_codigo)
              .then(() => {})
          }
        })
    }

    // 7a. Email al cliente (fire-and-forget)
    notificarEmailComprobante(admin, pedido.id, pedido.numero_orden, temporal).catch(() => {})

    // 7b. Telegram al admin (fire-and-forget)
    notificarTelegramComprobante(pedido.numero_orden, temporal).catch(() => {})

    return NextResponse.json({
      ok:          true,
      numero_orden: pedido.numero_orden,
      pedido_id:   pedido.id,
    })
  } catch (err) {
    console.error('[subir-comprobante]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── Email al cliente ────────────────────────────────────────────────────────

async function notificarEmailComprobante(
  admin: ReturnType<typeof createClient>,
  pedidoId: string,
  numeroOrden: string,
  temporal: any,
) {
  const [{ data: cfgEmail }, { data: cfgTienda }] = await Promise.all([
    admin.from('configuracion_email').select('*').single(),
    admin.from('configuracion_tienda').select('nombre_tienda, whatsapp').single(),
  ])

  if (!(cfgEmail as any)?.activo || !temporal.email) return

  const sim         = temporal.simbolo_moneda ?? '$'
  const nombreTienda = (cfgTienda as any)?.nombre_tienda ?? 'Nuestra tienda'
  const whatsapp     = (cfgTienda as any)?.whatsapp ?? ''
  const items        = (temporal.items ?? []) as any[]

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
    ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0">
        ¿Tienes alguna pregunta? Escríbenos por
        <a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" style="color:#16a34a;text-decoration:none">WhatsApp</a>.
       </p>`
    : ''

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
      <h2 style="margin:0 0 4px;font-size:22px;color:#111827">¡Comprobante recibido!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
        Hola ${temporal.nombres}, recibimos tu comprobante de pago correctamente.
        Un administrador lo revisará y confirmará tu pedido en breve.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:12px;color:#b45309;font-weight:600;text-transform:uppercase;letter-spacing:.5px">N° de pedido</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:1px">#${numeroOrden}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#92400e">Estado: Pendiente de validación</p>
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
        ${temporal.descuento_cupon > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Descuento</td><td style="padding:4px 0;color:#16a34a;text-align:right">-${sim}${Number(temporal.descuento_cupon).toFixed(2)}</td></tr>` : ''}
        ${temporal.costo_envio > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Envío</td><td style="padding:4px 0;text-align:right">${sim}${Number(temporal.costo_envio).toFixed(2)}</td></tr>` : ''}
        <tr>
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb">Total pagado</td>
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;text-align:right;border-top:2px solid #e5e7eb">${sim}${Number(temporal.total).toFixed(2)}</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#6b7280;margin:0">
        Te notificaremos por email cuando tu pedido sea confirmado.
      </p>
      ${contactoWA}

      <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 16px"/>
      <p style="font-size:11px;color:#9ca3af;margin:0">${nombreTienda}</p>
    </div>
  `

  await enviarEmail({
    config:  cfgEmail as ConfiguracionEmail,
    to:      temporal.email,
    subject: `Comprobante recibido — Pedido #${numeroOrden} · ${nombreTienda}`,
    html,
  })
}

// ─── Telegram al admin ───────────────────────────────────────────────────────

async function notificarTelegramComprobante(numeroOrden: string, temporal: any) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const sim   = temporal.simbolo_moneda ?? '$'
  const items = (temporal.items ?? []) as any[]

  const itemsLineas = items.map((i: any) =>
    `  • ${i.nombre}${i.variante ? ` (${i.variante})` : ''}${i.talla ? ` T:${i.talla}` : ''} x${i.cantidad} — ${sim}${Number(i.subtotal).toFixed(2)}`
  ).join('\n')

  const texto = [
    `🧾 <b>Comprobante recibido — #${numeroOrden}</b>`,
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
    ``,
    `⏳ <b>Pendiente de validación</b> — revisa el comprobante en el panel admin.`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML' }),
  })
}
