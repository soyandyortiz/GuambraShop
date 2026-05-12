'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  Pencil, Trash2, Eye, EyeOff, Ticket,
  Copy, Search,
  Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, BarChart3, Tag, CalendarDays, CalendarClock,
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Cupon {
  id:              string
  codigo:          string
  tipo_descuento:  'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima:   number | null
  max_usos:        number | null
  usos_actuales:   number
  esta_activo:     boolean
  inicia_en:       string | null
  vence_en:        string | null
}

interface Props { cupones: Cupon[] }

type EstadoId = 'activo' | 'programado' | 'agotado' | 'vencido' | 'inactivo'

function estadoCupon(c: Cupon): { id: EstadoId; label: string; clase: string } {
  if (!c.esta_activo)
    return { id: 'inactivo',   label: 'Inactivo',    clase: 'bg-gray-100 text-gray-500 border-gray-200' }
  const now = new Date()
  if (c.vence_en  && new Date(c.vence_en)  < now)
    return { id: 'vencido',    label: 'Vencido',     clase: 'bg-red-50 text-red-600 border-red-100' }
  if (c.max_usos  && c.usos_actuales >= c.max_usos)
    return { id: 'agotado',    label: 'Agotado',     clase: 'bg-amber-50 text-amber-600 border-amber-100' }
  if (c.inicia_en && new Date(c.inicia_en) > now)
    return { id: 'programado', label: 'Programado',  clase: 'bg-blue-50 text-blue-600 border-blue-200' }
  return   { id: 'activo',     label: 'Activo',      clase: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const TABS: { id: string; label: string }[] = [
  { id: 'todos',       label: 'Todos'      },
  { id: 'activo',      label: 'Activos'    },
  { id: 'programado',  label: 'Programados'},
  { id: 'agotado',     label: 'Agotados'   },
  { id: 'vencido',     label: 'Vencidos'   },
  { id: 'inactivo',    label: 'Inactivos'  },
]

export function ListaCuponesAdmin({ cupones: init }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [cupones, setCupones]         = useState<Cupon[]>(init)
  const [busqueda, setBusqueda]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [actualizando, setActualizando] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    let r = cupones
    if (filtroEstado !== 'todos') r = r.filter(c => estadoCupon(c).id === filtroEstado)
    const t = busqueda.toLowerCase().trim()
    if (t) r = r.filter(c => c.codigo.toLowerCase().includes(t))
    return r
  }, [cupones, filtroEstado, busqueda])

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: cupones.length }
    TABS.slice(1).forEach(tab => {
      map[tab.id] = cupones.filter(c => estadoCupon(c).id === tab.id).length
    })
    return map
  }, [cupones])

  async function toggleActivo(id: string, activo: boolean) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('cupones').update({ esta_activo: !activo }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); setActualizando(null); return }
    setCupones(prev => prev.map(c => c.id === id ? { ...c, esta_activo: !activo } : c))
    toast.success(activo ? 'Cupón desactivado' : 'Cupón activado')
    setActualizando(null)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, codigo: string) {
    if (!confirm(`¿Eliminar definitivamente el cupón "${codigo}"?`)) return
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('cupones').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar'); return }
    setCupones(prev => prev.filter(c => c.id !== id))
    toast.success('Cupón eliminado')
    startTransition(() => router.refresh())
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success(`Código "${codigo}" copiado`)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ══ PESTAÑAS ══ */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs border-b border-border pb-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setFiltroEstado(tab.id)}
            className={cn(
              'pb-2 px-1 transition-all relative font-medium whitespace-nowrap',
              filtroEstado === tab.id ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            )}>
            {tab.label}
            {counts[tab.id] !== undefined && (
              <span className="ml-1 opacity-50">({counts[tab.id]})</span>
            )}
            {filtroEstado === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ══ BARRA DE BÚSQUEDA + NUEVO ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Link href="/admin/dashboard/cupones/nuevo"
          className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all flex-shrink-0">
          <Tag className="w-4 h-4" /> Nuevo cupón
        </Link>
      </div>

      {/* ══ TABLA ══ */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Descuento</th>
                <th className="px-6 py-4">Uso</th>
                <th className="px-6 py-4">Vigencia</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Ticket className="w-12 h-12" />
                      <p className="text-sm font-bold">No se encontraron cupones</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map(cupon => {
                  const { label, clase } = estadoCupon(cupon)
                  const pct = cupon.max_usos ? (cupon.usos_actuales / cupon.max_usos) * 100 : 0
                  const ahora = new Date()
                  const iniciado = !cupon.inicia_en || new Date(cupon.inicia_en) <= ahora
                  const vencido  = !!cupon.vence_en && new Date(cupon.vence_en) < ahora

                  return (
                    <tr key={cupon.id} className={cn(
                      'group transition-colors hover:bg-background-subtle/30',
                      !cupon.esta_activo && 'opacity-60'
                    )}>
                      {/* Código */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                            cupon.esta_activo ? 'bg-primary/10 text-primary' : 'bg-background-subtle text-foreground-muted'
                          )}>
                            <Tag className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground font-mono tracking-widest">{cupon.codigo}</span>
                            <button onClick={() => copiar(cupon.codigo)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-foreground-muted hover:text-primary transition-all"
                              title="Copiar código">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Descuento */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">
                            {cupon.tipo_descuento === 'porcentaje'
                              ? `${cupon.valor_descuento}% OFF`
                              : `${formatearPrecio(cupon.valor_descuento)} dto.`}
                          </span>
                          {cupon.compra_minima && (
                            <span className="text-[10px] text-foreground-muted font-medium mt-0.5">
                              Min. {formatearPrecio(cupon.compra_minima)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Uso */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-bold text-foreground-muted">
                            <span>{cupon.usos_actuales} usos</span>
                            {cupon.max_usos && <span>/ {cupon.max_usos}</span>}
                          </div>
                          {cupon.max_usos ? (
                            <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden">
                              <div className={cn(
                                'h-full transition-all duration-500',
                                pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary'
                              )} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold italic">Ilimitados</span>
                          )}
                        </div>
                      </td>

                      {/* Vigencia */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {cupon.inicia_en && (
                            <div className={cn(
                              'flex items-center gap-1.5 font-medium',
                              !iniciado ? 'text-blue-600' : 'text-foreground-muted'
                            )}>
                              <CalendarDays className="w-3 h-3 flex-shrink-0" />
                              <span>Desde {formatFecha(cupon.inicia_en)}</span>
                            </div>
                          )}
                          {cupon.vence_en ? (
                            <div className={cn(
                              'flex items-center gap-1.5 font-medium',
                              vencido ? 'text-red-600' : 'text-foreground-muted'
                            )}>
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>Hasta {formatFecha(cupon.vence_en)}</span>
                            </div>
                          ) : (
                            !cupon.inicia_en && (
                              <span className="text-foreground-muted italic">Sin límite</span>
                            )
                          )}
                          {cupon.inicia_en && !cupon.vence_en && (
                            <div className="flex items-center gap-1.5 text-foreground-muted italic">
                              <CalendarClock className="w-3 h-3 flex-shrink-0" />
                              <span>Sin vencimiento</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleActivo(cupon.id, cupon.esta_activo)}
                          disabled={actualizando === cupon.id}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all',
                            clase
                          )}
                        >
                          {actualizando === cupon.id
                            ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            : cupon.esta_activo
                              ? <Eye className="w-2.5 h-2.5" />
                              : <EyeOff className="w-2.5 h-2.5" />}
                          {label}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-foreground-muted">
                          <Link href={`/admin/dashboard/cupones/${cupon.id}`} title="Editar"
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:text-foreground hover:border-border-strong transition-all shadow-sm">
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => eliminar(cupon.id, cupon.codigo)} title="Eliminar"
                            className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all shadow-sm">
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

      {/* ══ ESTADÍSTICAS ══ */}
      {cupones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
          {[
            { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10',
              label: 'Activos',       value: counts.activo  },
            { icon: <CalendarDays className="w-4 h-4 text-blue-500" />,    bg: 'bg-blue-500/10',
              label: 'Programados',   value: counts.programado },
            { icon: <BarChart3  className="w-4 h-4 text-primary" />,       bg: 'bg-primary/10',
              label: 'Usos totales',  value: cupones.reduce((a, c) => a + c.usos_actuales, 0) },
            { icon: <XCircle    className="w-4 h-4 text-red-600" />,       bg: 'bg-red-500/10',
              label: 'Vencidos/Agot', value: counts.vencido + counts.agotado },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                {s.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground-muted uppercase">{s.label}</p>
                <p className="text-lg font-black text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
