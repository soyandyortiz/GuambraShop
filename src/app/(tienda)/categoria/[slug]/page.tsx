import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Package } from 'lucide-react'

interface Props { params: Promise<{ slug: string }> }

export default async function PáginaCategoria({ params }: Props) {
  const { slug } = await params
  const supabase = await crearClienteServidor()

  const [{ data: categoria }, { data: todasCategorias }] = await Promise.all([
    supabase.from('categorias').select('id, nombre, slug, imagen_url, parent_id').eq('slug', slug).eq('esta_activa', true).single(),
    supabase.from('categorias').select('id, nombre, slug, imagen_url, parent_id').eq('esta_activa', true).order('orden'),
  ])

  if (!categoria) notFound()

  const hijos = (todasCategorias ?? []).filter(c => c.parent_id === categoria.id)
  const esSubcategoria = !!categoria.parent_id
  const padre = categoria.parent_id
    ? (todasCategorias ?? []).find(c => c.id === categoria.parent_id)
    : null

  // Solo carga productos si es subcategoría o si no tiene hijos (categoría hoja)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let productos: any[] | null = null
  let disponibilidadHoy: Record<string, number> = {}
  if (esSubcategoria || hijos.length === 0) {
    const ids = [categoria.id, ...hijos.map(h => h.id)]
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, slug, precio, precio_descuento, etiquetas, tipo_producto, stock, imagenes_producto(url, orden), variantes_producto(id, nombre, precio_variante, stock_variante, esta_activa, orden, tipo_precio)')
      .eq('esta_activo', true)
      .in('categoria_id', ids)
      .order('creado_en', { ascending: false })
    productos = data as any[] | null

    const alquilerIds = (productos ?? []).filter((p: any) => p.tipo_producto === 'alquiler').map((p: any) => p.id)
    if (alquilerIds.length > 0) {
      const { data: disp } = await supabase.rpc('disponibilidad_alquileres_hoy', { p_ids: alquilerIds })
      if (disp) {
        for (const row of disp as { producto_id: string; disponible: number }[]) {
          disponibilidadHoy[row.producto_id] = row.disponible
        }
      }
    }
  }

  function imagenPrincipal(imgs: { url: string; orden: number }[]): string | null {
    if (!imgs?.length) return null
    return [...imgs].sort((a, b) => a.orden - b.orden)[0].url
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header con breadcrumb */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border sticky top-0 bg-background z-10">
        <Link
          href={padre ? `/categoria/${padre.slug}` : '/categorias'}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background-subtle transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div className="flex items-center gap-1 text-xs text-foreground-muted min-w-0">
          <Link href="/categorias" className="hover:text-primary transition-colors shrink-0">Categorías</Link>
          {padre && (
            <>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <Link href={`/categoria/${padre.slug}`} className="hover:text-primary transition-colors truncate">{padre.nombre}</Link>
            </>
          )}
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-foreground font-semibold truncate">{categoria.nombre}</span>
        </div>
      </div>

      {/* Título de Categoría Centrado y Estético */}
      <div className="px-4 py-10 text-center bg-background">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase italic">
            {categoria.nombre}
        </h1>
        <div className="w-12 h-1 bg-primary mx-auto mt-3 rounded-full shadow-sm" />
      </div>

      <div className="px-4 mt-4 pb-4">
        {/* Subcategorías en GRID (si es categoría padre con hijos) */}
        {hijos.length > 0 && (
          <section className="mb-6">
            <p className="text-xs text-foreground-muted mb-3 font-medium uppercase tracking-wide">Subcategorías</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {hijos.map(sub => (
                <Link key={sub.id} href={`/categoria/${sub.slug}`}
                  className="flex flex-col items-center gap-2 group">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden bg-background-subtle border border-border group-hover:border-primary/50 group-hover:shadow-sm transition-all">
                    {sub.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sub.imagen_url}
                        alt={sub.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Package className="w-6 h-6 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-foreground-muted text-center w-full line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {sub.nombre}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Productos */}
        {productos !== null && (
          <section>
            {hijos.length > 0 && (
              <p className="text-xs text-foreground-muted mb-3 font-medium uppercase tracking-wide">
                Todos los productos ({productos?.length ?? 0})
              </p>
            )}
            {!productos?.length ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-foreground-muted/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Sin productos en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {productos.map((p: any) => (
                  <TarjetaProducto
                    key={p.id}
                    id={p.id}
                    nombre={p.nombre}
                    slug={p.slug}
                    precio={p.precio}
                    precio_descuento={p.precio_descuento}
                    imagen_url={imagenPrincipal((p.imagenes_producto ?? []) as { url: string; orden: number }[])}
                    etiquetas={p.etiquetas ?? []}
                    variante_count={((p.variantes_producto ?? []) as { id: string }[]).length}
                    tipo_producto={p.tipo_producto}
                    stock={p.stock ?? null}
                    stockDisponibleHoy={p.tipo_producto === 'alquiler' ? disponibilidadHoy[p.id] : undefined}
                    variantes={(p.variantes_producto ?? []).filter((v: any) => v.esta_activa).sort((a: any, b: any) => a.orden - b.orden)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Si es categoría padre con hijos: no mostrar texto de "sin productos" */}
        {productos === null && hijos.length > 0 && (
          <p className="text-xs text-center text-foreground-muted py-4">
            Selecciona una subcategoría para ver los productos
          </p>
        )}
      </div>
    </div>
  )
}
