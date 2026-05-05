import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { FormularioConfigEmail } from '@/components/admin/email/formulario-config-email'
import type { ConfiguracionEmail } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PáginaConfigEmail() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'superadmin') redirect('/admin/dashboard')

  const { data: config } = await supabase
    .from('configuracion_email')
    .select('*')
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configuración de Email</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Configura cómo se envían los RIDE (facturas PDF) a los clientes
        </p>
      </div>
      <FormularioConfigEmail config={config as ConfiguracionEmail | null} />
    </div>
  )
}
