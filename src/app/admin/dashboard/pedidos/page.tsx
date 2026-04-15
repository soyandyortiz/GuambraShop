import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaPedidos } from '@/components/admin/pedidos/tabla-pedidos'
import type { Pedido } from '@/types'

export default async function PáginaPedidos() {
  const supabase = await crearClienteServidor()

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('*')
    .order('creado_en', { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Órdenes de clientes — delivery y entrega en local físico
        </p>
      </div>

      <TablaPedidos pedidos={(pedidos as Pedido[]) ?? []} />
    </div>
  )
}
