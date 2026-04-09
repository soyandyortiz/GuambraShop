import { crearClienteServidor } from '@/lib/supabase/servidor'
import { notFound } from 'next/navigation'
import { DetalleProductoCliente } from './detalle-cliente'

interface Props { params: Promise<{ slug: string }> }

export default async function PáginaProducto({ params }: Props) {
  const { slug } = await params
  const supabase = await crearClienteServidor()

  const [{ data: producto }, { data: config }] = await Promise.all([
    supabase.from('productos')
      .select(`
        id, nombre, slug, descripcion, precio, precio_descuento,
        etiquetas, requiere_tallas,
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
      .select('whatsapp, nombre_tienda, simbolo_moneda')
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
        categoria: Array.isArray(producto.categoria) ? (producto.categoria[0] ?? null) as { id: string; nombre: string; slug: string } | null : producto.categoria as { id: string; nombre: string; slug: string } | null,
      }}
      imagenes={imagenes as { id: string; url: string; orden: number }[]}
      variantes={variantes as { id: string; nombre: string; descripcion: string | null; precio_variante: number | null; orden: number }[]}
      tallas={tallas as { id: string; talla: string; disponible: boolean; orden: number }[]}
      resenas={resenas as { id: string; nombre_cliente: string; calificacion: number; comentario: string | null; creado_en: string }[]}
      whatsapp={config?.whatsapp ?? ''}
      nombreTienda={config?.nombre_tienda ?? 'Tienda'}
    />
  )
}
