import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioProducto } from '@/components/admin/productos/formulario-producto'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function PáginaEditarProducto({ params }: Props) {
  const { id } = await params
  const supabase = await crearClienteServidor()

  const [{ data: producto }, { data: categorias }, { data: productosExistentes }] = await Promise.all([
    supabase
      .from('productos')
      .select('*, imagenes_producto(id, url, orden), variantes_producto(id, nombre, descripcion, precio_variante, esta_activa, orden), tallas_producto(id, talla, disponible, orden)')
      .eq('id', id)
      .single(),
    supabase.from('categorias').select('id, nombre, slug, parent_id, imagen_url, esta_activa, orden, creado_en').eq('esta_activa', true).order('nombre'),
    supabase.from('productos').select('id, nombre').eq('esta_activo', true).order('nombre'),
  ])

  if (!producto) notFound()

  return (
    <FormularioProducto
      categorias={categorias ?? []}
      productosExistentes={productosExistentes ?? []}
      producto={{
        ...producto,
        imagenes: producto.imagenes_producto,
        variantes: producto.variantes_producto,
        tallas: producto.tallas_producto,
      }}
    />
  )
}
