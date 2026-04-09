'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Filter, Pencil, Trash2, Eye, EyeOff, Package } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ImagenProducto { url: string; orden: number }
interface ProductoFila {
  id: string
  nombre: string
  slug: string
  precio: number
  precio_descuento: number | null
  esta_activo: boolean
  categoria_id: string | null
  imagenes_producto: ImagenProducto[]
}
interface Categoria { id: string; nombre: string }

interface Props {
  productos: ProductoFila[]
  categorias: Categoria[]
}

export function ListaProductosAdmin({ productos, categorias }: Props) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [isPending, startTransition] = useTransition()

  const filtrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === 'todas' || p.categoria_id === categoriaFiltro
    const coincideEstado = estadoFiltro === 'todos'
      || (estadoFiltro === 'activos' && p.esta_activo)
      || (estadoFiltro === 'inactivos' && !p.esta_activo)
    return coincideBusqueda && coincideCategoria && coincideEstado
  })

  async function toggleActivo(id: string, activo: boolean) {
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('productos').update({ esta_activo: !activo }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar')
      return
    }
    toast.success('Cambios guardados correctamente')
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('productos').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  function imagenPrincipal(imagenes: ImagenProducto[]) {
    if (!imagenes?.length) return null
    return [...imagenes].sort((a, b) => a.orden - b.orden)[0].url
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="w-full sm:w-auto h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={estadoFiltro}
          onChange={e => setEstadoFiltro(e.target.value)}
          className="w-full sm:w-auto h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Package className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin productos</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda || categoriaFiltro !== 'todas' ? 'Intenta con otros filtros' : 'Crea tu primer producto'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map(producto => {
            const img = imagenPrincipal(producto.imagenes_producto)
            return (
              <div
                key={producto.id}
                className={cn(
                  'p-3 rounded-2xl border bg-card transition-all',
                  producto.esta_activo ? 'border-card-border' : 'border-border opacity-60'
                )}
              >
                {/* Fila superior: imagen + info */}
                <div className="flex items-center gap-3">
                  {/* Imagen */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-background-subtle flex-shrink-0 border border-border">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={producto.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-foreground-muted/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{producto.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {producto.precio_descuento ? (
                        <>
                          <span className="text-sm font-bold text-primary">{formatearPrecio(producto.precio_descuento)}</span>
                          <span className="text-xs text-foreground-muted line-through">{formatearPrecio(producto.precio)}</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-foreground">{formatearPrecio(producto.precio)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fila inferior: estado + acciones */}
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/50">
                  <span className={cn(
                    'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    producto.esta_activo
                      ? 'bg-success/10 text-success'
                      : 'bg-foreground-muted/10 text-foreground-muted'
                  )}>
                    {producto.esta_activo ? 'Activo' : 'Inactivo'}
                  </span>

                  <div className="flex items-center gap-2">
                    <Switch
                      activo={producto.esta_activo}
                      alCambiar={() => toggleActivo(producto.id, producto.esta_activo)}
                      cargando={isPending}
                    />
                    <Link
                      href={`/admin/dashboard/productos/${producto.id}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => eliminar(producto.id, producto.nombre)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-foreground-muted text-center">
        {filtrados.length} de {productos.length} productos
      </p>
    </div>
  )
}

function Switch({ activo, alCambiar, cargando }: { activo: boolean; alCambiar: () => void; cargando?: boolean }) {
  return (
    <button
      type="button"
      onClick={alCambiar}
      disabled={cargando}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        activo ? 'bg-[#22c55e]' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          activo ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}
