import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioCategoria } from '@/components/admin/categorias/formulario-categoria'

interface Props {
  searchParams: Promise<{ parent?: string }>
}

export default async function PáginaNuevaCategoria({ searchParams }: Props) {
  const { parent } = await searchParams
  const supabase = await crearClienteServidor()

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, parent_id')
    .order('nombre')

  return (
    <FormularioCategoria
      categorias={categorias ?? []}
      parentIdInicial={parent}
    />
  )
}
