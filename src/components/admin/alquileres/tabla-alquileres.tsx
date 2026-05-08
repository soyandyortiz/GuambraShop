'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Calendar, Package, Phone, CheckCircle2, 
  KeyRound, RotateCcw, XCircle, AlertTriangle, 
  ChevronDown, Eye, Filter, ArrowUpDown, Clock, 
  Trash2, Mail, ExternalLink, Loader2
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { cn, formatearPrecio } from '@/lib/utils'

const ESTADOS: Record<string, { etiqueta: string; color: string; icono: React.ReactNode }> = {
  reservado: { etiqueta: 'Reservado',  color: 'bg-blue-50 text-blue-700 border-blue-100', icono: <Calendar className="w-3 h-3" /> },
  activo:    { etiqueta: 'Activo',     color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icono: <KeyRound className="w-3 h-3" /> },
  vencido:   { etiqueta: 'Vencido',    color: 'bg-red-50 text-red-700 border-red-100', icono: <AlertTriangle className="w-3 h-3" /> },
  devuelto:  { etiqueta: 'Devuelto',   color: 'bg-gray-50 text-gray-600 border-gray-100', icono: <RotateCcw className="w-3 h-3" /> },
  cancelado: { etiqueta: 'Cancelado',  color: 'bg-red-50 text-red-700 border-red-100', icono: <XCircle className="w-3 h-3" /> },
}

interface AlquilerExt {
  id: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  cantidad: number
  hora_recogida: string | null
  estado: string
  creado_en: string
  producto: {
    id: string
    nombre: string
    precio: number
    imagenes_producto: { url: string; orden: number }[]
  }
  pedido: {
    numero_orden: string
    nombres: string
    email: string
    whatsapp: string
  } | null
}

interface Props { alquileres: AlquilerExt[] }

type OrdenSort = 'proximo_vencimiento' | 'reciente' | 'cliente' | 'producto'

