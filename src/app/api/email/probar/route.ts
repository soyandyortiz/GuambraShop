/**
 * POST /api/email/probar
 * Envía un email de prueba con las credenciales recibidas en el body.
 * Solo accesible para superadmin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { enviarEmail } from '@/lib/email/enviar'
import type { ProveedorEmail } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await crearClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (perfil?.rol !== 'superadmin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await req.json()

    await enviarEmail({
      config: {
        proveedor:      body.proveedor as ProveedorEmail,
        smtp_host:      body.smtp_host,
        smtp_port:      body.smtp_port ?? 587,
        smtp_usuario:   body.smtp_usuario,
        smtp_password:  body.smtp_password,
        resend_api_key: body.resend_api_key,
        from_email:     body.from_email,
        from_nombre:    body.from_nombre,
      },
      to:      body.from_email,
      subject: 'Prueba de email — GuambraShop',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#111827;margin-bottom:8px">✅ Configuración correcta</h2>
          <p style="color:#6b7280;font-size:14px">
            El envío de emails está funcionando correctamente en tu tienda.
            Los clientes recibirán sus facturas (RIDE) en este correo.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = (err as Error).message ?? 'Error desconocido'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
