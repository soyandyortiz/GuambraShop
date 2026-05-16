/**
 * POST /api/proformas
 * Crea una proforma, genera el PDF y lo envía por email al cliente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { enviarEmail } from '@/lib/email/enviar'
import { verificarLimiteEmail } from '@/lib/email/verificar-limite'
import { generarProformaBuffer } from '@/lib/proforma-pdf'
import type { ItemProforma, Proforma } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await crearClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const {
      cliente_id,
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      items,
      subtotal,
      descuento_tipo,
      descuento_valor,
      descuento_monto,
      base_imponible,
      iva_porcentaje,
      iva_monto,
      total,
      vigencia_horas,
      nota,
    } = body as {
      cliente_id: string | null
      cliente_nombre: string
      cliente_email: string
      cliente_telefono: string | null
      items: ItemProforma[]
      subtotal: number
      descuento_tipo: 'porcentaje' | 'fijo' | null
      descuento_valor: number
      descuento_monto: number
      base_imponible: number
      iva_porcentaje: number
      iva_monto: number
      total: number
      vigencia_horas: number | null
      nota: string | null
    }

    if (!cliente_nombre || !cliente_email) {
      return NextResponse.json({ error: 'Nombre y email del cliente son requeridos' }, { status: 400 })
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Debe agregar al menos un producto' }, { status: 400 })
    }

    // Generar número correlativo
    const { data: numData, error: numErr } = await supabase
      .rpc('generar_numero_proforma')
    if (numErr) throw numErr

    // Calcular vence_en
    const ahora = new Date()
    const vence_en = vigencia_horas
      ? new Date(ahora.getTime() + vigencia_horas * 60 * 60 * 1000).toISOString()
      : null

    // Insertar en BD
    const { data: proformaData, error: insertErr } = await supabase
      .from('proformas')
      .insert({
        numero: numData as string,
        cliente_id:       cliente_id ?? null,
        cliente_nombre,
        cliente_email,
        cliente_telefono: cliente_telefono ?? null,
        items,
        subtotal,
        descuento_tipo:   descuento_tipo ?? null,
        descuento_valor:  descuento_valor ?? 0,
        descuento_monto:  descuento_monto ?? 0,
        base_imponible,
        iva_porcentaje,
        iva_monto,
        total,
        vigencia_horas:   vigencia_horas ?? null,
        vence_en,
        nota:             nota ?? null,
        creado_por:       user.id,
      })
      .select('*')
      .single()

    if (insertErr) throw insertErr
    const proforma = proformaData as Proforma

    // Configuración de tienda para PDF
    const [{ data: tienda }, { data: cfgEmail }] = await Promise.all([
      supabase.from('configuracion_tienda').select('nombre_tienda, simbolo_moneda, logo_url').single(),
      supabase.from('configuracion_email').select('*').maybeSingle(),
    ])

    // Generar PDF
    const pdfBuffer = await generarProformaBuffer(
      proforma,
      tienda?.nombre_tienda ?? 'Tienda',
      tienda?.simbolo_moneda ?? '$',
      tienda?.logo_url ?? null,
    )

    // Verificar límite de emails antes de enviar
    const limite = await verificarLimiteEmail()

    // Enviar email si hay configuración activa y no se alcanzó el límite
    if (cfgEmail?.activo && limite.permitido) {
      const htmlEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
          <h2 style="color: #16a34a;">Proforma ${proforma.numero}</h2>
          <p>Estimado/a <strong>${cliente_nombre}</strong>,</p>
          <p>Adjunto encontrará la proforma solicitada de <strong>${tienda?.nombre_tienda ?? 'nuestra tienda'}</strong>.</p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <tr style="background:#f0fdf4;">
              <td style="padding:8px; font-weight:bold;">Total</td>
              <td style="padding:8px; font-weight:bold; color:#16a34a;">${tienda?.simbolo_moneda ?? '$'} ${total.toFixed(2)}</td>
            </tr>
            ${vence_en ? `<tr><td style="padding:8px; color:#dc2626; font-weight:bold;">Válida hasta</td><td style="padding:8px; color:#dc2626;">${new Date(vence_en).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td></tr>` : ''}
          </table>
          <p style="font-size:13px; color:#6b7280;">Si tiene alguna pregunta o desea confirmar su pedido, no dude en contactarnos.</p>
          <p style="margin-top:24px;">Atentamente,<br/><strong>${tienda?.nombre_tienda ?? 'El equipo'}</strong></p>
        </div>
      `

      await enviarEmail({
        config: cfgEmail as Parameters<typeof enviarEmail>[0]['config'],
        to: cliente_email,
        subject: `Proforma ${proforma.numero} — ${tienda?.nombre_tienda ?? ''}`,
        html: htmlEmail,
        adjuntos: [{
          nombre: `Proforma-${proforma.numero}.pdf`,
          contenido: pdfBuffer,
          tipo: 'application/pdf',
        }],
      })

      // Marcar como enviado
      await supabase
        .from('proformas')
        .update({ email_enviado: true, email_enviado_en: new Date().toISOString() })
        .eq('id', proforma.id)
    }

    return NextResponse.json({ ok: true, proforma })
  } catch (err) {
    console.error('[proformas] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
