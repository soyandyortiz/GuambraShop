'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, MapPin, DollarSign, ChevronDown, PartyPopper, SlidersHorizontal, ClipboardList, ExternalLink } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { generarMensajeSolicitudEvento, generarEnlaceWhatsApp } from '@/lib/whatsapp'
import { formatearPrecio } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SolicitudEvento, EstadoSolicitud } from '@/types'

// Extiende SolicitudEvento con el pedido vinculado (join de Supabase)
type SolicitudConPedido = SolicitudEvento & {
  pedido?: { id: string; numero_orden: string } | null
}

// ─── Config de estados ────────────────────────────────────────────────────────

const ESTADOS: Record<EstadoSolicitud, { etiqueta: string; color: string; punto: string }> = {
  nueva:              { etiqueta: 'Nueva',              color: 'bg-purple-100 text-purple-700 border-purple-200',  punto: 'bg-purple-500' },
  en_conversacion:    { etiqueta: 'En conversación',    color: 'bg-blue-100 text-blue-700 border-blue-200',        punto: 'bg-blue-500'   },
  cotizacion_enviada: { etiqueta: 'Cotización enviada', color: 'bg-amber-100 text-amber-700 border-amber-200',     punto: 'bg-amber-500'  },
  confirmada:         { etiqueta: 'Confirmada',         color: 'bg-green-100 text-green-700 border-green-200',     punto: 'bg-green-500'  },
  rechazada:          { etiqueta: 'Rechazada',          color: 'bg-red-100 text-red-700 border-red-200',           punto: 'bg-red-400'    },
}

const ORDEN_ESTADOS: EstadoSolicitud[] = ['nueva', 'en_conversacion', 'cotizacion_enviada', 'confirmada', 'rechazada']

interface Props {
  solicitudesInic: SolicitudConPedido[]
  whatsapp: string
  simboloMoneda?: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TablaSolicitudes({ solicitudesInic, whatsapp, simboloMoneda = '$' }: Props) {
  const [solicitudes, setSolicitudes] = useState<SolicitudConPedido[]>(solicitudesInic)
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'todas'>('todas')
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)

