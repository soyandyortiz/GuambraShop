import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioCupon } from '@/components/admin/cupones/formulario-cupon'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function PáginaEditarCupon({ params }: Props) {
  const { id } = await params
  const supabase = await crearClienteServidor()

  const { data: cupon } = await supabase
    .from('cupones')
    .select('*')
    .eq('id', id)
    .single()

  if (!cupon) notFound()

  return <FormularioCupon cupon={cupon} />
}
