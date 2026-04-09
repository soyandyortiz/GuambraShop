'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, EyeOff, FolderOpen, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'

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

export function ListaCategoriasAdmin({ categorias }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  // Separar padres e hijos
  const padres = categorias.filter(c => !c.parent_id).sort((a, b) => a.orden - b.orden)
  const hijos = categorias.filter(c => c.parent_id)

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
    <div className="flex flex-col gap-2">
      {padres.map(padre => {
        const subcats = subcatsDe(padre.id)
        const expandida = expandidas.has(padre.id)

        return (
          <div key={padre.id} className="rounded-2xl border border-card-border bg-card overflow-hidden">
            {/* Fila padre */}
            <FilaCategoria
              categoria={padre}
              onToggleActiva={toggleActiva}
              onEliminar={eliminar}
              tieneHijos={subcats.length > 0}
              expandida={expandida}
              onToggleExpandir={() => toggleExpandida(padre.id)}
            />

            {/* Subcategorías */}
            {expandida && subcats.length > 0 && (
              <div className="border-t border-border">
                {subcats.map((sub, i) => (
                  <div key={sub.id} className={cn('bg-background-subtle', i > 0 && 'border-t border-border')}>
                    <FilaCategoria
                      categoria={sub}
                      onToggleActiva={toggleActiva}
                      onEliminar={eliminar}
                      esSubcategoria
                    />
                  </div>
                ))}
                {/* Botón agregar subcategoría */}
                <div className="px-4 py-2 bg-background-subtle border-t border-border">
                  <Link
                    href={`/admin/dashboard/categorias/nueva?parent=${padre.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar subcategoría
                  </Link>
                </div>
              </div>
            )}

            {/* Si está colapsada y tiene subcats, mostrar botón */}
            {!expandida && subcats.length > 0 && (
              <button
                onClick={() => toggleExpandida(padre.id)}
                className="w-full px-4 py-2 text-left text-xs text-foreground-muted hover:text-foreground bg-background-subtle border-t border-border transition-colors"
              >
                Ver {subcats.length} subcategoría{subcats.length > 1 ? 's' : ''}
              </button>
            )}

            {/* Si no tiene subcats, botón agregar */}
            {subcats.length === 0 && (
              <div className="px-4 py-2 bg-background-subtle border-t border-border">
                <Link
                  href={`/admin/dashboard/categorias/nueva?parent=${padre.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-primary font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar subcategoría
                </Link>
              </div>
            )}
          </div>
        )
      })}

      <p className="text-xs text-foreground-muted text-center mt-1">
        {padres.length} categoría{padres.length > 1 ? 's' : ''} · {hijos.length} subcategoría{hijos.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function FilaCategoria({
  categoria,
  onToggleActiva,
  onEliminar,
  tieneHijos = false,
  expandida = false,
  onToggleExpandir,
  esSubcategoria = false,
}: {
  categoria: CategoriaFila
  onToggleActiva: (id: string, activa: boolean) => void
  onEliminar: (id: string, nombre: string) => void
  tieneHijos?: boolean
  expandida?: boolean
  onToggleExpandir?: () => void
  esSubcategoria?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3 p-3', esSubcategoria && 'pl-8')}>
      {/* Imagen */}
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-background-subtle flex-shrink-0 border border-border">
        {categoria.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={categoria.imagen_url} alt={categoria.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-foreground-muted/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {esSubcategoria && <ChevronRight className="w-3 h-3 text-foreground-muted/50 flex-shrink-0" />}
          <p className="text-sm font-semibold text-foreground truncate">{categoria.nombre}</p>
        </div>
        <p className="text-xs text-foreground-muted truncate">/{categoria.slug}</p>
      </div>

      {/* Estado */}
      <span className={cn(
        'hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
        categoria.esta_activa ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted'
      )}>
        {categoria.esta_activa ? 'Activa' : 'Inactiva'}
      </span>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {tieneHijos && onToggleExpandir && (
          <button
            onClick={onToggleExpandir}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:bg-background-subtle transition-all"
            title={expandida ? 'Colapsar' : 'Expandir'}
          >
            <ChevronRight className={cn('w-4 h-4 transition-transform', expandida && 'rotate-90')} />
          </button>
        )}
        <button
          onClick={() => onToggleActiva(categoria.id, categoria.esta_activa)}
          title={categoria.esta_activa ? 'Desactivar' : 'Activar'}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
            categoria.esta_activa ? 'text-success hover:bg-success/10' : 'text-foreground-muted hover:bg-background-subtle'
          )}
        >
          {categoria.esta_activa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <Link
          href={`/admin/dashboard/categorias/${categoria.id}`}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
        >
          <Pencil className="w-4 h-4" />
        </Link>
        <button
          onClick={() => onEliminar(categoria.id, categoria.nombre)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
