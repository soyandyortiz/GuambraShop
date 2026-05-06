export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { IngresosCliente } from './ingresos-cliente'

const ESTADOS_INGRESO = ['confirmado', 'en_proceso', 'enviado', 'entregado']

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}

export default async function PáginaIngresos({ searchParams }: Props) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const params = await searchParams
  const ahora = new Date()

  const desde = params.desde ?? new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
  const hasta = params.hasta ?? new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, numero_orden, nombres, total, estado, creado_en, tipo, simbolo_moneda, forma_pago, es_venta_manual')
    .in('estado', ESTADOS_INGRESO)
    .gte('creado_en', `${desde}T00:00:00`)
    .lte('creado_en', `${hasta}T23:59:59`)
    .order('creado_en', { ascending: false })

  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('simbolo_moneda')
    .single()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Ingresos</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Solo pedidos confirmados, en proceso, enviados o entregados
        </p>
      </div>

      <IngresosCliente
        pedidos={pedidos ?? []}
        desde={desde}
        hasta={hasta}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
