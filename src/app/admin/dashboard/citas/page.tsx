import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaCitas } from '@/components/admin/citas/tabla-citas'
import type { Cita } from '@/types'

export default async function PáginaCitas() {
  const supabase = await crearClienteServidor()

  const { data: citas } = await supabase
    .from('citas')
    .select(`
      *,
      producto:productos (
        nombre,
        imagenes:imagenes_producto (
          url
        )
      ),
      pedido:pedidos (
        numero_orden,
        nombres,
        email,
        whatsapp
      )
    `)
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Agenda de Citas</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Gestión de reservas y servicios agendados por clientes
        </p>
      </div>

      <TablaCitas citas={(citas as any) ?? []} />
    </div>
  )
}
