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

  const [{ data: producto }, { data: config }] = await Promise.all([
    supabase.from('productos')
      .select(`
        id, nombre, slug, descripcion, precio, precio_descuento,
        etiquetas, requiere_tallas, tipo_producto, url_video,
        imagenes_producto(id, url, orden),
        variantes_producto(id, nombre, descripcion, precio_variante, esta_activa, orden),
        tallas_producto(id, talla, disponible, orden),
        resenas_producto(id, nombre_cliente, calificacion, comentario, creado_en, es_visible),
        categoria:categorias(id, nombre, slug)
      `)
      .eq('slug', slug)
      .eq('esta_activo', true)
      .single(),
    supabase.from('configuracion_tienda')
      .select('whatsapp, nombre_tienda, simbolo_moneda, habilitar_citas, hora_apertura, hora_cierre, duracion_cita_minutos')
      .single(),
  ])

  if (!producto) notFound()

  const imagenes = [...(producto.imagenes_producto ?? [])].sort((a, b) => a.orden - b.orden)
  const variantes = [...(producto.variantes_producto ?? [])].filter(v => v.esta_activa).sort((a, b) => a.orden - b.orden)
  const tallas = [...(producto.tallas_producto ?? [])].sort((a, b) => a.orden - b.orden)
  const resenas = [...(producto.resenas_producto ?? [])].filter(r => r.es_visible).sort((a, b) =>
    new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
  )

  return (
    <DetalleProductoCliente
      producto={{
        id: producto.id,
        nombre: producto.nombre,
        slug: producto.slug,
        descripcion: producto.descripcion,
        precio: producto.precio,
        precio_descuento: producto.precio_descuento,
        etiquetas: producto.etiquetas ?? [],
        requiere_tallas: producto.requiere_tallas,
        tipo_producto: producto.tipo_producto ?? 'producto',
        url_video: producto.url_video ?? null,
        categoria: Array.isArray(producto.categoria) ? (producto.categoria[0] ?? null) as { id: string; nombre: string; slug: string } | null : producto.categoria as { id: string; nombre: string; slug: string } | null,
      }}
      imagenes={imagenes as { id: string; url: string; orden: number }[]}
      variantes={variantes as { id: string; nombre: string; descripcion: string | null; precio_variante: number | null; orden: number }[]}
      tallas={tallas as { id: string; talla: string; disponible: boolean; orden: number }[]}
      resenas={resenas as { id: string; nombre_cliente: string; calificacion: number; comentario: string | null; creado_en: string }[]}
      whatsapp={config?.whatsapp ?? ''}
      nombreTienda={config?.nombre_tienda ?? 'Tienda'}
      configCitas={{
        habilitar_citas: config?.habilitar_citas,
        hora_apertura: config?.hora_apertura,
        hora_cierre: config?.hora_cierre,
        duracion_cita_minutos: config?.duracion_cita_minutos,
      }}
    />
  )
}
