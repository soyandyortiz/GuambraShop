import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioCategoria } from '@/components/admin/categorias/formulario-categoria'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PáginaEditarCategoria({ params }: Props) {
  const { id } = await params
  const supabase = await crearClienteServidor()

  const [{ data: categoria }, { data: categorias }] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nombre, slug, parent_id, imagen_url, esta_activa, orden')
      .eq('id', id)
      .single(),
    supabase
      .from('categorias')
      .select('id, nombre, parent_id')
      .order('nombre'),
  ])

  if (!categoria) notFound()

  return (
    <FormularioCategoria
      categorias={categorias ?? []}
      categoria={categoria}
    />
  )
}
