'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { Save, Eye, EyeOff, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConfiguracionEmail, ProveedorEmail } from '@/types'

interface Props {
  config: ConfiguracionEmail | null
}

const PROVEEDORES: { val: ProveedorEmail; label: string; desc: string }[] = [
  { val: 'gmail', label: 'Gmail',       desc: 'Cuenta Gmail con contraseña de aplicación — gratis, sin dominio propio' },
  { val: 'smtp',  label: 'SMTP propio', desc: 'Hosting con email (cPanel, Hostinger…) — gratis si ya tienes hosting' },
  { val: 'resend', label: 'Resend',     desc: '3,000 emails/mes gratis — requiere dominio propio verificado' },
]

export function FormularioConfigEmail({ config }: Props) {
  const router = useRouter()
  const supabase = crearClienteSupabase()
  const [guardando, setGuardando]       = useState(false)
  const [probando, setProbando]         = useState(false)
  const [mostrarPass, setMostrarPass]   = useState(false)
  const [mostrarKey, setMostrarKey]     = useState(false)
  const [resultadoPrueba, setResultadoPrueba] = useState<{ ok: boolean; msg: string } | null>(null)

  const [form, setForm] = useState({
    proveedor:        (config?.proveedor ?? 'gmail') as ProveedorEmail,
    smtp_host:        config?.smtp_host ?? '',
    smtp_port:        config?.smtp_port ?? 587,
    smtp_usuario:     config?.smtp_usuario ?? '',
    smtp_password:    config?.smtp_password ?? '',
    resend_api_key:   config?.resend_api_key ?? '',
    from_email:       config?.from_email ?? '',
    from_nombre:      config?.from_nombre ?? 'Facturación',
    envio_automatico: config?.envio_automatico ?? false,
    activo:           config?.activo ?? false,
  })

  function set(campo: string, valor: string | boolean | number) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setResultadoPrueba(null)
  }

  function payload() {
    const base = {
      proveedor:        form.proveedor,
      from_email:       form.from_email.trim(),
      from_nombre:      form.from_nombre.trim(),
      envio_automatico: form.envio_automatico,
      activo:           form.activo,
      smtp_host:        null as string | null,
      smtp_port:        587,
      smtp_usuario:     null as string | null,
      smtp_password:    null as string | null,
      resend_api_key:   null as string | null,
    }
    if (form.proveedor === 'gmail') {
      base.smtp_host     = 'smtp.gmail.com'
      base.smtp_port     = 587
      base.smtp_usuario  = form.smtp_usuario.trim()
      base.smtp_password = form.smtp_password.trim()
    } else if (form.proveedor === 'smtp') {
      base.smtp_host     = form.smtp_host.trim()
      base.smtp_port     = Number(form.smtp_port)
      base.smtp_usuario  = form.smtp_usuario.trim()
      base.smtp_password = form.smtp_password.trim()
    } else if (form.proveedor === 'resend') {
      base.resend_api_key = form.resend_api_key.trim()
    }
    return base
  }

  async function probar() {
    if (!form.from_email) { toast.error('Ingresa el email remitente'); return }
    setProbando(true)
    setResultadoPrueba(null)
    try {
      const res = await fetch('/api/email/probar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      })
      const data = await res.json()
      setResultadoPrueba({ ok: data.ok, msg: data.ok ? 'Email de prueba enviado correctamente' : (data.error ?? 'Error desconocido') })
    } catch {
      setResultadoPrueba({ ok: false, msg: 'Error de conexión' })
    } finally {
      setProbando(false)
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.from_email.trim()) { toast.error('El email remitente es obligatorio'); return }
    setGuardando(true)
    try {
      const data = payload()
      let error
      if (config) {
        ;({ error } = await supabase.from('configuracion_email').update(data).eq('id', config.id))
      } else {
        ;({ error } = await supabase.from('configuracion_email').insert(data))
      }
      if (error) throw error
      toast.success('Configuración de email guardada')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6 max-w-2xl">

      {/* Proveedor */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Proveedor de email</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PROVEEDORES.map(p => (
            <button key={p.val} type="button" onClick={() => set('proveedor', p.val)}
              className={cn('text-left px-3 py-3 rounded-xl border-2 transition-all',
                form.proveedor === p.val
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-foreground-muted hover:border-primary/40 bg-background'
              )}>
              <p className="text-xs font-bold">{p.label}</p>
              <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{p.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Credenciales */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Credenciales</h2>

        {/* Gmail */}
        {form.proveedor === 'gmail' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-3 text-xs text-blue-700 leading-relaxed">
              <p className="font-bold mb-2">Cómo obtener la contraseña de aplicación Gmail:</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Entra a tu cuenta Gmail y activa la <span className="font-semibold">Verificación en 2 pasos</span> si no la tienes</li>
                <li>
                  Ve directamente a{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 hover:text-blue-900"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                </li>
                <li>En <span className="font-semibold">Nombre de la app</span> escribe <span className="font-mono bg-blue-100 px-1 rounded">GuambraShop</span> y haz clic en <span className="font-semibold">Crear</span></li>
                <li>Google muestra un código de <span className="font-semibold">16 caracteres separados en grupos de 4</span> — cópialo <span className="font-semibold">sin espacios</span> y pégalo abajo</li>
              </ol>
              <p className="mt-2 text-[11px] bg-blue-100 rounded-lg px-2 py-1.5 text-blue-800">
                ⚠️ Si el enlace no abre la opción, ve a <span className="font-mono">myaccount.google.com → Seguridad → Llaves de acceso</span>, elimina las llaves temporalmente, genera la contraseña y luego las vuelves a activar.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Cuenta Gmail</label>
              <input type="email" value={form.smtp_usuario} onChange={e => set('smtp_usuario', e.target.value)}
                placeholder="chakanaecu@gmail.com"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Contraseña de aplicación <span className="text-foreground-muted/60">(16 caracteres, sin espacios)</span></label>
              <div className="relative">
                <input type={mostrarPass ? 'text' : 'password'} value={form.smtp_password}
                  onChange={e => set('smtp_password', e.target.value.replace(/\s/g, ''))}
                  placeholder="abcdwxyzefghijkl"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={() => setMostrarPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                  {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMTP propio */}
        {form.proveedor === 'smtp' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-foreground-muted block mb-1">Servidor SMTP</label>
                <input type="text" value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)}
                  placeholder="mail.tudominio.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1">Puerto</label>
                <input type="number" value={form.smtp_port} onChange={e => set('smtp_port', Number(e.target.value))}
                  placeholder="587"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Usuario</label>
              <input type="email" value={form.smtp_usuario} onChange={e => set('smtp_usuario', e.target.value)}
                placeholder="facturas@tudominio.com"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Contraseña</label>
              <div className="relative">
                <input type={mostrarPass ? 'text' : 'password'} value={form.smtp_password}
                  onChange={e => set('smtp_password', e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={() => setMostrarPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                  {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resend */}
        {form.proveedor === 'resend' && (
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">API Key de Resend</label>
            <div className="relative">
              <input type={mostrarKey ? 'text' : 'password'} value={form.resend_api_key}
                onChange={e => set('resend_api_key', e.target.value.trim())}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setMostrarKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                {mostrarKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Remitente */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Remitente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">Nombre del remitente</label>
            <input type="text" value={form.from_nombre} onChange={e => set('from_nombre', e.target.value)}
              placeholder="ChakanShop Facturación"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">Email remitente</label>
            <input type="email" value={form.from_email} onChange={e => set('from_email', e.target.value)}
              placeholder={form.proveedor === 'gmail' ? 'chakanaecu@gmail.com' : 'facturas@tudominio.com'}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {form.proveedor === 'gmail' && (
              <p className="text-[10px] text-foreground-muted mt-1">Debe ser la misma cuenta Gmail que pusiste arriba</p>
            )}
          </div>
        </div>
      </section>

      {/* Opciones */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Opciones</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)}
            className="w-4 h-4 accent-primary mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">Envío de emails activo</p>
            <p className="text-xs text-foreground-muted">Si está desactivado no se enviará ningún email aunque todo esté configurado</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.envio_automatico} onChange={e => set('envio_automatico', e.target.checked)}
            className="w-4 h-4 accent-primary mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">Envío automático al autorizar</p>
            <p className="text-xs text-foreground-muted">Cuando el SRI autorice una factura, el RIDE se envía automáticamente al email del cliente sin hacer nada</p>
          </div>
        </label>
      </section>

      {/* Resultado prueba */}
      {resultadoPrueba && (
        <div className={cn('rounded-xl border px-4 py-3 flex items-center gap-2.5 text-sm',
          resultadoPrueba.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        )}>
          {resultadoPrueba.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {resultadoPrueba.msg}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-3 justify-end">
        <button type="button" onClick={probar} disabled={probando || guardando}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50">
          {probando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {probando ? 'Enviando prueba…' : 'Probar envío'}
        </button>
        <button type="submit" disabled={guardando}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm">
          <Save className="w-4 h-4" />
          {guardando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  )
}
