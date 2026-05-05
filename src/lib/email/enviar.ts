/**
 * Librería de envío de emails — soporta Gmail SMTP, SMTP propio y Resend.
 * Se usa en todas las rutas de API que necesiten enviar emails.
 */

import type { ProveedorEmail } from '@/types'

interface ConfigEmail {
  proveedor:      ProveedorEmail
  smtp_host:      string | null
  smtp_port:      number
  smtp_usuario:   string | null
  smtp_password:  string | null
  resend_api_key: string | null
  from_email:     string
  from_nombre:    string
}

interface OpcionesEmail {
  config:  ConfigEmail
  to:      string
  subject: string
  html:    string
  adjuntos?: { nombre: string; contenido: Buffer; tipo: string }[]
}

export async function enviarEmail(opts: OpcionesEmail): Promise<void> {
  const { config, to, subject, html, adjuntos } = opts

  if (config.proveedor === 'resend') {
    await enviarResend(config, to, subject, html, adjuntos)
  } else {
    await enviarSMTP(config, to, subject, html, adjuntos)
  }
}

// ─── Resend ──────────────────────────────────────────────────────────────────
async function enviarResend(
  config: ConfigEmail,
  to: string,
  subject: string,
  html: string,
  adjuntos?: OpcionesEmail['adjuntos'],
) {
  if (!config.resend_api_key) throw new Error('API Key de Resend no configurada')

  const body: Record<string, unknown> = {
    from:    `${config.from_nombre} <${config.from_email}>`,
    to:      [to],
    subject,
    html,
  }

  if (adjuntos?.length) {
    body.attachments = adjuntos.map(a => ({
      filename: a.nombre,
      content:  a.contenido.toString('base64'),
    }))
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.resend_api_key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).message ?? `Resend error ${res.status}`)
  }
}

// ─── SMTP (Gmail y SMTP propio) ───────────────────────────────────────────────
async function enviarSMTP(
  config: ConfigEmail,
  to: string,
  subject: string,
  html: string,
  adjuntos?: OpcionesEmail['adjuntos'],
) {
  const nodemailer = await import('nodemailer')

  const host = config.proveedor === 'gmail' ? 'smtp.gmail.com' : (config.smtp_host ?? '')
  const port = config.proveedor === 'gmail' ? 587 : config.smtp_port

  if (!host)                throw new Error('Servidor SMTP no configurado')
  if (!config.smtp_usuario) throw new Error('Usuario SMTP no configurado')
  if (!config.smtp_password) throw new Error('Contraseña SMTP no configurada')

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: config.smtp_usuario,
      pass: config.smtp_password,
    },
  })

  const mailOptions: Record<string, unknown> = {
    from:    `"${config.from_nombre}" <${config.from_email}>`,
    to,
    subject,
    html,
  }

  if (adjuntos?.length) {
    mailOptions.attachments = adjuntos.map(a => ({
      filename:    a.nombre,
      content:     a.contenido,
      contentType: a.tipo,
    }))
  }

  await transporter.sendMail(mailOptions)
}
