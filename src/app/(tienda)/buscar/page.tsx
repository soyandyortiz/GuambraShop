import { crearClienteServidor } from '@/lib/supabase/servidor'
import { BuscarCliente } from './buscar-cliente'

interface Props {
  searchParams: Promise<{
    q?: string
    categoria?: string
    min?: string
    max?: string
    orden?: string
  }>
}

export default async function PáginaBuscar({ searchParams }: Props) {
  const { q, categoria, min, max, orden = 'recientes' } = await searchParams
  const supabase = await crearClienteServidor()

  // Query base con imágenes, variantes, likes y reseñas
  let query = supabase
    .from('productos')
    .select(`
      id, nombre, slug, precio, precio_descuento, etiquetas, tipo_producto, creado_en,
      imagenes_producto(url, orden),
      variantes_producto(id),
      likes_producto(id),
      resenas_producto(calificacion)
    `)
    .eq('esta_activo', true)

  if (q) query = query.textSearch('nombre', q, { type: 'websearch', config: 'spanish' })
  if (categoria) query = query.eq('categoria_id', categoria)
  if (min) query = query.gte('precio', parseFloat(min))
  if (max) query = query.lte('precio', parseFloat(max))

  // Ordenamiento base
  query = query.order('creado_en', { ascending: false }).limit(120)

  const [{ data: productos }, { data: categorias }, { data: rango }] = await Promise.all([
    query,
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

  type RawProducto = {
    id: string
    nombre: string
    slug: string
    precio: number
    precio_descuento: number | null
    etiquetas: string[]
    tipo_producto: 'producto' | 'servicio'
    creado_en: string
    imagenes_producto: { url: string; orden: number }[]
    variantes_producto: { id: string }[]
    likes_producto: { id: string }[]
    resenas_producto: { calificacion: number }[]
  }

  let productosNorm = (productos ?? [] as RawProducto[]).map((p: RawProducto) => {
    const resenas = (p.resenas_producto ?? []) as { calificacion: number }[]
    const totalResenas = resenas.length
    const promedio = totalResenas > 0
      ? resenas.reduce((s, r) => s + r.calificacion, 0) / totalResenas
      : 0
    return {
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      precio: p.precio,
      precio_descuento: p.precio_descuento,
      etiquetas: p.etiquetas ?? [],
      tipo_producto: p.tipo_producto,
      imagen_url: imagenPrincipal(p.imagenes_producto ?? []),
      variante_count: (p.variantes_producto ?? []).length,
      likes_count: (p.likes_producto ?? []).length,
      calificacion_promedio: promedio,
      total_resenas: totalResenas,
      creado_en: p.creado_en,
    }
  })

  // Ordenar en JS (Supabase no soporta ORDER BY en relaciones agregadas fácilmente)
  if (orden === 'populares') {
    productosNorm = productosNorm.sort((a, b) => b.calificacion_promedio - a.calificacion_promedio || b.total_resenas - a.total_resenas)
  } else if (orden === 'resenas') {
    productosNorm = productosNorm.sort((a, b) => b.total_resenas - a.total_resenas)
  } else if (orden === 'precio_asc') {
    productosNorm = productosNorm.sort((a, b) => a.precio - b.precio)
  } else if (orden === 'precio_desc') {
    productosNorm = productosNorm.sort((a, b) => b.precio - a.precio)
  }
  // 'recientes' ya viene ordenado desde la query

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
      ordenInic={orden}
    />
  )
}
