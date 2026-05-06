import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { FormularioConfigEmail } from '@/components/admin/email/formulario-config-email'
import { ContadorEmails } from '@/components/admin/email/contador-emails'
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

  // Conteo de emails enviados (solo si el módulo está activo)
  let enviosHoy = 0
  let enviosMes = 0

  if (config?.activo) {
    const ahora   = new Date()
    const hoy     = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

    const [{ count: countHoy }, { count: countMes }] = await Promise.all([
      supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .gte('email_enviado_en', hoy),
      supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .gte('email_enviado_en', inicioMes),
    ])

    enviosHoy = countHoy ?? 0
    enviosMes = countMes ?? 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configuración de Email</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Configura cómo se envían los RIDE (facturas PDF) a los clientes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <FormularioConfigEmail config={config as ConfiguracionEmail | null} />
        </div>

        {config?.activo && config?.proveedor && (
          <div className="lg:col-span-1">
            <ContadorEmails
              proveedor={config.proveedor}
              enviosHoy={enviosHoy}
              enviosMes={enviosMes}
            />
          </div>
        )}
      </div>
    </div>
  )
}
