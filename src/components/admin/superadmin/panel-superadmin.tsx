'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Power, MessageSquare, Calendar, Clock, Send,
  Loader2, ShieldAlert, ToggleLeft, ToggleRight
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { ContadorPago } from './contador-pago'
import { cn } from '@/lib/utils'

interface Config {
  id: string
  esta_activa: boolean
  mensaje_suspension: string
  info_pago: string | null
  cobro_activo: boolean
  fecha_inicio_sistema: string | null
  dias_pago: number
}

interface Props { config: Config }

const PERIODOS = [
  { label: '15 días', valor: 15 },
  { label: '30 días', valor: 30 },
  { label: '60 días', valor: 60 },
  { label: '90 días', valor: 90 },
]

export function PanelSuperadmin({ config }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState<string | null>(null)

  // Estado local para los campos editables
  const [cobro, setCobro] = useState(config.cobro_activo)
  const [fechaInicio, setFechaInicio] = useState(
    config.fecha_inicio_sistema
      ? config.fecha_inicio_sistema.split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [diasPago, setDiasPago] = useState(config.dias_pago)
  const [tiendaActiva, setTiendaActiva] = useState(config.esta_activa)
  const [mensajeSuspension, setMensajeSuspension] = useState(config.mensaje_suspension)
  const [infoPago, setInfoPago] = useState(config.info_pago ?? '')
  const [mensajePersonal, setMensajePersonal] = useState('')

  async function guardarCobro() {
    setGuardando('cobro')
    const supabase = crearClienteSupabase()

    const fechaISOInicio = new Date(fechaInicio + 'T00:00:00').toISOString()

    const { error } = await supabase.from('configuracion_tienda').update({
      cobro_activo: cobro,
      fecha_inicio_sistema: cobro ? fechaISOInicio : null,
      dias_pago: diasPago,
    }).eq('id', config.id)

    if (error) { toast.error('Error al guardar'); setGuardando(null); return }

    // Si se activa el cobro, enviar mensaje automático al admin
    if (cobro && !config.cobro_activo) {
      const fechaFin = new Date(new Date(fechaInicio + 'T00:00:00').getTime() + diasPago * 24 * 60 * 60 * 1000)
      await supabase.from('mensajes_admin').insert({
        asunto: '📅 Período de uso activado',
        cuerpo: `Tu período de uso del sistema ha iniciado el ${new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nTienes ${diasPago} días para renovar tu suscripción.\n\nFecha límite de pago: ${fechaFin.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nContacta al administrador del sistema para proceder con el pago y mantener tu tienda activa.`,
        leido: false,
      })
      toast.success('Cobro activado — mensaje enviado al admin')
    } else {
      toast.success('Configuración de cobro guardada')
    }

    setGuardando(null)
    router.refresh()
  }

  async function toggleTienda() {
    setGuardando('tienda')
    const supabase = crearClienteSupabase()
    const nuevoEstado = !tiendaActiva

    const { error } = await supabase.from('configuracion_tienda').update({
      esta_activa: nuevoEstado,
      mensaje_suspension: mensajeSuspension,
      info_pago: infoPago || null,
    }).eq('id', config.id)

    if (error) { toast.error('Error al cambiar estado'); setGuardando(null); return }

    // Mensaje automático al admin
    await supabase.from('mensajes_admin').insert({
      asunto: nuevoEstado ? '✅ Tienda reactivada' : '⚠️ Tienda suspendida',
      cuerpo: nuevoEstado
        ? 'Tu tienda ha sido reactivada exitosamente. Ya está visible para los clientes.'
        : `Tu tienda ha sido suspendida temporalmente.\n\n${mensajeSuspension}${infoPago ? `\n\nInformación de pago:\n${infoPago}` : ''}`,
      leido: false,
    })

    setTiendaActiva(nuevoEstado)
    toast.success(nuevoEstado ? 'Tienda reactivada' : 'Tienda suspendida')
    setGuardando(null)
    router.refresh()
  }

  async function enviarMensaje() {
    if (!mensajePersonal.trim()) { toast.error('Escribe un mensaje'); return }
    setGuardando('mensaje')
    const supabase = crearClienteSupabase()

    await supabase.from('mensajes_admin').insert({
      asunto: null,
      cuerpo: mensajePersonal.trim(),
      leido: false,
    })

    setMensajePersonal('')
    toast.success('Mensaje enviado al admin')
    setGuardando(null)
    router.refresh()
  }

  async function enviarRecordatorioPago() {
    if (!config.cobro_activo || !config.fecha_inicio_sistema) return
    setGuardando('recordatorio')
    const supabase = crearClienteSupabase()
    const fechaFin = new Date(new Date(config.fecha_inicio_sistema).getTime() + config.dias_pago * 24 * 60 * 60 * 1000)
    const restanteMs = fechaFin.getTime() - Date.now()
    const diasRestantes = Math.max(0, Math.floor(restanteMs / (1000 * 60 * 60 * 24)))

    await supabase.from('mensajes_admin').insert({
      asunto: '🔔 Recordatorio de pago',
      cuerpo: `Te recordamos que ${diasRestantes === 0 ? 'tu período de uso ha vencido hoy' : `quedan ${diasRestantes} día(s) para que venza tu período de uso`}.\n\nFecha límite: ${fechaFin.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nRealiza tu pago para continuar usando el sistema sin interrupciones.${infoPago ? `\n\nInformación de pago:\n${infoPago}` : ''}`,
      leido: false,
    })

    toast.success('Recordatorio de pago enviado')
    setGuardando(null)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header panel */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <ShieldAlert className="w-3.5 h-3.5 text-white" />
        </div>
        <h2 className="text-sm font-bold text-foreground">Panel Superadmin</h2>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">SOLO TÚ</span>
      </div>

      {/* ── SECCIÓN COBRO ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Control de cobro</p>
            <p className="text-xs text-foreground-muted">Fecha de inicio y período de pago</p>
          </div>
          <button
            onClick={() => setCobro(v => !v)}
            className={cn('transition-colors', cobro ? 'text-primary' : 'text-foreground-muted')}
            title={cobro ? 'Desactivar cobro' : 'Activar cobro'}
          >
            {cobro
              ? <ToggleRight className="w-8 h-8" />
              : <ToggleLeft className="w-8 h-8" />
            }
          </button>
        </div>

        {cobro && (
          <>
            {/* Fecha de inicio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Fecha de inicio del período
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Período de pago */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Período de pago
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PERIODOS.map(p => (
                  <button
                    key={p.valor}
                    type="button"
                    onClick={() => setDiasPago(p.valor)}
                    className={cn(
                      'h-9 rounded-xl border text-xs font-medium transition-all',
                      diasPago === p.valor
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-foreground-muted hover:border-primary/40'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contador en vivo */}
            <ContadorPago
              fechaInicio={new Date(fechaInicio + 'T00:00:00').toISOString()}
              diasPago={diasPago}
            />

            {/* Recordatorio */}
            {config.cobro_activo && (
              <button
                onClick={enviarRecordatorioPago}
                disabled={guardando === 'recordatorio'}
                className="flex items-center justify-center gap-2 h-9 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-60 transition-all"
              >
                {guardando === 'recordatorio'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                  : <><Send className="w-3.5 h-3.5" /> Enviar recordatorio de pago</>
                }
              </button>
            )}
          </>
        )}

        <button
          onClick={guardarCobro}
          disabled={guardando === 'cobro'}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all"
        >
          {guardando === 'cobro'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : cobro ? 'Guardar configuración de cobro' : 'Guardar (cobro desactivado)'
          }
        </button>
      </div>

      {/* ── SECCIÓN ESTADO TIENDA ────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Estado de la tienda</p>
            <p className="text-xs text-foreground-muted">
              Actualmente:{' '}
              <span className={cn('font-semibold', tiendaActiva ? 'text-success' : 'text-danger')}>
                {tiendaActiva ? 'Activa' : 'Suspendida'}
              </span>
            </p>
          </div>
          <div className={cn(
            'w-3 h-3 rounded-full',
            tiendaActiva ? 'bg-success' : 'bg-danger'
          )} />
        </div>

        {!tiendaActiva && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Mensaje de suspensión</label>
              <textarea
                value={mensajeSuspension}
                onChange={e => setMensajeSuspension(e.target.value)}
                rows={2}
                className="px-3 py-2 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Información de pago</label>
              <textarea
                value={infoPago}
                onChange={e => setInfoPago(e.target.value)}
                rows={2}
                placeholder="Número de cuenta, Paypal, instrucciones..."
                className="px-3 py-2 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </>
        )}

        <button
          onClick={toggleTienda}
          disabled={guardando === 'tienda'}
          className={cn(
            'flex items-center justify-center gap-2 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all',
            tiendaActiva ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'
          )}
        >
          {guardando === 'tienda'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            : tiendaActiva
            ? <><Power className="w-4 h-4" /> Suspender tienda</>
            : <><Power className="w-4 h-4" /> Reactivar tienda</>
          }
        </button>
      </div>

      {/* ── SECCIÓN MENSAJE RÁPIDO ───────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Enviar mensaje al admin
        </p>
        <textarea
          value={mensajePersonal}
          onChange={e => setMensajePersonal(e.target.value)}
          rows={3}
          placeholder="Escribe un mensaje directo al administrador..."
          className="px-3 py-2 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <button
          onClick={enviarMensaje}
          disabled={guardando === 'mensaje' || !mensajePersonal.trim()}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all"
        >
          {guardando === 'mensaje'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            : <><Send className="w-4 h-4" /> Enviar mensaje</>
          }
        </button>
      </div>

    </div>
  )
}