export function TablaAlquileres({ alquileres: alqInit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [alquileres, setAlquileres] = useState<AlquilerExt[]>(alqInit)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string | 'todos'>('todos')
  const [orden, setOrden] = useState<OrdenSort>('proximo_vencimiento')
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    let result = alquileres
    
    if (filtroEstado !== 'todos') {
      result = result.filter(a => a.estado === filtroEstado)
    }

    const texto = busqueda.toLowerCase().trim()
    if (texto) {
      result = result.filter(a => 
        (a.pedido?.numero_orden ?? '').toLowerCase().includes(texto) ||
        (a.pedido?.nombres ?? '').toLowerCase().includes(texto) ||
        a.producto.nombre.toLowerCase().includes(texto) ||
        (a.pedido?.whatsapp ?? '').includes(texto)
      )
    }

    return [...result].sort((a, b) => {
      switch (orden) {
        case 'reciente':
          return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        case 'proximo_vencimiento':
          return new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime()
        case 'cliente':
          return (a.pedido?.nombres ?? '').localeCompare(b.pedido?.nombres ?? '')
        case 'producto':
          return a.producto.nombre.localeCompare(b.producto.nombre)
        default: return 0
      }
    })
  }, [alquileres, filtroEstado, busqueda, orden])

  const counts = useMemo(() => ({
    todos: alquileres.length,
    reservado: alquileres.filter(a => a.estado === 'reservado').length,
    activo: alquileres.filter(a => a.estado === 'activo').length,
    vencido: alquileres.filter(a => a.estado === 'vencido').length,
    devuelto: alquileres.filter(a => a.estado === 'devuelto').length,
  }), [alquileres])

  async function cambiarEstado(id: string, nuevoEstado: string) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('alquileres')
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar el alquiler')
      setActualizando(null)
      return
    }

    setAlquileres(prev => prev.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a))
    toast.success('Estado actualizado')
    setActualizando(null)
    startTransition(() => router.refresh())
  }

  const fmtFecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4">
      
      {/* ══ PESTAÑAS DE ESTADO ══ */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs border-b border-border pb-1">
        {[
          { id: 'todos', label: 'Todos', count: counts.todos },
          { id: 'reservado', label: 'Reservados', count: counts.reservado },
          { id: 'activo', label: 'En uso (Activos)', count: counts.activo },
          { id: 'vencido', label: 'Vencidos ⚠️', count: counts.vencido },
          { id: 'devuelto', label: 'Devueltos', count: counts.devuelto },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroEstado(tab.id)}
            className={cn(
              'pb-2 px-1 transition-all relative font-medium',
              filtroEstado === tab.id ? 'text-primary' : 'text-foreground-muted hover:text-foreground',
              tab.id === 'vencido' && tab.count > 0 && filtroEstado !== 'vencido' ? 'text-red-500 animate-pulse' : ''
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
              <option value="proximo_vencimiento">Próximos a vencer</option>
              <option value="reciente">Recién alquilados</option>
              <option value="cliente">Cliente A-Z</option>
              <option value="producto">Producto A-Z</option>
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
            placeholder="Buscar por orden, cliente o artículo..."
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
                <th className="px-4 py-3">Artículo</th>
                <th className="px-4 py-3">Cliente / Orden</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total Alquiler</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-foreground-muted">
                    <div className="flex flex-col items-center gap-2">
                      <KeyRound className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">No hay alquileres registrados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map(alq => {
                  const cfg = ESTADOS[alq.estado] ?? { etiqueta: alq.estado, color: 'bg-gray-100 text-gray-600 border-gray-200', icono: null }
                  const imagen = [...(alq.producto.imagenes_producto ?? [])].sort((a, b) => a.orden - b.orden)[0]?.url ?? null
                  const total = alq.producto.precio * alq.dias * alq.cantidad

                  return (
                    <tr key={alq.id} className="hover:bg-background-subtle/30 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-background-subtle border border-border flex-shrink-0">
                            {imagen ? (
                              <img src={imagen} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-20">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-foreground truncate max-w-[200px]">{alq.producto.nombre}</span>
                            <span className="text-[10px] text-foreground-muted mt-0.5 uppercase tracking-tighter">
                              {alq.cantidad} {alq.cantidad === 1 ? 'unidad' : 'unidades'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{alq.pedido?.nombres ?? 'Venta directa'}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {alq.pedido && (
                              <span className="text-[10px] font-bold text-primary font-mono">
                                #{alq.pedido.numero_orden}
                              </span>
                            )}
                            <span className="text-[10px] text-foreground-muted">
                              {alq.pedido?.whatsapp}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <span>{fmtFecha(alq.fecha_inicio)}</span>
                            <span className="text-foreground-muted">→</span>
                            <span className={cn(alq.estado === 'vencido' ? 'text-red-600' : '')}>{fmtFecha(alq.fecha_fin)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {alq.dias} días
                            </span>
                            {alq.hora_recogida && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                Retiro: {alq.hora_recogida.slice(0, 5)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative group/status w-fit">
                          <select
                            value={alq.estado}
                            onChange={e => cambiarEstado(alq.id, e.target.value)}
                            disabled={actualizando === alq.id}
                            className={cn(
                              'appearance-none h-8 pl-3 pr-8 rounded-lg border text-[11px] font-bold transition-all cursor-pointer focus:outline-none',
                              cfg.color
                            )}
                          >
                            {['reservado', 'activo', 'vencido', 'devuelto', 'cancelado'].map(val => (
                              <option key={val} value={val}>{ESTADOS[val].etiqueta}</option>
                            ))}
                          </select>
                          {actualizando === alq.id ? (
                            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin opacity-50" />
                          ) : (
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 group-hover/status:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-foreground">
                          {formatearPrecio(total)}
                        </p>
                        <p className="text-[10px] text-foreground-muted mt-0.5">
                          {formatearPrecio(alq.producto.precio)} / día
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Ver detalles"
                            onClick={() => setModalAbierto(alq.id)}
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {alq.pedido?.whatsapp && (
                            <a
                              href={`https://wa.me/${alq.pedido.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              title="Contactar WhatsApp"
                              className="w-8 h-8 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/20 transition-all shadow-sm"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
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
            {alquileres.filter(a => a.id === modalAbierto).map(alq => {
              const imagen = [...(alq.producto.imagenes_producto ?? [])].sort((a, b) => a.orden - b.orden)[0]?.url ?? null
              return (
                <div key={alq.id}>
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Detalle del Alquiler</h3>
                      <p className="text-xs text-foreground-muted">Creado el {new Date(alq.creado_en).toLocaleString('es-EC')}</p>
                    </div>
                    <button 
                      onClick={() => setModalAbierto(null)}
                      className="p-2 hover:bg-background-subtle rounded-xl transition-colors"
                    >
                      <XCircle className="w-5 h-5 text-foreground-muted" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Producto */}
                    <div className="flex gap-4 p-4 bg-background-subtle rounded-2xl">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-card border border-border flex-shrink-0">
                        {imagen ? (
                          <img src={imagen} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{alq.producto.nombre}</p>
                        <p className="text-xs text-foreground-muted mt-1">Cantidad: {alq.cantidad} unidades</p>
                        <p className="text-xs font-bold text-primary mt-1">{formatearPrecio(alq.producto.precio)} / día</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Cliente</p>
                        <p className="text-sm font-semibold text-foreground">{alq.pedido?.nombres ?? 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Orden</p>
                        <p className="text-sm font-bold text-primary font-mono">{alq.pedido ? `#${alq.pedido.numero_orden}` : 'Venta Directa'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">WhatsApp</p>
                        <p className="text-sm font-semibold text-foreground">{alq.pedido?.whatsapp ?? 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Email</p>
                        <p className="text-sm font-semibold text-foreground truncate">{alq.pedido?.email ?? 'N/A'}</p>
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-foreground-muted uppercase">Fecha Inicio</p>
                          <p className="text-xs font-semibold">{fmtFecha(alq.fecha_inicio)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <RotateCcw className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-[10px] font-bold text-foreground-muted uppercase">Fecha Fin</p>
                          <p className="text-xs font-semibold">{fmtFecha(alq.fecha_fin)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-foreground-muted uppercase">Duración</p>
                          <p className="text-xs font-semibold">{alq.dias} días de alquiler</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-foreground-muted uppercase">Entrega</p>
                          <p className="text-xs font-semibold">{alq.hora_recogida ? `A las ${alq.hora_recogida.slice(0,5)}` : 'Por definir'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">Total del Alquiler</p>
                      <p className="text-2xl font-black text-primary">
                        {formatearPrecio(alq.producto.precio * alq.dias * alq.cantidad)}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-border bg-background-subtle/50 flex gap-3">
                    {alq.pedido?.whatsapp && (
                      <a
                        href={`https://wa.me/${alq.pedido.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        className="flex-1 h-11 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#22c55e] transition-all"
                      >
                        <MessageCircle className="w-5 h-5" /> Contactar WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => setModalAbierto(null)}
                      className="h-11 px-6 rounded-xl border border-input-border bg-card text-sm font-semibold text-foreground hover:bg-background transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ ESTADÍSTICAS RÁPIDAS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-2">
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Reservados</p>
            <p className="text-lg font-bold text-foreground">{counts.reservado}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">En uso (Activos)</p>
            <p className="text-lg font-bold text-emerald-600">{counts.activo}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Vencidos</p>
            <p className="text-lg font-bold text-red-600">{counts.vencido}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Devueltos</p>
            <p className="text-lg font-bold text-primary">{counts.devuelto}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
