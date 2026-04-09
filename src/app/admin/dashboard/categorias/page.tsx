import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaCategoriasAdmin } from '@/components/admin/categorias/lista-categorias'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function PáginaCategorias() {
  const supabase = await crearClienteServidor()

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, slug, parent_id, imagen_url, esta_activa, orden')
    .order('orden')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categorías</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {categorias?.length ?? 0} en total
          </p>
        </div>
        <Link
          href="/admin/dashboard/categorias/nueva"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </Link>
      </div>

      <ListaCategoriasAdmin categorias={categorias ?? []} />
    </div>
  )
}
