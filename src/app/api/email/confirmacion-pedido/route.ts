/**
 * POST /api/email/confirmacion-pedido
 * Envía un email de confirmación al cliente tras crear un pedido en la tienda online.
 * Se llama fire-and-forget desde carrito-cliente — nunca debe bloquear el flujo de compra.
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

interface ItemPedido {
  nombre:        string
  variante?:     string | null
  talla?:        string | null
  cantidad:      number
  precio:        number
  subtotal:      number
  tipo_producto: string
  cita?:         { fecha: string; hora_inicio: string } | null
  alquiler?:     { fecha_inicio: string; fecha_fin: string; dias: number } | null
}

export async function POST(req: Request) {
  try {
    const { pedidoId } = await req.json()
    if (!pedidoId) return NextResponse.json({ ok: false }, { status: 400 })

    const admin = crearAdmin()

    const [
      { data: pedido },
      { data: cfgEmail },
      { data: cfgTienda },
    ] = await Promise.all([
      admin.from('pedidos').select('numero_orden, nombres, email, tipo, provincia, ciudad, direccion, items, simbolo_moneda, subtotal, descuento_cupon, cupon_codigo, costo_envio, total').eq('id', pedidoId).single(),
      admin.from('configuracion_email').select('*').single(),
      admin.from('configuracion_tienda').select('nombre_tienda, whatsapp').single(),
    ])

    if (!cfgEmail?.activo || !pedido?.email) return NextResponse.json({ ok: false, skipped: true })

    const sim          = pedido.simbolo_moneda ?? '$'
    const nombreTienda = (cfgTienda as any)?.nombre_tienda ?? 'Nuestra tienda'
    const whatsapp     = (cfgTienda as any)?.whatsapp ?? ''
    const items        = (pedido.items ?? []) as ItemPedido[]

    const filasItems = items.map(i => {
      const detalle = [i.variante, i.talla].filter(Boolean).join(' · ')
      let extra = ''
      if (i.cita) {
        const fechaCita = new Date(i.cita.fecha + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })
        extra = `<br/><span style="color:#6b7280;font-size:11px">Cita: ${fechaCita} ${i.cita.hora_inicio.slice(0, 5)}</span>`
      }
      if (i.alquiler) {
        const fmtFecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
        extra = `<br/><span style="color:#6b7280;font-size:11px">Alquiler: ${fmtFecha(i.alquiler.fecha_inicio)} – ${fmtFecha(i.alquiler.fecha_fin)} (${i.alquiler.dias} días)</span>`
      }
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px">
            ${i.nombre}${detalle ? `<br/><span style="color:#6b7280;font-size:11px">${detalle}</span>` : ''}${extra}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;text-align:center">${i.cantidad}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;text-align:right;white-space:nowrap">${sim}${i.subtotal.toFixed(2)}</td>
        </tr>`
    }).join('')

    const filaDescuento = pedido.descuento_cupon > 0
      ? `<tr><td style="padding:4px 0;color:#6b7280">Descuento${pedido.cupon_codigo ? ` (${pedido.cupon_codigo})` : ''}</td><td style="padding:4px 0;color:#16a34a;font-weight:600;text-align:right">-${sim}${Number(pedido.descuento_cupon).toFixed(2)}</td></tr>`
      : ''
    const filaEnvio = pedido.costo_envio > 0
      ? `<tr><td style="padding:4px 0;color:#6b7280">Envío</td><td style="padding:4px 0;font-weight:600;text-align:right">${sim}${Number(pedido.costo_envio).toFixed(2)}</td></tr>`
      : ''
    const infoEntrega = pedido.tipo === 'delivery'
      ? `<p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6">
          <strong>Dirección de entrega:</strong><br/>
          ${[pedido.ciudad, pedido.provincia].filter(Boolean).join(', ')}${pedido.direccion ? `<br/>${pedido.direccion}` : ''}
        </p>`
      : `<p style="margin:0 0 20px;color:#374151;font-size:14px">📍 <strong>Retiro en tienda</strong></p>`

    const contactoWA = whatsapp
      ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0">
          ¿Tienes alguna pregunta? Escríbenos por
          <a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" style="color:#16a34a;text-decoration:none">WhatsApp</a>.
        </p>`
      : ''

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
        <h2 style="margin:0 0 4px;font-size:22px;color:#111827">¡Gracias por tu pedido!</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Hola ${pedido.nombres}, hemos recibido tu pedido correctamente.</p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:24px;display:inline-block;width:100%;box-sizing:border-box">
          <p style="margin:0;font-size:12px;color:#15803d;font-weight:600;text-transform:uppercase;letter-spacing:.5px">N° de pedido</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:1px">#${pedido.numero_orden}</p>
        </div>

        ${infoEntrega}

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
          <tr><td style="padding:4px 0;color:#6b7280">Subtotal</td><td style="padding:4px 0;text-align:right">${sim}${Number(pedido.subtotal).toFixed(2)}</td></tr>
          ${filaDescuento}
          ${filaEnvio}
          <tr>
            <td style="padding:10px 0 4px;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb">Total</td>
            <td style="padding:10px 0 4px;font-weight:700;font-size:16px;text-align:right;border-top:2px solid #e5e7eb">${sim}${Number(pedido.total).toFixed(2)}</td>
          </tr>
        </table>

        <p style="font-size:13px;color:#6b7280;margin:0">
          Nos pondremos en contacto contigo pronto para coordinar los detalles de tu pedido.
        </p>
        ${contactoWA}

        <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 16px"/>
        <p style="font-size:11px;color:#9ca3af;margin:0">${nombreTienda}</p>
      </div>
    `

    await enviarEmail({
      config: cfgEmail as ConfiguracionEmail,
      to:      pedido.email,
      subject: `Tu pedido #${pedido.numero_orden} fue recibido — ${nombreTienda}`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[confirmacion-pedido]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
