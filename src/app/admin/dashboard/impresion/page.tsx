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
  const { data: config } = await admin
    .from('configuracion_tienda')
    .select(`
      nombre_tienda, simbolo_moneda,
      ticket_ancho_papel,
      ticket_linea_1, ticket_linea_2, ticket_linea_3, ticket_linea_4,
      ticket_texto_pie, ticket_pie_2,
      ticket_mostrar_precio_unit
    `)
    .single()

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-foreground">Impresión Térmica</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Diseña el contenido del ticket para tu impresora térmica
        </p>
      </div>
      <FormularioConfigImpresion
        anchoPapel={((config?.ticket_ancho_papel ?? '80') as '58' | '80')}
        linea1={config?.ticket_linea_1 ?? null}
        linea2={config?.ticket_linea_2 ?? null}
        linea3={config?.ticket_linea_3 ?? null}
        linea4={config?.ticket_linea_4 ?? null}
        pie1={config?.ticket_texto_pie ?? null}
        pie2={config?.ticket_pie_2 ?? null}
        mostrarPrecioUnit={(config?.ticket_mostrar_precio_unit as boolean) ?? true}
        nombreTienda={config?.nombre_tienda ?? 'Mi Tienda'}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
