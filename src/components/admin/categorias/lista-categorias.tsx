'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, EyeOff, FolderOpen, ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { useDemoDatos } from '@/hooks/usar-demo-datos'

interface CategoriaFila {
  id: string
  nombre: string
  slug: string
  parent_id: string | null
  imagen_url: string | null
  esta_activa: boolean
  orden: number
  subcategorias?: CategoriaFila[]
}

interface Props {
  categorias: CategoriaFila[]
}

export function ListaCategoriasAdmin({ categorias: categoriasServidor }: Props) {
  const categorias = useDemoDatos<CategoriaFila>('categorias', categoriasServidor)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const padres = categorias.filter(c => !c.parent_id).sort((a, b) => a.orden - b.orden)
  const hijos  = categorias.filter(c => c.parent_id)

  function subcatsDe(padreId: string) {
    return hijos.filter(c => c.parent_id === padreId).sort((a, b) => a.orden - b.orden)
  }

  function toggleExpandida(id: string) {
    setExpandidas(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function toggleActiva(id: string, activa: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('categorias').update({ esta_activa: !activa }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, nombre: string) {
    const subcats = hijos.filter(c => c.parent_id === id)
    if (subcats.length > 0) {
      alert(`"${nombre}" tiene ${subcats.length} subcategoría(s). Elimínalas primero.`)
      return
    }
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('categorias').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  if (padres.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
        <FolderOpen className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">Sin categorías</p>
        <p className="text-xs text-foreground-muted mt-1">Crea tu primera categoría</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Grid de categorías padre */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {padres.map(padre => {
          const subcats   = subcatsDe(padre.id)
          const expandida = expandidas.has(padre.id)

          return (
            <div key={padre.id} className="flex flex-col gap-2">
              {/* Card categoría padre */}
              <div className={cn(
                'rounded-xl border bg-card overflow-hidden flex flex-col',
                padre.esta_activa ? 'border-card-border' : 'border-border opacity-60'
              )}>
                {/* Imagen */}
                <div className="aspect-square bg-background-subtle w-full overflow-hidden">
                  {padre.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={padre.imagen_url}
                      alt={padre.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-8 h-8 text-foreground-muted/30" />
                    </div>
                  )}
                </div>

                {/* Info + acciones */}
                <div className="p-2 flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                    {padre.nombre}
                  </p>

                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                      padre.esta_activa
                        ? 'bg-success/10 text-success'
                        : 'bg-foreground-muted/10 text-foreground-muted'
                    )}>
                      {padre.esta_activa ? 'Activa' : 'Inactiva'}
                    </span>
                    {subcats.length > 0 && (
                      <span className="text-[9px] text-foreground-muted font-medium">
                        {subcats.length} sub
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 pt-0.5 border-t border-border">
                    <button
                      onClick={() => toggleActiva(padre.id, padre.esta_activa)}
                      title={padre.esta_activa ? 'Desactivar' : 'Activar'}
                      className={cn(
                        'flex-1 h-6 rounded-md flex items-center justify-center transition-colors',
                        padre.esta_activa
                          ? 'text-success hover:bg-success/10'
                          : 'text-foreground-muted hover:bg-background-subtle'
                      )}
                    >
                      {padre.esta_activa
                        ? <Eye className="w-3 h-3" />
                        : <EyeOff className="w-3 h-3" />}
                    </button>
                    <Link
                      href={`/admin/dashboard/categorias/${padre.id}`}
                      className="flex-1 h-6 rounded-md flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-background-subtle transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => eliminar(padre.id, padre.nombre)}
                      className="flex-1 h-6 rounded-md flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón expandir subcategorías */}
              {subcats.length > 0 && (
                <button
                  onClick={() => toggleExpandida(padre.id)}
                  className="flex items-center justify-center gap-1 text-[10px] text-foreground-muted hover:text-primary transition-colors py-0.5"
                >
                  <ChevronDown className={cn('w-3 h-3 transition-transform', expandida && 'rotate-180')} />
                  {expandida ? 'Ocultar' : `${subcats.length} subcategorías`}
                </button>
              )}
              {subcats.length === 0 && (
                <Link
                  href={`/admin/dashboard/categorias/nueva?parent=${padre.id}`}
                  className="flex items-center justify-center gap-1 text-[10px] text-foreground-muted hover:text-primary transition-colors py-0.5"
                >
                  <Plus className="w-3 h-3" /> Agregar sub
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Subcategorías expandidas — debajo del grid */}
      {padres.map(padre => {
        const subcats   = subcatsDe(padre.id)
        const expandida = expandidas.has(padre.id)
        if (!expandida || subcats.length === 0) return null

        return (
          <div key={`sub-${padre.id}`} className="rounded-2xl border border-border bg-background-subtle p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">
                Subcategorías de &ldquo;{padre.nombre}&rdquo;
              </p>
              <Link
                href={`/admin/dashboard/categorias/nueva?parent=${padre.id}`}
                className="flex items-center gap-1 text-xs text-primary hover:opacity-80 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {subcats.map(sub => (
                <div
                  key={sub.id}
                  className={cn(
                    'rounded-xl border bg-card overflow-hidden flex flex-col',
                    sub.esta_activa ? 'border-card-border' : 'border-border opacity-60'
                  )}
                >
                  <div className="aspect-square bg-background-subtle w-full overflow-hidden">
                    {sub.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sub.imagen_url} alt={sub.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-foreground-muted/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{sub.nombre}</p>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none w-fit',
                      sub.esta_activa
                        ? 'bg-success/10 text-success'
                        : 'bg-foreground-muted/10 text-foreground-muted'
                    )}>
                      {sub.esta_activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <div className="flex items-center gap-1 pt-0.5 border-t border-border">
                      <button
                        onClick={() => toggleActiva(sub.id, sub.esta_activa)}
                        className={cn(
                          'flex-1 h-6 rounded-md flex items-center justify-center transition-colors',
                          sub.esta_activa ? 'text-success hover:bg-success/10' : 'text-foreground-muted hover:bg-background-subtle'
                        )}
                      >
                        {sub.esta_activa ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <Link
                        href={`/admin/dashboard/categorias/${sub.id}`}
                        className="flex-1 h-6 rounded-md flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-background-subtle transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => eliminar(sub.id, sub.nombre)}
                        className="flex-1 h-6 rounded-md flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <p className="text-xs text-foreground-muted text-center">
        {padres.length} categoría{padres.length !== 1 ? 's' : ''} · {hijos.length} subcategoría{hijos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
