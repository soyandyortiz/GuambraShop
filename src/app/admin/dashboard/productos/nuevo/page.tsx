import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioProducto } from '@/components/admin/productos/formulario-producto'

export default async function PáginaNuevoProducto() {
  const supabase = await crearClienteServidor()

  const [{ data: categorias }, { data: productosExistentes }] = await Promise.all([
    supabase.from('categorias').select('id, nombre, slug, parent_id, imagen_url, esta_activa, orden, creado_en').eq('esta_activa', true).order('nombre'),
    supabase.from('productos').select('id, nombre').eq('esta_activo', true).order('nombre'),
  ])

  return (
    <FormularioProducto
      categorias={categorias ?? []}
      productosExistentes={productosExistentes ?? []}
    />
  )
}
