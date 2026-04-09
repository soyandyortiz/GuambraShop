import { crearClienteServidor } from '@/lib/supabase/servidor'
import { BuscarCliente } from './buscar-cliente'

interface Props {
  searchParams: Promise<{ q?: string; categoria?: string; min?: string; max?: string }>
}

export default async function PáginaBuscar({ searchParams }: Props) {
  const { q, categoria, min, max } = await searchParams
  const supabase = await crearClienteServidor()

  // Construir query dinámicamente
  let query = supabase
    .from('productos')
    .select('id, nombre, slug, precio, precio_descuento, etiquetas, imagenes_producto(url, orden), variantes_producto(id)')
    .eq('esta_activo', true)

  if (q) query = query.textSearch('nombre', q, { type: 'websearch', config: 'spanish' })
  if (categoria) query = query.eq('categoria_id', categoria)
  if (min) query = query.gte('precio', parseFloat(min))
  if (max) query = query.lte('precio', parseFloat(max))

  const [{ data: productos }, { data: categorias }, { data: rango }] = await Promise.all([
    query.order('creado_en', { ascending: false }).limit(60),
    supabase.from('categorias').select('id, nombre, slug').eq('esta_activa', true).is('parent_id', null).order('nombre'),
    supabase.from('productos').select('precio').eq('esta_activo', true).order('precio'),
  ])

  const precios = (rango ?? []).map(p => p.precio)
  const precioMin = precios.length ? Math.floor(Math.min(...precios)) : 0
  const precioMax = precios.length ? Math.ceil(Math.max(...precios)) : 1000

  function imagenPrincipal(imgs: { url: string; orden: number }[]): string | null {
    if (!imgs?.length) return null
    return [...imgs].sort((a, b) => a.orden - b.orden)[0].url
  }

  const productosNorm = (productos ?? []).map(p => ({
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    precio: p.precio,
    precio_descuento: p.precio_descuento,
    etiquetas: p.etiquetas ?? [],
    imagen_url: imagenPrincipal((p.imagenes_producto ?? []) as { url: string; orden: number }[]),
    variante_count: ((p.variantes_producto ?? []) as { id: string }[]).length,
  }))

  return (
    <BuscarCliente
      productosInic={productosNorm}
      categorias={categorias ?? []}
      qInic={q ?? ''}
      categoriaInic={categoria ?? ''}
      precioMinGlobal={precioMin}
      precioMaxGlobal={precioMax}
      minInic={min ? parseFloat(min) : precioMin}
      maxInic={max ? parseFloat(max) : precioMax}
    />
  )
}
