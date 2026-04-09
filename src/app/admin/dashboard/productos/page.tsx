import { crearClienteServidor } from '@/lib/supabase/servidor'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ListaProductosAdmin } from '@/components/admin/productos/lista-productos'

export default async function PáginaProductos() {
  const supabase = await crearClienteServidor()

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, slug, precio, precio_descuento, esta_activo, categoria_id, imagenes_producto(url, orden)')
      .order('creado_en', { ascending: false }),
    supabase
      .from('categorias')
      .select('id, nombre')
      .eq('esta_activa', true)
      .is('parent_id', null)
      .order('nombre'),
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {productos?.length ?? 0} producto{productos?.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link
          href="/admin/dashboard/productos/nuevo"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </Link>
      </div>

      <ListaProductosAdmin
        productos={productos ?? []}
        categorias={categorias ?? []}
      />
    </div>
  )
}
