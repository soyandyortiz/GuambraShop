import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { FormularioConfigSRI } from '@/components/admin/facturacion/formulario-config-sri'
import type { ConfiguracionFacturacion } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PáginaConfigSRI() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'superadmin') redirect('/admin/dashboard/facturacion')

  const { data: config } = await supabase
    .from('configuracion_facturacion')
    .select('*')
    .maybeSingle()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configuración SRI</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Datos del contribuyente para emitir facturas electrónicas en Ecuador
        </p>
      </div>
      <FormularioConfigSRI config={config as ConfiguracionFacturacion | null} />
    </div>
  )
}
