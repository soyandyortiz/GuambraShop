import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioEnvio } from '@/components/admin/envios/formulario-envio'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function PáginaEditarZona({ params }: Props) {
  const { id } = await params
  const supabase = await crearClienteServidor()

  const { data: zona } = await supabase
    .from('zonas_envio')
    .select('*')
    .eq('id', id)
    .single()

  if (!zona) notFound()

  return <FormularioEnvio zona={zona} />
}
