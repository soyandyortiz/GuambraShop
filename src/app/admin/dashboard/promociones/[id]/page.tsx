import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioPromocion } from '@/components/admin/promociones/formulario-promocion'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function PáginaEditarPromocion({ params }: Props) {
  const { id } = await params
  const supabase = await crearClienteServidor()

  const { data: promocion } = await supabase
    .from('promociones')
    .select('*')
    .eq('id', id)
    .single()

  if (!promocion) notFound()

  return <FormularioPromocion promocion={promocion} />
}
