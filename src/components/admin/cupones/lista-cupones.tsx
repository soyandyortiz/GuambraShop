'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { 
  Pencil, Trash2, Eye, EyeOff, Ticket, 
  Copy, Search, Filter, ArrowUpDown, 
  Clock, CheckCircle2, XCircle, AlertTriangle,
  MoreHorizontal, Loader2, BarChart3, Tag
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Cupon {
  id: string
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima: number | null
  max_usos: number | null
  usos_actuales: number
  esta_activo: boolean
  vence_en: string | null
}

interface Props { cupones: Cupon[] }

function estadoCupon(c: Cupon): { id: string; label: string; clase: string } {
  if (!c.esta_activo) return { id: 'inactivo', label: 'Inactivo', clase: 'bg-gray-100 text-gray-500 border-gray-200' }
  if (c.vence_en && new Date(c.vence_en) < new Date()) return { id: 'vencido', label: 'Vencido', clase: 'bg-red-50 text-red-600 border-red-100' }
  if (c.max_usos && c.usos_actuales >= c.max_usos) return { id: 'agotado', label: 'Agotado', clase: 'bg-amber-50 text-amber-600 border-amber-100' }
  return { id: 'activo', label: 'Activo', clase: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
}

export function ListaCuponesAdmin({ cupones: alqInit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cupones, setCupones] = useState<Cupon[]>(alqInit)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string | 'todos'>('todos')
  const [actualizando, setActualizando] = useState<string | null>(null)

  // Filtrado
  const filtrados = useMemo(() => {
    let result = cupones
    
    if (filtroEstado !== 'todos') {
      result = result.filter(c => estadoCupon(c).id === filtroEstado)
    }

    const texto = busqueda.toLowerCase().trim()
    if (texto) {
      result = result.filter(c => 
        c.codigo.toLowerCase().includes(texto)
      )
    }

    return result
  }, [cupones, filtroEstado, busqueda])

  const counts = useMemo(() => ({
    todos: cupones.length,
    activo: cupones.filter(c => estadoCupon(c).id === 'activo').length,
    agotado: cupones.filter(c => estadoCupon(c).id === 'agotado').length,
    vencido: cupones.filter(c => estadoCupon(c).id === 'vencido').length,
    inactivo: cupones.filter(c => estadoCupon(c).id === 'inactivo').length,
  }), [cupones])

  async function toggleActivo(id: string, activo: boolean) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('cupones').update({ esta_activo: !activo }).eq('id', id)
    
    if (error) {
      toast.error('Error al actualizar')
      setActualizando(null)
      return
    }

    setCupones(prev => prev.map(c => c.id === id ? { ...c, esta_activo: !activo } : c))
    toast.success(activo ? 'Cupón desactivado' : 'Cupón activado')
    setActualizando(null)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, codigo: string) {
    if (!confirm(`¿Eliminar definitivamente el cupón "${codigo}"?`)) return
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('cupones').delete().eq('id', id)
    
    if (error) {
      toast.error('No se pudo eliminar')
      return
    }

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
      
      {/* ══ PESTAÑAS DE ESTADO ══ */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs border-b border-border pb-1">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'activo', label: 'En uso (Activos)' },
          { id: 'agotado', label: 'Agotados' },
          { id: 'vencido', label: 'Vencidos' },
          { id: 'inactivo', label: 'Inactivos' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroEstado(tab.id)}
            className={cn(
              'pb-2 px-1 transition-all relative font-medium',
              filtroEstado === tab.id ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {tab.label} <span className="opacity-50">({counts[tab.id as keyof typeof counts]})</span>
            {filtroEstado === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* ══ BARRA DE ACCIONES ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código de cupón..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* ══ TABLA DE CUPONES ══ */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Descuento</th>
                <th className="px-6 py-4">Uso / Rendimiento</th>
                <th className="px-6 py-4">Vencimiento</th>
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
                  const porcentajeUso = cupon.max_usos ? (cupon.usos_actuales / cupon.max_usos) * 100 : 0
                  
                  return (
                    <tr key={cupon.id} className={cn(
                      'group transition-colors hover:bg-background-subtle/30',
                      !cupon.esta_activa && 'opacity-60'
                    )}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                            cupon.esta_activa ? 'bg-primary/10 text-primary' : 'bg-background-subtle text-foreground-muted'
                          )}>
                            <Tag className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground font-mono tracking-widest uppercase">{cupon.codigo}</span>
                            <button 
                              onClick={() => copiar(cupon.codigo)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-foreground-muted hover:text-primary transition-all"
                              title="Copiar código"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">
                            {cupon.tipo_descuento === 'porcentaje' 
                              ? `${cupon.valor_descuento}% OFF` 
                              : `${formatearPrecio(cupon.valor_descuento)} de descuento`}
                          </span>
                          {cupon.compra_minima && (
                            <span className="text-[10px] text-foreground-muted font-medium mt-0.5">
                              Min. compra {formatearPrecio(cupon.compra_minima)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-bold text-foreground-muted">
                            <span>{cupon.usos_actuales} usos</span>
                            {cupon.max_usos && <span>meta {cupon.max_usos}</span>}
                          </div>
                          {cupon.max_usos ? (
                            <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-500",
                                  porcentajeUso > 90 ? 'bg-red-500' : porcentajeUso > 70 ? 'bg-amber-500' : 'bg-primary'
                                )}
                                style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter italic">Usos ilimitados</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cupon.vence_en ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Clock className={cn("w-3.5 h-3.5", new Date(cupon.vence_en) < new Date() ? 'text-red-500' : 'text-foreground-muted')} />
                            <span className={cn(new Date(cupon.vence_en) < new Date() ? 'text-red-600' : '')}>
                              {new Date(cupon.vence_en).toLocaleDateString('es-EC')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground-muted italic">Sin vencimiento</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleActivo(cupon.id, cupon.esta_activo)}
                          disabled={actualizando === cupon.id}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all',
                            clase
                          )}
                        >
                          {actualizando === cupon.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : cupon.esta_activa ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          {label}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-foreground-muted">
                          <Link
                            href={`/admin/dashboard/cupones/${cupon.id}`}
                            title="Editar"
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:text-foreground hover:border-border-strong transition-all shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => eliminar(cupon.id, cupon.codigo)}
                            title="Eliminar"
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

      {/* ══ FOOTER INFO ══ */}
      {filtrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-foreground-muted uppercase">Cupones Activos</p>
              <p className="text-lg font-black text-foreground">{counts.activo}</p>
            </div>
          </div>
          <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-foreground-muted uppercase">Usos Totales</p>
              <p className="text-lg font-black text-foreground">
                {cupones.reduce((acc, c) => acc + c.usos_actuales, 0)}
              </p>
            </div>
          </div>
          <div className="bg-card border border-card-border p-4 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-foreground-muted uppercase">Vencidos/Agotados</p>
              <p className="text-lg font-black text-red-600">{counts.vencido + counts.agotado}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
