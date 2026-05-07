export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaPedidos } from '@/components/admin/pedidos/tabla-pedidos'
import type { Pedido } from '@/types'

export default async function PáginaPedidos() {
  const supabase = await crearClienteServidor()

  const [{ data: pedidos }, { data: config }, { data: facturacion }, { data: direcciones }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('*, datos_facturacion')
      .order('creado_en', { ascending: false }),
    supabase
      .from('configuracion_tienda')
      .select('nombre_tienda, whatsapp, simbolo_moneda, ticket_ancho_papel, ticket_texto_pie')
      .single(),
    supabase
      .from('configuracion_facturacion')
      .select('ruc')
      .maybeSingle(),
    supabase
      .from('direcciones_negocio')
      .select('direccion_completa')
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Órdenes de clientes — delivery y entrega en local físico
        </p>
      </div>

      <TablaPedidos
        pedidos={(pedidos as Pedido[]) ?? []}
        configTicket={{
          nombreTienda:  config?.nombre_tienda  ?? 'Mi Tienda',
          whatsapp:      config?.whatsapp       ?? null,
          ruc:           facturacion?.ruc        ?? null,
          direccion:     (direcciones as any)?.direccion_completa ?? null,
          simboloMoneda: config?.simbolo_moneda ?? '$',
          anchoPapel:    ((config as any)?.ticket_ancho_papel ?? '80') as '58' | '80',
          textoPie:      (config as any)?.ticket_texto_pie ?? null,
        }}
      />
    </div>
  )
}
