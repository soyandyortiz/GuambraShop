export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { FormularioConfigImpresion } from '@/components/admin/impresion/formulario-config-impresion'

function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function PáginaConfigImpresion() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'superadmin') redirect('/admin/dashboard')

  const admin = crearClienteAdmin()
  const [{ data: config }, { data: facturacion }, { data: direccion }] = await Promise.all([
    admin.from('configuracion_tienda')
      .select('nombre_tienda, simbolo_moneda, whatsapp, ticket_ancho_papel, ticket_texto_pie')
      .single(),
    admin.from('configuracion_facturacion').select('ruc').maybeSingle(),
    admin.from('direcciones_negocio').select('direccion_completa').limit(1).maybeSingle(),
  ])

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-foreground">Impresión Térmica</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Configura el formato del ticket para tu impresora térmica
        </p>
      </div>
      <FormularioConfigImpresion
        anchoPapel={((config?.ticket_ancho_papel as '58' | '80') ?? '80')}
        textoPie={config?.ticket_texto_pie ?? null}
        nombreTienda={config?.nombre_tienda ?? 'Mi Tienda'}
        ruc={facturacion?.ruc ?? null}
        direccion={(direccion as any)?.direccion_completa ?? null}
        whatsapp={config?.whatsapp ?? null}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
