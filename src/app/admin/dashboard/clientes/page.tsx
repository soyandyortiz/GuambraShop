export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaClientes, type ClienteConPedidos, type PedidoResumen } from '@/components/admin/clientes/tabla-clientes'
import type { EstadoPedido } from '@/types'
import { Users, UserCheck, TrendingUp } from 'lucide-react'

// Estados que representan dinero real recibido o comprometido (excluye pendiente y cancelado)
const ESTADOS_CONFIRMADOS: EstadoPedido[] = ['confirmado', 'en_proceso', 'enviado', 'entregado']

export default async function PáginaClientes() {
  const supabase = await crearClienteServidor()

  const [
    { data: clientes },
    { data: pedidos },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('*')
      .order('creado_en', { ascending: false }),
    supabase
      .from('pedidos')
      .select('cliente_id, numero_orden, total, estado, creado_en, tipo')
      .not('cliente_id', 'is', null)
      .neq('estado', 'cancelado'),   // excluir cancelados del historial
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda, pais')
      .single(),
  ])

  // Agrupar pedidos por cliente_id
  const pedidosPorCliente = new Map<string, PedidoResumen[]>()
  for (const p of pedidos ?? []) {
    if (!p.cliente_id) continue
    const lista = pedidosPorCliente.get(p.cliente_id) ?? []
    lista.push({
      numero_orden: p.numero_orden,
      total:        Number(p.total),
      estado:       p.estado as EstadoPedido,
      creado_en:    p.creado_en,
      tipo:         p.tipo,
    })
    pedidosPorCliente.set(p.cliente_id, lista)
  }

  const clientesConPedidos: ClienteConPedidos[] = (clientes ?? []).map(c => {
    const listaPedidos = pedidosPorCliente.get(c.id) ?? []

    // Solo suman al total los pedidos en estados confirmados (no pendiente, no cancelado)
    const totalGastado = listaPedidos
      .filter(p => (ESTADOS_CONFIRMADOS as string[]).includes(p.estado))
      .reduce((s, p) => s + p.total, 0)

    const ultimoPedido = listaPedidos.length > 0
      ? listaPedidos.reduce((a, b) => a.creado_en > b.creado_en ? a : b).creado_en
      : null

    return {
      ...c,
      pedidos:          listaPedidos,
      total_pedidos:    listaPedidos.length,
      total_gastado:    +totalGastado.toFixed(2),
      ultimo_pedido_en: ultimoPedido,
    }
  })

  // "Con pedidos" = clientes con al menos un pedido confirmado (dinero real)
  const conPedidosConfirmados = clientesConPedidos.filter(c => c.total_gastado > 0).length
  const totalFacturado        = clientesConPedidos.reduce((s, c) => s + c.total_gastado, 0)
  const simbolo               = config?.simbolo_moneda ?? '$'
  const pais                  = config?.pais ?? 'EC'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Clientes</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Base de datos de clientes — datos listos para facturación electrónica
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-foreground-muted" />
          </div>
          <p className="text-2xl font-bold text-foreground">{clientesConPedidos.length}</p>
          <p className="text-xs text-foreground-muted mt-0.5">Clientes registrados</p>
        </div>
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-foreground-muted" />
          </div>
          <p className="text-2xl font-bold text-foreground">{conPedidosConfirmados}</p>
          <p className="text-xs text-foreground-muted mt-0.5">Con compras confirmadas</p>
        </div>
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-foreground-muted" />
          </div>
          <p className="text-2xl font-bold text-primary">
            {simbolo}{totalFacturado.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">Total facturado</p>
        </div>
      </div>

      <TablaClientes
        clientes={clientesConPedidos}
        simboloMoneda={simbolo}
        pais={pais}
      />
    </div>
  )
}
