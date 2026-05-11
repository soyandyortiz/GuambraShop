export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaPedidos } from '@/components/admin/pedidos/tabla-pedidos'
import type { Pedido } from '@/types'

export default async function PáginaPedidos() {
  const supabase = await crearClienteServidor()

  const [{ data: pedidos }, { data: config }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('*, datos_facturacion, comprobante_url, comprobante_eliminar_en')
      .order('creado_en', { ascending: false }),
    supabase
      .from('configuracion_tienda')
      .select('nombre_tienda, simbolo_moneda, ticket_ancho_papel, ticket_linea_1, ticket_linea_2, ticket_linea_3, ticket_linea_4, ticket_texto_pie, ticket_pie_2, ticket_mostrar_precio_unit')
      .single(),
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
          nombreTienda:      config?.nombre_tienda  ?? 'Mi Tienda',
          simboloMoneda:     config?.simbolo_moneda ?? '$',
          anchoPapel:        ((config as any)?.ticket_ancho_papel    ?? '80') as '58' | '80',
          linea1:            (config as any)?.ticket_linea_1          ?? null,
          linea2:            (config as any)?.ticket_linea_2          ?? null,
          linea3:            (config as any)?.ticket_linea_3          ?? null,
          linea4:            (config as any)?.ticket_linea_4          ?? null,
          pie1:              (config as any)?.ticket_texto_pie        ?? null,
          pie2:              (config as any)?.ticket_pie_2            ?? null,
          mostrarPrecioUnit: (config as any)?.ticket_mostrar_precio_unit !== false,
        }}
      />
    </div>
  )
}
