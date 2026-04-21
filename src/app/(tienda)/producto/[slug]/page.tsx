import { crearClienteServidor } from '@/lib/supabase/servidor'
import { notFound } from 'next/navigation'
import { DetalleProductoCliente } from './detalle-cliente'
import type { Metadata } from 'next'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await crearClienteServidor()

  const [{ data: producto }, { data: config }] = await Promise.all([
    supabase.from('productos')
      .select('nombre, descripcion, precio, precio_descuento, imagenes_producto(url, orden)')
      .eq('slug', slug)
      .eq('esta_activo', true)
      .single(),
    supabase.from('configuracion_tienda')
      .select('nombre_tienda')
      .single(),
  ])

  if (!producto) return {}

  const imagenes = [...(producto.imagenes_producto ?? [])].sort((a: any, b: any) => a.orden - b.orden)
  const imagenPrincipal = imagenes[0]?.url ?? null
  const precio = producto.precio_descuento ?? producto.precio
  const nombreTienda = config?.nombre_tienda ?? 'Tienda'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  return {
    title: `${producto.nombre} — ${nombreTienda}`,
    description: producto.descripcion ?? `${producto.nombre} disponible en ${nombreTienda}`,
    openGraph: {
      title: producto.nombre,
      description: producto.descripcion ?? `$${precio} — ${nombreTienda}`,
      url: `${siteUrl}/producto/${slug}`,
      siteName: nombreTienda,
      images: imagenPrincipal
        ? [{ url: imagenPrincipal, width: 800, height: 800, alt: producto.nombre }]
        : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: producto.nombre,
      description: producto.descripcion ?? `$${precio} — ${nombreTienda}`,
      images: imagenPrincipal ? [imagenPrincipal] : [],
    },
  }
}

export default async function PáginaProducto({ params }: Props) {
  const { slug } = await params
  const supabase = await crearClienteServidor()

  const [{ data: producto }, { data: config }, { data: empleados }] = await Promise.all([
    supabase.from('productos')
      .select(`
        id, nombre, slug, descripcion, precio, precio_descuento, stock,
        etiquetas, requiere_tallas, tipo_producto, url_video, paquetes_evento,
        imagenes_producto(id, url, orden),
        variantes_producto(id, nombre, descripcion, precio_variante, imagen_url, stock, esta_activa, orden, tipo_precio),
        tallas_producto(id, talla, disponible, stock, orden),
        resenas_producto(id, nombre_cliente, calificacion, comentario, creado_en, es_visible),
        categoria:categorias(id, nombre, slug)
      `)
      .eq('slug', slug)
      .eq('esta_activo', true)
      .single(),
    supabase.from('configuracion_tienda')
      .select('whatsapp, nombre_tienda, simbolo_moneda, habilitar_citas, hora_apertura, hora_cierre, duracion_cita_minutos, capacidad_citas_simultaneas, seleccion_empleado, pais')
      .single(),
    supabase.from('empleados_cita')
      .select('id, nombre_completo')
      .eq('activo', true)
      .order('orden'),
  ])

  if (!producto) notFound()

  const imagenes = [...(producto.imagenes_producto ?? [])].sort((a, b) => a.orden - b.orden)
  const variantes = [...(producto.variantes_producto ?? [])].filter(v => v.esta_activa).sort((a, b) => a.orden - b.orden)
  const tallas = [...(producto.tallas_producto ?? [])].sort((a, b) => a.orden - b.orden)
  const resenas = [...(producto.resenas_producto ?? [])].filter(r => r.es_visible).sort((a, b) =>
    new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
  )

  // Query separada para no afectar la query principal si hay error de FK
  type ProductoRelacionado = {
    id: string; nombre: string; slug: string
    precio: number; precio_descuento: number | null
    stock: number | null; tipo_producto: string
    imagen_url: string | null
  }

  const { data: idsRelacionados } = await supabase
    .from('productos_relacionados')
    .select('producto_relacionado_id')
    .eq('producto_id', producto.id)

  let relacionados: ProductoRelacionado[] = []

  if (idsRelacionados && idsRelacionados.length > 0) {
    const ids = idsRelacionados.map((r: any) => r.producto_relacionado_id)
    const { data: prodRelacionados } = await supabase
      .from('productos')
      .select('id, nombre, slug, precio, precio_descuento, stock, tipo_producto, imagenes_producto(url, orden)')
      .in('id', ids)
      .eq('esta_activo', true)

    relacionados = (prodRelacionados ?? []).map((r: any) => {
      const imgs = [...(r.imagenes_producto ?? [])].sort((a: any, b: any) => a.orden - b.orden)
      return {
        id: r.id,
        nombre: r.nombre,
        slug: r.slug,
        precio: r.precio,
        precio_descuento: r.precio_descuento,
        stock: r.stock ?? null,
        tipo_producto: r.tipo_producto ?? 'producto',
        imagen_url: imgs[0]?.url ?? null,
      }
    })
  }

  return (
    <DetalleProductoCliente
      producto={{
        id: producto.id,
        nombre: producto.nombre,
        slug: producto.slug,
        descripcion: producto.descripcion,
        precio: producto.precio,
        precio_descuento: producto.precio_descuento,
        stock: producto.stock ?? null,
        etiquetas: producto.etiquetas ?? [],
        requiere_tallas: producto.requiere_tallas,
        tipo_producto: producto.tipo_producto ?? 'producto',
        url_video: producto.url_video ?? null,
        paquetes_evento: (producto.paquetes_evento as any) ?? [],
        categoria: Array.isArray(producto.categoria) ? (producto.categoria[0] ?? null) as { id: string; nombre: string; slug: string } | null : producto.categoria as { id: string; nombre: string; slug: string } | null,
      }}
      imagenes={imagenes as { id: string; url: string; orden: number }[]}
      variantes={variantes as { id: string; nombre: string; descripcion: string | null; precio_variante: number | null; imagen_url?: string | null; stock?: number | null; orden: number; tipo_precio?: string | null }[]}
      tallas={tallas as { id: string; talla: string; disponible: boolean; stock?: number | null; orden: number }[]}
      resenas={resenas as { id: string; nombre_cliente: string; calificacion: number; comentario: string | null; creado_en: string }[]}
      whatsapp={config?.whatsapp ?? ''}
      nombreTienda={config?.nombre_tienda ?? 'Tienda'}
      simboloMoneda={config?.simbolo_moneda ?? '$'}
      pais={config?.pais ?? 'EC'}
      configCitas={{
        habilitar_citas: config?.habilitar_citas,
        hora_apertura: config?.hora_apertura,
        hora_cierre: config?.hora_cierre,
        duracion_cita_minutos: config?.duracion_cita_minutos,
        capacidad_citas_simultaneas: config?.capacidad_citas_simultaneas ?? 1,
        seleccion_empleado: config?.seleccion_empleado ?? false,
      }}
      empleados={(empleados ?? []) as { id: string; nombre_completo: string }[]}
      relacionados={relacionados}
    />
  )
}
