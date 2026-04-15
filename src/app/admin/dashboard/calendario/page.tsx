import { crearClienteServidor } from '@/lib/supabase/servidor'
import { VistaCalendario } from '@/components/admin/calendario/vista-calendario'

interface Props {
  searchParams: Promise<{ mes?: string }>
}

export default async function PáginaCalendario({ searchParams }: Props) {
  const { mes } = await searchParams

  const ahora = new Date()
  const mesActual = mes || `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  const [year, month] = mesActual.split('-').map(Number)
  const primerDia = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const ultimoDia  = new Date(year, month,     0).toISOString().split('T')[0]

  const supabase = await crearClienteServidor()

  const { data: citas } = await supabase
    .from('citas')
    .select(`
      id, fecha, hora_inicio, hora_fin, estado,
      producto:productos(
        nombre,
        imagenes:imagenes_producto(url, orden)
      ),
      pedido:pedidos(numero_orden, nombres, email, whatsapp)
    `)
    .gte('fecha', primerDia)
    .lte('fecha', ultimoDia)
    .order('hora_inicio', { ascending: true })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Calendario</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Vista mensual de citas — haz clic en un día para ver el detalle
        </p>
      </div>
      <VistaCalendario citas={(citas as any) ?? []} mesActual={mesActual} />
    </div>
  )
}
