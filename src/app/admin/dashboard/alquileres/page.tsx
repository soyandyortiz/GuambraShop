export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaAlquileres } from '@/components/admin/alquileres/tabla-alquileres'
import { KeyRound } from 'lucide-react'

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <KeyRound className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Alquileres</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            Gestión de reservas, entregas y devoluciones de artículos
          </p>
        </div>
      </div>

      <TablaAlquileres alquileres={(alquileres as any) ?? []} />
    </div>
  )
}
