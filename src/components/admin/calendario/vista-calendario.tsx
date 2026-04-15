'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Calendar, Clock,
  User, Phone, MessageCircle, X, ChevronDown,
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CitaExt {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: string
  producto: { nombre: string; imagenes: { url: string; orden: number }[] }
  pedido: { numero_orden: string; nombres: string; email: string; whatsapp: string } | null
}

interface Props {
  citas: CitaExt[]
  mesActual: string // "YYYY-MM"
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADOS: Record<string, { etiqueta: string; color: string; punto: string }> = {
  pendiente:  { etiqueta: 'Pendiente',  color: 'bg-warning/15 text-warning border-warning/30',         punto: 'bg-yellow-400' },
  reservada:  { etiqueta: 'Reservada',  color: 'bg-blue-500/15 text-blue-600 border-blue-300',          punto: 'bg-blue-500'   },
  confirmada: { etiqueta: 'Confirmada', color: 'bg-success/15 text-success border-success/30',          punto: 'bg-green-500'  },
  cancelada:  { etiqueta: 'Cancelada',  color: 'bg-danger/15 text-danger border-danger/30',             punto: 'bg-red-400'    },
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ─── Componente principal ─────────────────────────────────────────────────────

export function VistaCalendario({ citas: citasInic, mesActual }: Props) {
  const router = useRouter()
  const [citas, setCitas]               = useState<CitaExt[]>(citasInic)
  const [diaSeleccionado, setDia]       = useState<number | null>(null)
  const [filtro, setFiltro]             = useState<'activas' | 'todos' | 'confirmada' | 'reservada' | 'pendiente'>('activas')
  const [actualizando, setActualizando] = useState<string | null>(null)

  const [year, month] = mesActual.split('-').map(Number) // month: 1-based

  // ── Cálculo de la grilla ──────────────────────────────────────────────────
  const totalDias      = new Date(year, month, 0).getDate()
  const primerDiaMes   = new Date(year, month - 1, 1)
  // JS: 0=Dom, convertimos a Lun-first (0=Lun … 6=Dom)
  const offsetInicio   = (primerDiaMes.getDay() + 6) % 7

  const celdas = useMemo(() => {
    const arr: (number | null)[] = [
      ...Array.from({ length: offsetInicio }, () => null),
      ...Array.from({ length: totalDias },    (_, i) => i + 1),
    ]
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [offsetInicio, totalDias])

  // ── Citas agrupadas por día ───────────────────────────────────────────────
  const citasPorDia = useMemo(() => {
    const map: Record<number, CitaExt[]> = {}
    citas.forEach(c => {
      const dia = parseInt(c.fecha.split('-')[2], 10)
      ;(map[dia] ??= []).push(c)
    })
    return map
  }, [citas])

  // ── Citas del día seleccionado (filtradas) ────────────────────────────────
  const citasDia = useMemo(() => {
    if (!diaSeleccionado) return []
    const lista = [...(citasPorDia[diaSeleccionado] ?? [])].sort(
      (a, b) => a.hora_inicio.localeCompare(b.hora_inicio)
    )
    if (filtro === 'activas') return lista.filter(c => c.estado === 'reservada' || c.estado === 'confirmada')
    if (filtro === 'todos')   return lista
    return lista.filter(c => c.estado === filtro)
  }, [diaSeleccionado, citasPorDia, filtro])

  // ── Hoy ──────────────────────────────────────────────────────────────────
  const hoy = new Date()
  const esHoy = (dia: number) =>
    dia === hoy.getDate() && month === hoy.getMonth() + 1 && year === hoy.getFullYear()

  // ── Navegación de mes ────────────────────────────────────────────────────
  function irMes(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setDia(null)
    router.push(`/admin/dashboard/calendario?mes=${nuevo}`)
  }

  // ── Cambiar estado de cita ───────────────────────────────────────────────
  async function cambiarEstado(id: string, nuevoEstado: string) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq('id', id)
    setActualizando(null)
    if (error) { toast.error('Error al actualizar'); return }
    setCitas(cs => cs.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c))
    toast.success('Estado actualizado')
  }

  // ── Conteo total del mes ─────────────────────────────────────────────────
  const totalMes     = citas.length
  const activasMes   = citas.filter(c => c.estado === 'reservada' || c.estado === 'confirmada').length
  const confirmMes   = citas.filter(c => c.estado === 'confirmada').length

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col xl:flex-row gap-4">

      {/* ── Panel izquierdo: calendario ── */}
      <div className="flex-1 min-w-0">

        {/* Resumen del mes */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total citas',    valor: totalMes,   color: 'text-foreground' },
            { label: 'Activas',        valor: activasMes, color: 'text-blue-600'   },
            { label: 'Confirmadas',    valor: confirmMes, color: 'text-green-600'  },
          ].map(s => (
            <div key={s.label} className="bg-card border border-card-border rounded-2xl px-4 py-3 text-center">
              <p className={cn('text-2xl font-black', s.color)}>{s.valor}</p>
              <p className="text-[11px] text-foreground-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Cabecera del mes */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button
              onClick={() => irMes(-1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-background-subtle transition-all text-foreground-muted hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h2 className="text-sm font-extrabold text-foreground capitalize">
              {MESES[month - 1]} {year}
            </h2>

            <button
              onClick={() => irMes(1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-background-subtle transition-all text-foreground-muted hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Encabezado días de semana */}
          <div className="grid grid-cols-7 border-b border-border bg-background-subtle">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2.5 text-center text-[10px] font-bold text-foreground-muted uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7">
            {celdas.map((dia, i) => {
              if (dia === null) {
                return (
                  <div
                    key={`vacio-${i}`}
                    className="min-h-[64px] sm:min-h-[80px] border-b border-r border-border bg-background-subtle/40"
                  />
                )
              }

              const citasDiaCelda = citasPorDia[dia] ?? []
              const activas        = citasDiaCelda.filter(c => c.estado === 'reservada' || c.estado === 'confirmada')
              const pendientes     = citasDiaCelda.filter(c => c.estado === 'pendiente')
              const seleccionado   = diaSeleccionado === dia
              const hoyFlag        = esHoy(dia)
              const tieneCitas     = citasDiaCelda.length > 0

              return (
                <button
                  key={dia}
                  onClick={() => setDia(dia === diaSeleccionado ? null : dia)}
                  className={cn(
                    'min-h-[64px] sm:min-h-[80px] p-1.5 sm:p-2 text-left border-b border-r border-border transition-all duration-150 relative flex flex-col',
                    seleccionado
                      ? 'bg-primary/10 ring-2 ring-inset ring-primary/30'
                      : tieneCitas
                        ? 'hover:bg-primary/5 cursor-pointer'
                        : 'hover:bg-background-subtle/80 cursor-pointer'
                  )}
                >
                  {/* Número del día */}
                  <span className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all flex-shrink-0',
                    hoyFlag
                      ? 'bg-primary text-white'
                      : seleccionado
                        ? 'text-primary font-black'
                        : 'text-foreground'
                  )}>
                    {dia}
                  </span>

                  {/* Puntos de citas + badge pendientes */}
                  {(activas.length > 0 || pendientes.length > 0) && (
                    <div className="flex flex-wrap gap-0.5 mt-1 items-center">
                      {/* Puntos activas (reservada=azul, confirmada=verde) */}
                      {activas.slice(0, 3).map(c => (
                        <span
                          key={c.id}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full flex-shrink-0',
                            c.estado === 'confirmada' ? 'bg-green-500' : 'bg-blue-500'
                          )}
                        />
                      ))}
                      {/* Contador si hay más de 3 activas */}
                      {activas.length > 3 && (
                        <span className="text-[8px] font-bold text-foreground-muted leading-none">
                          +{activas.length - 3}
                        </span>
                      )}
                      {/* Badge rojo con conteo de pendientes */}
                      {pendientes.length > 0 && (
                        <span className="ml-auto min-w-[14px] h-[14px] px-0.5 rounded-full bg-danger text-white text-[8px] font-black flex items-center justify-center leading-none flex-shrink-0">
                          {pendientes.length}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Total citas visible en pantallas grandes */}
                  {citasDiaCelda.length > 0 && (
                    <p className="hidden sm:block text-[9px] text-foreground-muted mt-auto pt-1 font-medium">
                      {citasDiaCelda.length} cita{citasDiaCelda.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 mt-3 px-1">
          {[
            { color: 'bg-green-500',  label: 'Confirmada' },
            { color: 'bg-blue-500',   label: 'Reservada'  },
            { color: 'bg-yellow-400', label: 'Pendiente'  },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', l.color)} />
              <span className="text-[11px] text-foreground-muted">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho: detalle del día ── */}
      <div className={cn(
        'xl:w-80 2xl:w-96 flex flex-col bg-card border border-card-border rounded-2xl overflow-hidden transition-all duration-300',
        diaSeleccionado ? 'opacity-100' : 'opacity-40 pointer-events-none'
      )}>
        {/* Cabecera panel */}
        <div className="flex items-start justify-between gap-2 px-4 py-3.5 border-b border-border">
          <div>
            {diaSeleccionado ? (
              <>
                <p className="text-sm font-extrabold text-foreground capitalize">
                  {new Date(year, month - 1, diaSeleccionado).toLocaleDateString('es-EC', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {citasDia.length} cita{citasDia.length !== 1 ? 's' : ''}
                  {filtro !== 'todos' && filtro !== 'activas'
                    ? ` · ${ESTADOS[filtro]?.etiqueta}`
                    : filtro === 'activas' ? ' · activas' : ''
                  }
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-foreground-muted">Selecciona un día</p>
            )}
          </div>
          {diaSeleccionado && (
            <button
              onClick={() => setDia(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background-subtle text-foreground-muted hover:text-foreground transition-all flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-none">
          {([
            { id: 'activas',    label: 'Activas'     },
            { id: 'todos',      label: 'Todas'        },
            { id: 'confirmada', label: 'Confirmadas'  },
            { id: 'reservada',  label: 'Reservadas'   },
            { id: 'pendiente',  label: 'Pendientes'   },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0',
                filtro === f.id
                  ? 'bg-primary text-white'
                  : 'text-foreground-muted hover:bg-background-subtle hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de citas */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-[240px]">
          {!diaSeleccionado ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-10 h-10 text-foreground-muted/20 mb-3" />
              <p className="text-sm font-medium text-foreground-muted">Selecciona un día</p>
              <p className="text-xs text-foreground-muted/70 mt-1">
                Haz clic en cualquier día del calendario
              </p>
            </div>
          ) : citasDia.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-10 h-10 text-foreground-muted/20 mb-3" />
              <p className="text-sm font-medium text-foreground">Sin citas</p>
              <p className="text-xs text-foreground-muted mt-1">
                No hay citas {filtro !== 'todos' ? `"${ESTADOS[filtro]?.etiqueta?.toLowerCase() ?? filtro}"` : ''} para este día
              </p>
            </div>
          ) : (
            citasDia.map(cita => {
              const estado = ESTADOS[cita.estado] ?? ESTADOS.pendiente
              const imgUrl = cita.producto.imagenes
                ?.sort((a, b) => a.orden - b.orden)[0]?.url ?? null

              return (
                <div
                  key={cita.id}
                  className="bg-background-subtle/60 border border-border rounded-xl p-3 flex flex-col gap-2.5"
                >
                  {/* Hora + Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-sm font-black text-primary font-mono tracking-tight">
                        {cita.hora_inicio.slice(0, 5)}
                      </span>
                      <span className="text-xs text-foreground-muted">–</span>
                      <span className="text-xs font-mono text-foreground-muted">
                        {cita.hora_fin.slice(0, 5)}
                      </span>
                    </div>

                    {/* Selector de estado */}
                    {actualizando === cita.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <div className="relative flex-shrink-0">
                        <select
                          value={cita.estado}
                          onChange={e => cambiarEstado(cita.id, e.target.value)}
                          className={cn(
                            'text-[9px] font-bold pl-2 pr-5 py-0.5 rounded-full border appearance-none cursor-pointer focus:outline-none uppercase tracking-wide',
                            estado.color
                          )}
                        >
                          {Object.entries(ESTADOS).map(([val, { etiqueta }]) => (
                            <option key={val} value={val}>{etiqueta}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Servicio */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-card border border-border overflow-hidden flex-shrink-0">
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl} alt={cita.producto.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 text-foreground-muted/30" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                      {cita.producto.nombre}
                    </p>
                  </div>

                  {/* Datos del cliente */}
                  {cita.pedido ? (
                    <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-foreground-muted flex-shrink-0" />
                          <span className="text-[11px] text-foreground font-medium truncate">
                            {cita.pedido.nombres}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-foreground-muted flex-shrink-0" />
                          <span className="text-[11px] text-foreground-muted">
                            {cita.pedido.whatsapp}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/${cita.pedido.whatsapp?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 flex items-center justify-center transition-all flex-shrink-0"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-2 text-[11px] text-foreground-muted italic text-center">
                      Sin datos de cliente
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
