'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageCircle, Calendar, MapPin, DollarSign, ChevronDown, 
  PartyPopper, Search, SlidersHorizontal, Loader2, Mail, 
  Phone, Clock, MoreHorizontal, Eye, Trash2, CheckCircle2,
  XCircle, Filter, ArrowUpDown, Tag
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { generarMensajeSolicitudEvento, generarEnlaceWhatsApp } from '@/lib/whatsapp'
import { formatearPrecio } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SolicitudEvento, EstadoSolicitud } from '@/types'

// ─── Config de estados ────────────────────────────────────────────────────────

const ESTADOS: Record<EstadoSolicitud, { etiqueta: string; color: string; icono: React.ReactNode }> = {
  nueva:              { etiqueta: 'Nueva',              color: 'bg-purple-50 text-purple-700 border-purple-100', icono: <PartyPopper className="w-3 h-3" /> },
  en_conversacion:    { etiqueta: 'En conversación',    color: 'bg-blue-50 text-blue-700 border-blue-100',       icono: <MessageCircle className="w-3 h-3" /> },
  cotizacion_enviada: { etiqueta: 'Cotización enviada', color: 'bg-amber-50 text-amber-700 border-amber-100',    icono: <DollarSign className="w-3 h-3" /> },
  confirmada:         { etiqueta: 'Confirmada',         color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icono: <CheckCircle2 className="w-3 h-3" /> },
  rechazada:          { etiqueta: 'Rechazada',          color: 'bg-red-50 text-red-700 border-red-100',          icono: <XCircle className="w-3 h-3" /> },
}

const ORDEN_ESTADOS: EstadoSolicitud[] = ['nueva', 'en_conversacion', 'cotizacion_enviada', 'confirmada', 'rechazada']

interface Props {
  solicitudesInic: SolicitudEvento[]
  whatsapp: string
  simboloMoneda?: string
}

type OrdenSort = 'reciente' | 'fecha_evento' | 'presupuesto' | 'cliente'

// ─── Componente ───────────────────────────────────────────────────────────────

