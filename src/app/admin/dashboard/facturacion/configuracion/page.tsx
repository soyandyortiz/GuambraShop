import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { FormularioConfigSRI } from '@/components/admin/facturacion/formulario-config-sri'
import { leerExpiracionCert } from '@/lib/sri/firmar-xades'
import type { ConfiguracionFacturacion } from '@/types'

export const dynamic = 'force-dynamic'

function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function obtenerInfoCert(
  certUrl: string,
  pin: string,
): Promise<{ expiry: string; cn: string; diasRestantes: number } | null> {
  try {
    const match = certUrl.match(/\/storage\/v1\/object\/(?:public\/)?facturacion\/(.+)/)
    const path  = match?.[1]
    if (!path) return null

    const admin = crearClienteAdmin()
    const { data: blob } = await admin.storage.from('facturacion').download(path)
    if (!blob) return null

    const buffer = Buffer.from(await blob.arrayBuffer())
    const info   = leerExpiracionCert(buffer, pin)
    if (!info) return null

    const diasRestantes = Math.ceil(
      (info.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return { expiry: info.expiry.toISOString().slice(0, 10), cn: info.cn, diasRestantes }
  } catch {
    return null
  }
}

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

  const certInfo = (config?.cert_p12_url && config?.cert_pin)
    ? await obtenerInfoCert(config.cert_p12_url, config.cert_pin)
    : null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configuración SRI</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Datos del contribuyente para emitir facturas electrónicas en Ecuador
        </p>
      </div>
      <FormularioConfigSRI
        config={config as ConfiguracionFacturacion | null}
        certInfo={certInfo}
      />
    </div>
  )
}