  const filtradas = filtro === 'todas'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtro)

  async function cambiarEstado(sol: SolicitudEvento, nuevoEstado: EstadoSolicitud) {
    setActualizando(sol.id)
    const supabase = crearClienteSupabase()

    // ── Fase 4: si se confirma y aún no tiene pedido vinculado → crear pedido ──
    let nuevoPedidoId: string | null = null
    let nuevoPedidoNumero: string | null = null
    if (nuevoEstado === 'confirmada' && !sol.pedido_id) {
      const presupuesto = sol.presupuesto_aproximado ?? 0
      const { data: pedido, error: errPedido } = await supabase
        .from('pedidos')
        .insert({
          tipo: 'local',
          nombres: sol.nombre_cliente,
          email: sol.email,
          whatsapp: sol.whatsapp,
          simbolo_moneda: simboloMoneda,
          items: [
            {
              nombre: sol.producto_nombre,
              cantidad: 1,
              precio: presupuesto,
              tipo_producto: 'evento',
              producto_id: sol.producto_id ?? null,
            },
          ],
          subtotal: presupuesto,
          total: presupuesto,
          estado: 'confirmado',
        })
        .select('id, numero_orden')
        .single()

      if (errPedido) {
        toast.error('Error al crear el pedido vinculado')
        setActualizando(null)
        return
      }
      nuevoPedidoId     = pedido.id
      nuevoPedidoNumero = pedido.numero_orden
    }

    // ── Actualizar estado (+ pedido_id si recién creado) ─────────────────────
    const payload: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoPedidoId) payload.pedido_id = nuevoPedidoId

    const { error } = await supabase
      .from('solicitudes_evento')
      .update(payload)
      .eq('id', sol.id)

    if (error) {
      toast.error('Error al actualizar el estado')
      setActualizando(null)
      return
    }

    setSolicitudes(prev =>
      prev.map(s => s.id === sol.id
        ? {
            ...s,
            estado: nuevoEstado,
            ...(nuevoPedidoId && nuevoPedidoNumero ? {
              pedido_id: nuevoPedidoId,
              pedido: { id: nuevoPedidoId, numero_orden: nuevoPedidoNumero },
            } : {}),
          }
        : s
      )
    )
    toast.success(nuevoEstado === 'confirmada' ? 'Evento confirmado — pedido generado' : 'Estado actualizado')

    // ── Fase 5: notificación Telegram al confirmar ────────────────────────────
    if (nuevoEstado === 'confirmada') {
      fetch('/api/telegram/notificar-confirmacion-evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSolicitud:  sol.numero_solicitud,
          nombreCliente:    sol.nombre_cliente,
          productoNombre:   sol.producto_nombre,
          fechaEvento:      sol.fecha_evento,
          ciudad:           sol.ciudad,
          presupuesto:      sol.presupuesto_aproximado,
          simboloMoneda,
        }),
      }).catch(() => {/* notificación silenciosa */})
    }

    setActualizando(null)
  }

  function abrirWhatsApp(sol: SolicitudEvento) {
    const msgCodificado = generarMensajeSolicitudEvento({
      numeroSolicitud: sol.numero_solicitud,
      productoNombre:  sol.producto_nombre,
      nombreCliente:   sol.nombre_cliente,
      whatsapp:        sol.whatsapp,
      email:           sol.email,
      fechaEvento:     sol.fecha_evento,
      horaEvento:      sol.hora_evento,
      ciudad:          sol.ciudad,
      tipoEvento:      sol.tipo_evento,
      presupuesto:     sol.presupuesto_aproximado,
      notas:           sol.notas,
      simboloMoneda,
    })
    window.open(generarEnlaceWhatsApp(whatsapp, msgCodificado), '_blank')
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Filtros por estado */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltro('todas')}
          className={cn(
            'h-8 px-3 rounded-full text-xs font-semibold transition-all',
            filtro === 'todas'
              ? 'bg-foreground text-background'
              : 'bg-card border border-border text-foreground-muted hover:text-foreground'
          )}
        >
          Todas ({solicitudes.length})
        </button>
        {ORDEN_ESTADOS.map(est => {
          const count = solicitudes.filter(s => s.estado === est).length
          if (count === 0) return null
          const cfg = ESTADOS[est]
          return (
            <button
              key={est}
              onClick={() => setFiltro(est)}
              className={cn(
                'h-8 px-3 rounded-full text-xs font-semibold transition-all border',
                filtro === est ? cfg.color : 'bg-card border-border text-foreground-muted hover:text-foreground'
              )}
            >
              {cfg.etiqueta} ({count})
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="py-16 text-center">
          <PartyPopper className="w-10 h-10 text-foreground-muted/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin solicitudes</p>
          <p className="text-xs text-foreground-muted mt-1">
            {filtro === 'todas' ? 'Aún no hay solicitudes de evento' : `No hay solicitudes con estado "${ESTADOS[filtro].etiqueta}"`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtradas.map(sol => {
            const cfg = ESTADOS[sol.estado]
            const abierta = expandida === sol.id
            return (
              <div key={sol.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
                {/* Cabecera de la solicitud */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-background-subtle/50 transition-colors"
                  onClick={() => setExpandida(abierta ? null : sol.id)}
                >
                  {/* Número + estado */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-foreground">{sol.numero_solicitud}</span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.color)}>
                        {cfg.etiqueta}
                      </span>
                    </div>
                    <p className="text-sm text-foreground truncate">{sol.nombre_cliente}</p>
                    <p className="text-xs text-foreground-muted truncate">{sol.producto_nombre}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {sol.fecha_evento && (
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(sol.fecha_evento + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {sol.hora_evento && (
                            <span className="ml-0.5">· {sol.hora_evento.slice(0, 5)}</span>
                          )}
                        </span>
                      )}
                      {sol.ciudad && (
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sol.ciudad}
                        </span>
                      )}
                      {sol.presupuesto_aproximado && (
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatearPrecio(sol.presupuesto_aproximado, simboloMoneda)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronDown className={cn('w-4 h-4 text-foreground-muted flex-shrink-0 mt-0.5 transition-transform', abierta && 'rotate-180')} />
                </div>

                {/* Detalle expandible */}
                {abierta && (
                  <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
                    {/* Info de contacto */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-foreground-muted mb-0.5">Email</p>
                        <p className="font-medium text-foreground break-all">{sol.email}</p>
                      </div>
                      <div>
                        <p className="text-foreground-muted mb-0.5">WhatsApp</p>
                        <p className="font-medium text-foreground">{sol.whatsapp}</p>
                      </div>
                      {sol.hora_evento && (
                        <div>
                          <p className="text-foreground-muted mb-0.5">Hora del evento</p>
                          <p className="font-medium text-foreground">{sol.hora_evento.slice(0, 5)}</p>
                        </div>
                      )}
                      {sol.tipo_evento && (
                        <div>
                          <p className="text-foreground-muted mb-0.5">Tipo de evento</p>
                          <p className="font-medium text-foreground">{sol.tipo_evento}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-foreground-muted mb-0.5">Recibida</p>
                        <p className="font-medium text-foreground">
                          {new Date(sol.creado_en).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {sol.notas && (
                      <div className="bg-background-subtle rounded-xl px-3 py-2 text-xs">
                        <p className="text-foreground-muted mb-0.5 font-medium">Notas del cliente:</p>
                        <p className="text-foreground leading-relaxed">{sol.notas}</p>
                      </div>
                    )}

                    {/* Pedido vinculado */}
                    {sol.pedido && (
                      <Link
                        href="/admin/dashboard/pedidos"
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-green-700 font-bold leading-none mb-0.5">Pedido generado</p>
                            <p className="text-xs font-black text-green-800">{sol.pedido.numero_orden}</p>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      </Link>
                    )}

                    {/* Cambiar estado + WhatsApp */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
                        <select
                          value={sol.estado}
                          disabled={actualizando === sol.id}
                          onChange={e => cambiarEstado(sol, e.target.value as EstadoSolicitud)}
                          className="w-full h-9 pl-8 pr-3 rounded-xl border border-input-border bg-input-bg text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer disabled:opacity-50"
                        >
                          {ORDEN_ESTADOS.map(e => (
                            <option key={e} value={e}>{ESTADOS[e].etiqueta}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => abrirWhatsApp(sol)}
                        className="h-9 px-3 rounded-xl bg-[#25D366] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#22c55e] transition-all whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
