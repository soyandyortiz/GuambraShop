import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { FormularioNuevaFactura } from '@/components/admin/facturacion/formulario-nueva-factura'
import type { ConfiguracionFacturacion, Factura, Pedido } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PáginaEditarFactura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [{ data: facturaData }, { data: config }, { data: pedidos }] = await Promise.all([
    supabase.from('facturas').select('*').eq('id', id).single(),
    supabase.from('configuracion_facturacion').select('*').maybeSingle(),
    supabase
      .from('pedidos')
      .select('id, numero_orden, nombres, email, whatsapp, total, datos_facturacion, creado_en')
      .in('estado', ['procesando', 'completado'])
      .order('creado_en', { ascending: false })
      .limit(100),
  ])

  if (!facturaData) redirect('/admin/dashboard/facturacion')
  if (!config) redirect('/admin/dashboard/facturacion/configuracion')

  const factura = facturaData as Factura

  if (!['borrador', 'rechazada'].includes(factura.estado)) {
    redirect('/admin/dashboard/facturacion')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Editar factura</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          {factura.numero_factura ?? `#${factura.numero_secuencial}`} · Borrador
        </p>
      </div>
      <FormularioNuevaFactura
        config={config as ConfiguracionFacturacion}
        pedidos={(pedidos ?? []) as unknown as Pedido[]}
        facturaEditar={factura}
      />
    </div>
  )
}
