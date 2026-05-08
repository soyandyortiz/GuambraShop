'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { 
  Pencil, Trash2, Eye, EyeOff, Megaphone, 
  LayoutTemplate, Calendar, Search, Filter, 
  ArrowUpDown, XCircle, CheckCircle2, Clock,
  MoreHorizontal, Loader2, Image as ImageIcon
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Promocion {
  id: string
  nombre: string
  descripcion: string | null
  precio: number | null
  imagen_url: string
  formato_imagen: 'cuadrado' | 'horizontal' | 'vertical'
  esta_activa: boolean
  inicia_en: string | null
  termina_en: string | null
}

interface Props { promociones: Promocion[] }

const FORMATO_LABEL = {
  cuadrado: '1:1',
  horizontal: '16:9',
  vertical: '9:16',
}

function estadoPromocion(p: Promocion): { label: string; clase: string; id: string } {
  const ahora = new Date()
  if (!p.esta_activa) return { id: 'inactiva', label: 'Inactiva', clase: 'bg-gray-100 text-gray-500 border-gray-200' }
  if (p.termina_en && new Date(p.termina_en) < ahora) return { id: 'vencida', label: 'Vencida', clase: 'bg-red-50 text-red-600 border-red-100' }
  if (p.inicia_en && new Date(p.inicia_en) > ahora) return { id: 'programada', label: 'Programada', clase: 'bg-amber-50 text-amber-600 border-amber-100' }
  return { id: 'activa', label: 'Activa', clase: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
}

export function ListaPromocionesAdmin({ promociones: alqInit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [promociones, setPromociones] = useState<Promocion[]>(alqInit)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string | 'todas'>('todas')
  const [preview, setPreview] = useState<Promocion | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)

  // Filtrado
  const filtradas = useMemo(() => {
    let result = promociones
    
    if (filtroEstado !== 'todas') {
      result = result.filter(p => estadoPromocion(p).id === filtroEstado)
    }

    const texto = busqueda.toLowerCase().trim()
    if (texto) {
      result = result.filter(p => 
        p.nombre.toLowerCase().includes(texto) ||
        (p.descripcion ?? '').toLowerCase().includes(texto)
      )
    }

    return result
  }, [promociones, filtroEstado, busqueda])

  const counts = useMemo(() => ({
    todas: promociones.length,
    activa: promociones.filter(p => estadoPromocion(p).id === 'activa').length,
    programada: promociones.filter(p => estadoPromocion(p).id === 'programada').length,
    vencida: promociones.filter(p => estadoPromocion(p).id === 'vencida').length,
    inactiva: promociones.filter(p => estadoPromocion(p).id === 'inactiva').length,
  }), [promociones])

  async function toggleActiva(id: string, activa: boolean) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('promociones').update({ esta_activa: !activa }).eq('id', id)
    
    if (error) {
      toast.error('Error al actualizar')
      setActualizando(null)
      return
    }

    setPromociones(prev => prev.map(p => p.id === id ? { ...p, esta_activa: !activa } : p))
    toast.success(activa ? 'Promoción desactivada' : 'Promoción activada')
    setActualizando(null)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar definitivamente la promoción "${nombre}"?`)) return
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('promociones').delete().eq('id', id)
    
    if (error) {
      toast.error('No se pudo eliminar')
      return
    }

    setPromociones(prev => prev.filter(p => p.id !== id))
    toast.success('Promoción eliminada')
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      
      {/* ══ PESTAÑAS DE ESTADO ══ */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs border-b border-border pb-1">
        {[
          { id: 'todas', label: 'Todas' },
          { id: 'activa', label: 'En curso (Activas)' },
          { id: 'programada', label: 'Programadas' },
          { id: 'vencida', label: 'Vencidas' },
          { id: 'inactiva', label: 'Inactivas' },
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
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* ══ TABLA DE PROMOCIONES ══ */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Preview</th>
                <th className="px-6 py-4">Promoción</th>
                <th className="px-6 py-4">Vigencia</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Megaphone className="w-12 h-12" />
                      <p className="text-sm font-bold">No se encontraron promociones</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map(promo => {
                  const { label, clase } = estadoPromocion(promo)
                  return (
                    <tr key={promo.id} className={cn(
                      'group transition-colors hover:bg-background-subtle/30',
                      !promo.esta_activa && 'opacity-60'
                    )}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setPreview(promo)}
                          className={cn(
                            'overflow-hidden rounded-lg border border-border bg-background-subtle shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-zoom-in',
                            promo.formato_imagen === 'cuadrado' && 'w-12 h-12',
                            promo.formato_imagen === 'horizontal' && 'w-16 h-10',
                            promo.formato_imagen === 'vertical' && 'w-8 h-12',
                          )}
                        >
                          <img src={promo.imagen_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{promo.nombre}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                              <LayoutTemplate className="w-2.5 h-2.5" />
                              {promo.formato_imagen} ({FORMATO_LABEL[promo.formato_imagen]})
                            </span>
                            {promo.precio && (
                              <span className="text-[10px] font-bold text-primary">
                                {formatearPrecio(promo.precio)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(promo.inicia_en || promo.termina_en) ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <span>{promo.inicia_en ? new Date(promo.inicia_en).toLocaleDateString('es-EC') : 'Inicio'}</span>
                              <span className="text-foreground-muted opacity-50">→</span>
                              <span>{promo.termina_en ? new Date(promo.termina_en).toLocaleDateString('es-EC') : 'Fin'}</span>
                            </div>
                            <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> Programada
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-foreground-muted italic">Sin límite de tiempo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleActiva(promo.id, promo.esta_activa)}
                          disabled={actualizando === promo.id}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all',
                            clase
                          )}
                        >
                          {actualizando === promo.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : promo.esta_activa ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          {label}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-foreground-muted">
                          <button
                            onClick={() => setPreview(promo)}
                            title="Previsualizar"
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/admin/dashboard/promociones/${promo.id}`}
                            title="Editar"
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:text-foreground hover:border-border-strong transition-all shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => eliminar(promo.id, promo.nombre)}
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

      {/* ══ MODAL PREVIEW ══ */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-card rounded-2xl overflow-hidden shadow-2xl max-w-[340px] w-full animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className={cn(
              'w-full overflow-hidden bg-background-subtle relative group',
              preview.formato_imagen === 'cuadrado' && 'aspect-square',
              preview.formato_imagen === 'horizontal' && 'aspect-video',
              preview.formato_imagen === 'vertical' && 'aspect-[9/16] max-h-[500px]',
            )}>
              <img src={preview.imagen_url} alt="" className="w-full h-full object-cover" />
              <button 
                onClick={() => setPreview(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <h4 className="text-base font-bold text-foreground leading-tight">{preview.nombre}</h4>
              {preview.descripcion && <p className="text-xs text-foreground-muted mt-2 leading-relaxed">{preview.descripcion}</p>}
              {preview.precio && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-lg font-black text-primary">{formatearPrecio(preview.precio)}</p>
                  <div className="h-8 px-4 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center">
                    VER OFERTA
                  </div>
                </div>
              )}
              {!preview.precio && (
                <button
                  onClick={() => setPreview(null)}
                  className="mt-4 w-full h-10 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  ENTENDIDO
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ FOOTER INFO ══ */}
      {filtradas.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-xs text-foreground-muted mt-2">
          <p>{filtradas.length} promociones en esta vista</p>
          <span>•</span>
          <p>{counts.activa} activas actualmente</p>
        </div>
      )}

    </div>
  )
}
