export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaClientes, type ClienteConPedidos, type PedidoResumen } from '@/components/admin/clientes/tabla-clientes'
import type { EstadoPedido } from '@/types'
import { Users, UserCheck, TrendingUp } from 'lucide-react'

// Estados que representan dinero real recibido o comprometido (excluye pendiente y cancelado)
const ESTADOS_CONFIRMADOS: EstadoPedido[] = ['procesando', 'completado']

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
      .neq('estado', 'cancelado'),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda, pais')
      .single(),
  ])

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

  const conPedidosConfirmados = clientesConPedidos.filter(c => c.total_gastado > 0).length
  const totalFacturado        = clientesConPedidos.reduce((s, c) => s + c.total_gastado, 0)
  const simbolo               = config?.simbolo_moneda ?? '$'
  const pais                  = config?.pais ?? 'EC'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Base de Datos de Clientes</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            Gestión de perfiles, historial de compras y facturación
          </p>
        </div>
      </div>

      {/* Resumen de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-foreground">{clientesConPedidos.length}</p>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Clientes Registrados</p>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-foreground">{conPedidosConfirmados}</p>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Con Compras Activas</p>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-primary">
            {simbolo}{totalFacturado.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Total Facturado</p>
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
