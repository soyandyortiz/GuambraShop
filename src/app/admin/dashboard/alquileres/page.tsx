export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaAlquileres } from '@/components/admin/alquileres/tabla-alquileres'

export default async function PáginaAlquileres() {
  const supabase = await crearClienteServidor()

  const { data: alquileres } = await supabase
    .from('alquileres')
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      dias,
      cantidad,
      hora_recogida,
      estado,
      creado_en,
      producto:productos (
        id,
        nombre,
        precio,
        imagenes_producto ( url, orden )
      ),
      pedido:pedidos (
        numero_orden,
        nombres,
        email,
        whatsapp
      )
    `)
    .order('fecha_inicio', { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Alquileres</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Reservas de artículos en alquiler — períodos activos y completados
        </p>
      </div>

      <TablaAlquileres alquileres={(alquileres as any) ?? []} />
    </div>
  )
}
