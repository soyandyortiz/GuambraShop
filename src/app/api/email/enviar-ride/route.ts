/**
 * POST /api/email/enviar-ride
 * Body: { facturaId: string; emailDestino?: string }
 *
 * Genera el RIDE PDF y lo envía por email al cliente.
 * Si no se pasa emailDestino usa el email del comprador en la factura.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { generarRIDEBuffer } from '@/lib/sri/ride-pdf'
import { enviarEmail } from '@/lib/email/enviar'
import type { Factura, ConfiguracionFacturacion, ConfiguracionEmail } from '@/types'

function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const { facturaId, emailDestino } = await req.json() as { facturaId: string; emailDestino?: string }
    if (!facturaId) return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })

    const supabase = await crearClienteServidor()

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Cargar datos
    const admin = crearClienteAdmin()
    const [
      { data: facturaData },
      { data: configSRI },
      { data: configEmail },
    ] = await Promise.all([
      supabase.from('facturas').select('*').eq('id', facturaId).single(),
      supabase.from('configuracion_facturacion').select('*').single(),
      admin.from('configuracion_email').select('*').single(),
    ])

    if (!facturaData) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (!configSRI)   return NextResponse.json({ error: 'Configuración SRI no encontrada' }, { status: 422 })
    if (!configEmail?.activo) {
      return NextResponse.json({ error: 'El envío de emails no está activado. Configúralo en Config. Email.' }, { status: 422 })
    }

    const factura = facturaData as Factura
    const config  = configSRI as ConfiguracionFacturacion
    const cfgEmail = configEmail as ConfiguracionEmail

    // Destino: argumento > email del comprador > error
    const to = emailDestino?.trim() || factura.datos_comprador?.email || null
    if (!to) {
      return NextResponse.json({ error: 'No hay email del cliente en la factura. Ingresa uno manualmente.' }, { status: 422 })
    }

    // Generar PDF
    const pdfBuffer = await generarRIDEBuffer(factura, config)
    const numFac = factura.numero_factura
      ?? `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`

    const nombreEmisor = config.nombre_comercial || config.razon_social

    // Enviar
    await enviarEmail({
      config: cfgEmail,
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

    return NextResponse.json({ ok: true, enviado_a: to })
  } catch (err: unknown) {
    console.error('[email/enviar-ride]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error al enviar' }, { status: 500 })
  }
}
