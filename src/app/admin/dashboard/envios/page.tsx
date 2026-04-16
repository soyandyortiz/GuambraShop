import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaZonasEnvio } from '@/components/admin/envios/lista-zonas'

export default async function PáginaEnvios() {
  const supabase = await crearClienteServidor()

  const { data: zonas } = await supabase
    .from('zonas_envio')
    .select('id, provincia, ciudad, precio, tiempo_entrega, esta_activa')
    .order('provincia', { ascending: true })
    .order('ciudad', { ascending: true })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Zonas de envío</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Precios de envío por ciudad — aparecen automáticamente en el carrito del cliente
        </p>
      </div>

      <ListaZonasEnvio zonas={zonas ?? []} />
    </div>
  )
}
