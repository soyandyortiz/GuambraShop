export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaClientes, type ClienteAgregado, type PedidoResumen } from '@/components/admin/clientes/tabla-clientes'
import type { EstadoPedido } from '@/types'

export default async function PáginaClientes() {
  const supabase = await crearClienteServidor()

  const [{ data: pedidos }, { data: config }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('numero_orden, nombres, email, whatsapp, ciudad, provincia, total, estado, creado_en, tipo')
      .order('creado_en', { ascending: false }),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  // Agregar clientes por email
  const mapa = new Map<string, ClienteAgregado>()

  for (const p of pedidos ?? []) {
    const pedidoResumen: PedidoResumen = {
      numero_orden: p.numero_orden,
      total:        Number(p.total),
      estado:       p.estado as EstadoPedido,
      creado_en:    p.creado_en,
      tipo:         p.tipo,
    }

    if (!mapa.has(p.email)) {
      mapa.set(p.email, {
        nombre:        p.nombres,
        email:         p.email,
        whatsapp:      p.whatsapp,
        ciudad:        p.ciudad ?? null,
        provincia:     p.provincia ?? null,
        total_pedidos: 0,
        total_gastado: 0,
        ultimo_pedido: p.creado_en,
        pedidos:       [],
      })
    }

    const cliente = mapa.get(p.email)!
    cliente.total_pedidos++
    cliente.total_gastado = +(cliente.total_gastado + Number(p.total)).toFixed(2)
    cliente.pedidos.push(pedidoResumen)

    // Actualizar ciudad/provincia con el dato más reciente si no tenía
    if (!cliente.ciudad && p.ciudad) cliente.ciudad = p.ciudad
    if (!cliente.provincia && p.provincia) cliente.provincia = p.provincia
  }

  const clientes = Array.from(mapa.values())

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Clientes</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Registros automáticos generados a partir de los pedidos recibidos
        </p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
          <p className="text-xs text-foreground-muted mt-0.5">Clientes únicos</p>
        </div>
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <p className="text-2xl font-bold text-foreground">
            {clientes.length > 0
              ? (clientes.reduce((s, c) => s + c.total_pedidos, 0) / clientes.length).toFixed(1)
              : '0'}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">Pedidos promedio</p>
        </div>
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <p className="text-2xl font-bold text-primary">
            {clientes.filter(c => c.total_pedidos > 1).length}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">Recurrentes</p>
        </div>
      </div>

      <TablaClientes clientes={clientes} simboloMoneda={config?.simbolo_moneda ?? '$'} />
    </div>
  )
}
