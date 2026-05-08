import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaZonasEnvio } from '@/components/admin/envios/lista-zonas'
import { Truck } from 'lucide-react'

export default async function PáginaEnvios() {
  const supabase = await crearClienteServidor()

  const { data: zonas } = await supabase
    .from('zonas_envio')
    .select('id, provincia, ciudad, precio, tiempo_entrega, esta_activa')
    .order('provincia', { ascending: true })
    .order('ciudad', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Zonas de envío</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            Configura los precios de envío por ciudad para el carrito del cliente
          </p>
        </div>
      </div>

      <ListaZonasEnvio zonas={zonas ?? []} />
    </div>
  )
}