export function TablaSolicitudes({ solicitudesInic, whatsapp, simboloMoneda = '$' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [solicitudes, setSolicitudes] = useState<SolicitudEvento[]>(solicitudesInic)
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | 'todas'>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenSort>('reciente')
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState<string | null>(null)

  // Filtrado y ordenamiento
  const filtradas = useMemo(() => {
    let result = solicitudes
    
    // Filtro estado
    if (filtroEstado !== 'todas') {
      result = result.filter(s => s.estado === filtroEstado)
    }

    // Búsqueda
    const texto = busqueda.toLowerCase().trim()
    if (texto) {
      result = result.filter(s => 
        s.numero_solicitud.toLowerCase().includes(texto) ||
        s.nombre_cliente.toLowerCase().includes(texto) ||
        s.email.toLowerCase().includes(texto) ||
        s.producto_nombre.toLowerCase().includes(texto) ||
        (s.ciudad ?? '').toLowerCase().includes(texto)
      )
    }

    // Orden
    return [...result].sort((a, b) => {
      switch (orden) {
        case 'reciente': 
          return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        case 'fecha_evento':
          if (!a.fecha_evento) return 1
          if (!b.fecha_evento) return -1
          return new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime()
        case 'presupuesto':
          return (b.presupuesto_aproximado ?? 0) - (a.presupuesto_aproximado ?? 0)
        case 'cliente':
          return a.nombre_cliente.localeCompare(b.nombre_cliente)
        default: return 0
      }
    })
  }, [solicitudes, filtroEstado, busqueda, orden])

  // Conteos para las pestañas
  const counts = useMemo(() => ({
    todas: solicitudes.length,
    nueva: solicitudes.filter(s => s.estado === 'nueva').length,
    en_conversacion: solicitudes.filter(s => s.estado === 'en_conversacion').length,
    cotizacion_enviada: solicitudes.filter(s => s.estado === 'cotizacion_enviada').length,
    confirmada: solicitudes.filter(s => s.estado === 'confirmada').length,
    rechazada: solicitudes.filter(s => s.estado === 'rechazada').length,
  }), [solicitudes])

  async function cambiarEstado(sol: SolicitudEvento, nuevoEstado: EstadoSolicitud) {
    setActualizando(sol.id)
    const supabase = crearClienteSupabase()

    const { error } = await supabase
      .from('solicitudes_evento')
      .update({ estado: nuevoEstado })
      .eq('id', sol.id)

    if (error) {
      toast.error('Error al actualizar el estado')
      setActualizando(null)
      return
    }

    setSolicitudes(prev =>
      prev.map(s => s.id === sol.id ? { ...s, estado: nuevoEstado } : s)
    )
    toast.success(nuevoEstado === 'confirmada' ? 'Evento confirmado' : 'Estado actualizado')

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
      }).catch(() => {})
    }

    setActualizando(null)
    startTransition(() => router.refresh())
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

  async function eliminarSolicitud(id: string, numero: string) {
    if (!confirm(`¿Eliminar definitivamente la solicitud #${numero}?`)) return
    
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('solicitudes_evento').delete().eq('id', id)
    
    if (error) {
      toast.error('No se pudo eliminar')
      return
    }
    
    setSolicitudes(prev => prev.filter(s => s.id !== id))
    toast.success('Solicitud eliminada')
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      
      {/* ══ PESTAÑAS DE ESTADO ══ */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs border-b border-border pb-1">
        {[
          { id: 'todas', label: 'Todas', count: counts.todas },
          { id: 'nueva', label: 'Nuevas', count: counts.nueva },
          { id: 'en_conversacion', label: 'En conversación', count: counts.en_conversacion },
          { id: 'cotizacion_enviada', label: 'Cotización enviada', count: counts.cotizacion_enviada },
          { id: 'confirmada', label: 'Confirmadas', count: counts.confirmada },
          { id: 'rechazada', label: 'Rechazadas', count: counts.rechazada },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroEstado(tab.id as any)}
            className={cn(
              'pb-2 px-1 transition-all relative font-medium',
              filtroEstado === tab.id ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {tab.label} <span className="opacity-50">({tab.count})</span>
            {filtroEstado === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* ══ BARRA DE ACCIONES ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
            <select
              value={orden}
              onChange={e => setOrden(e.target.value as OrdenSort)}
              className="h-9 pl-8 pr-8 rounded-lg bg-card border border-border text-xs font-medium focus:outline-none appearance-none cursor-pointer"
            >
              <option value="reciente">Más recientes</option>
              <option value="fecha_evento">Fecha de evento</option>
              <option value="presupuesto">Mayor presupuesto</option>
              <option value="cliente">Cliente A-Z</option>
            </select>
          </div>
          
          {busqueda && (
            <button 
              onClick={() => setBusqueda('')}
              className="text-xs font-bold text-primary hover:underline px-2"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar solicitudes..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* ══ TABLA (Desktop) ══ */}
      <div className="bg-card rounded-xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-4 py-3">Solicitud</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Fecha Evento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Presupuesto</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-foreground-muted">
                    <div className="flex flex-col items-center gap-2">
                      <PartyPopper className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">No se encontraron solicitudes</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map(sol => {
                  const cfg = ESTADOS[sol.estado]
                  return (
                    <tr key={sol.id} className="hover:bg-background-subtle/30 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{sol.numero_solicitud}</span>
                          <span className="text-[10px] text-foreground-muted mt-0.5 truncate max-w-[150px]">
                            {sol.producto_nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{sol.nombre_cliente}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> {sol.whatsapp}
                            </span>
                            {sol.email && (
                              <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" /> {sol.email.split('@')[0]}...
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {sol.fecha_evento ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                              {new Date(sol.fecha_evento + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-foreground-muted flex items-center gap-1 mt-0.5">
                              {sol.ciudad && <><MapPin className="w-2.5 h-2.5" /> {sol.ciudad}</>}
                              {sol.hora_evento && <span>· {sol.hora_evento.slice(0, 5)}</span>}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground-muted">No definida</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative group/status w-fit">
                          <select
                            value={sol.estado}
                            onChange={e => cambiarEstado(sol, e.target.value as EstadoSolicitud)}
                            disabled={actualizando === sol.id}
                            className={cn(
                              'appearance-none h-8 pl-3 pr-8 rounded-lg border text-[11px] font-bold transition-all cursor-pointer focus:outline-none',
                              cfg.color
                            )}
                          >
                            {ORDEN_ESTADOS.map(val => (
                              <option key={val} value={val}>{ESTADOS[val].etiqueta}</option>
                            ))}
                          </select>
                          {actualizando === sol.id ? (
                            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin opacity-50" />
                          ) : (
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 group-hover/status:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-foreground">
                          {sol.presupuesto_aproximado ? formatearPrecio(sol.presupuesto_aproximado, simboloMoneda) : 'N/A'}
                        </p>
                        <p className="text-[10px] text-foreground-muted mt-0.5">
                          {new Date(sol.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Ver detalles"
                            onClick={() => setModalAbierto(sol.id)}
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="WhatsApp"
                            onClick={() => abrirWhatsApp(sol)}
                            className="w-8 h-8 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/20 transition-all shadow-sm"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Eliminar"
                            onClick={() => eliminarSolicitud(sol.id, sol.numero_solicitud)}
                            className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ MODAL DE DETALLES ══ */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {filtradas.filter(s => s.id === modalAbierto).map(sol => (
              <div key={sol.id}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Detalle de Solicitud</h3>
                    <p className="text-xs text-foreground-muted">{sol.numero_solicitud} · {new Date(sol.creado_en).toLocaleString('es-EC')}</p>
                  </div>
                  <button 
                    onClick={() => setModalAbierto(null)}
                    className="p-2 hover:bg-background-subtle rounded-xl transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-foreground-muted" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Cliente</p>
                      <p className="text-sm font-semibold text-foreground">{sol.nombre_cliente}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">WhatsApp</p>
                      <p className="text-sm font-semibold text-foreground">{sol.whatsapp}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold text-foreground truncate">{sol.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Servicio Solicitado</p>
                      <p className="text-sm font-semibold text-primary">{sol.producto_nombre}</p>
                    </div>
                  </div>

                  <div className="bg-background-subtle rounded-2xl p-4 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Fecha</p>
                        <p className="text-xs font-semibold">{sol.fecha_evento ? new Date(sol.fecha_evento + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No definida'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Hora</p>
                        <p className="text-xs font-semibold">{sol.hora_evento ? sol.hora_evento.slice(0, 5) : 'No definida'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Ubicación</p>
                        <p className="text-xs font-semibold">{sol.ciudad ?? 'No definida'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Tipo Evento</p>
                        <p className="text-xs font-semibold">{sol.tipo_evento ?? 'No definida'}</p>
                      </div>
                    </div>
                  </div>

                  {sol.notas && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Notas del cliente</p>
                      <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground leading-relaxed italic">
                        &quot;{sol.notas}&quot;
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Presupuesto aproximado</p>
                    <p className="text-2xl font-black text-primary">
                      {sol.presupuesto_aproximado ? formatearPrecio(sol.presupuesto_aproximado, simboloMoneda) : 'Presupuesto no definido'}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-background-subtle/50 flex gap-3">
                  <button
                    onClick={() => abrirWhatsApp(sol)}
                    className="flex-1 h-11 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#22c55e] transition-all"
                  >
                    <MessageCircle className="w-5 h-5" /> Contactar por WhatsApp
                  </button>
                  <button
                    onClick={() => setModalAbierto(null)}
                    className="h-11 px-6 rounded-xl border border-input-border bg-card text-sm font-semibold text-foreground hover:bg-background transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ ESTADÍSTICAS RÁPIDAS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <PartyPopper className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Total solicitudes</p>
            <p className="text-lg font-bold text-foreground">{counts.todas}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Confirmadas</p>
            <p className="text-lg font-bold text-emerald-600">{counts.confirmada}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Pendientes</p>
            <p className="text-lg font-bold text-primary">{counts.nueva + counts.en_conversacion + counts.cotizacion_enviada}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
