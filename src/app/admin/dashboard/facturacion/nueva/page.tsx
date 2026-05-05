import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { FormularioNuevaFactura } from '@/components/admin/facturacion/formulario-nueva-factura'
import type { ConfiguracionFacturacion, Pedido } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PáginaNuevaFactura() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [{ data: config }, { data: pedidosSinFactura }] = await Promise.all([
    supabase.from('configuracion_facturacion').select('*').maybeSingle(),
    supabase
      .from('pedidos')
      .select('id, numero_orden, nombres, email, whatsapp, total, datos_facturacion, creado_en')
      .in('estado', ['pendiente', 'confirmado', 'entregado'])
      .order('creado_en', { ascending: false })
      .limit(100),
  ])

  if (!config) redirect('/admin/dashboard/facturacion/configuracion')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nueva factura</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Emite una factura electrónica vinculada a un pedido o de forma manual
        </p>
      </div>
      <FormularioNuevaFactura
        config={config as ConfiguracionFacturacion}
        pedidos={(pedidosSinFactura ?? []) as unknown as Pedido[]}
      />
    </div>
  )
}
