import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioProducto } from '@/components/admin/productos/formulario-producto'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function PáginaEditarProducto({ params }: Props) {
  const { id } = await params
  const supabase = await crearClienteServidor()

  const [{ data: producto }, { data: categorias }, { data: productosExistentes }, { data: relacionadosData }] = await Promise.all([
    supabase
      .from('productos')
      .select('*, imagenes_producto(id, url, orden), variantes_producto(id, nombre, descripcion, precio_variante, esta_activa, orden), tallas_producto(id, talla, disponible, orden)')
      .eq('id', id)
      .single(),
    supabase.from('categorias').select('id, nombre, slug, parent_id, imagen_url, esta_activa, orden, creado_en').eq('esta_activa', true).order('nombre'),
    supabase.from('productos').select('id, nombre').eq('esta_activo', true).order('nombre'),
    supabase.from('productos_relacionados').select('producto_relacionado_id').eq('producto_id', id),
  ])

  if (!producto) notFound()

  const relacionadosIniciales = (relacionadosData ?? []).map(r => r.producto_relacionado_id)

  return (
    <FormularioProducto
      categorias={categorias ?? []}
      productosExistentes={productosExistentes ?? []}
      relacionadosIniciales={relacionadosIniciales}
      producto={{
        ...producto,
        imagenes: producto.imagenes_producto,
        variantes: producto.variantes_producto,
        tallas: producto.tallas_producto,
      }}
    />
  )
}
