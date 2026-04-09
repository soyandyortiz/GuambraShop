import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaLeads } from '@/components/admin/leads/tabla-leads'

export default async function PáginaLeads() {
  const supabase = await crearClienteServidor()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, telefono, creado_en')
    .order('creado_en', { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Leads</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Teléfonos capturados cuando clientes agregan productos al carrito
        </p>
      </div>

      <TablaLeads leads={leads ?? []} />
    </div>
  )
}
