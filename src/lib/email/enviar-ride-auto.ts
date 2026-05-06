/**
 * Envío automático del RIDE PDF cuando el SRI autoriza una factura.
 * Se llama internamente desde los routes de emisión — nunca lanza excepción.
 */

import { createClient } from '@supabase/supabase-js'
import { generarRIDEBuffer } from '@/lib/sri/ride-pdf'
import { enviarEmail } from '@/lib/email/enviar'
import { verificarLimiteEmail } from '@/lib/email/verificar-limite'
import type { Factura, ConfiguracionFacturacion, ConfiguracionEmail } from '@/types'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function enviarRideAuto(facturaId: string): Promise<void> {
  try {
    const admin = crearAdmin()

    const [
      { data: facturaData },
      { data: configSRI },
      { data: cfgEmail },
    ] = await Promise.all([
      admin.from('facturas').select('*').eq('id', facturaId).single(),
      admin.from('configuracion_facturacion').select('*').single(),
      admin.from('configuracion_email').select('*').single(),
    ])

    if (!cfgEmail?.activo || !cfgEmail?.envio_automatico) return
    if (!facturaData || !configSRI) return

    const { permitido } = await verificarLimiteEmail()
    if (!permitido) { console.warn('[enviarRideAuto] límite de envíos alcanzado — email omitido'); return }

    const factura = facturaData as Factura
    const config  = configSRI as ConfiguracionFacturacion

    const to = factura.datos_comprador?.email
    if (!to) return

    const pdfBuffer = await generarRIDEBuffer(factura, config)

    const numFac = factura.numero_factura
      ?? `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`

    const nombreEmisor = config.nombre_comercial || config.razon_social

    await enviarEmail({
      config: cfgEmail as ConfiguracionEmail,
      to,
      subject: `Tu factura electrónica ${numFac} — ${nombreEmisor}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111827">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Tu factura electrónica</h2>
          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Hola${factura.datos_comprador?.razon_social && factura.datos_comprador.razon_social !== 'CONSUMIDOR FINAL' ? ` ${factura.datos_comprador.razon_social}` : ''},<br/>
            adjunto encontrarás tu RIDE (Representación Impresa) de la factura electrónica
            <strong>${numFac}</strong> emitida por <strong>${nombreEmisor}</strong>.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px">
            <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#6b7280">N° Factura</td><td style="padding:4px 0;font-weight:600;text-align:right">${numFac}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Fecha</td><td style="padding:4px 0;font-weight:600;text-align:right">${factura.fecha_emision}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Total</td><td style="padding:4px 0;font-weight:700;font-size:15px;text-align:right;color:#111827">$${factura.totales?.total?.toFixed(2) ?? '0.00'}</td></tr>
              ${factura.numero_autorizacion ? `<tr><td style="padding:4px 0;color:#6b7280">N° Autorización</td><td style="padding:4px 0;font-family:monospace;font-size:11px;text-align:right;word-break:break-all">${factura.numero_autorizacion}</td></tr>` : ''}
            </table>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin:0">
            Este documento es válido como factura electrónica autorizada por el SRI Ecuador.
            Consérvalo para tus registros.
          </p>
        </div>
      `,
      adjuntos: [{
        nombre:    `RIDE-${numFac}.pdf`,
        contenido: Buffer.from(pdfBuffer),
        tipo:      'application/pdf',
      }],
    })

    // Registrar envío para historial (Fase 4)
    await admin.from('facturas').update({
      email_enviado_en: new Date().toISOString(),
      email_enviado_a:  to,
    }).eq('id', facturaId)

  } catch (err) {
    console.error('[enviarRideAuto]', err)
  }
}
