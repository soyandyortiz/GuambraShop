import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import { TablaResenas } from '@/components/admin/resenas/tabla-resenas'

export default async function PáginaResenas() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [
    { data: pendientes },
    { data: aprobadas },
    { count: totalPendientes },
  ] = await Promise.all([
    supabase
      .from('resenas_producto')
      .select('id, nombre_cliente, cedula, calificacion, comentario, es_visible, creado_en, productos(nombre, slug)')
      .eq('es_visible', false)
      .order('creado_en', { ascending: false }),
    supabase
      .from('resenas_producto')
      .select('id, nombre_cliente, cedula, calificacion, comentario, es_visible, creado_en, productos(nombre, slug)')
      .eq('es_visible', true)
      .order('creado_en', { ascending: false })
      .limit(20),
    supabase
      .from('resenas_producto')
      .select('*', { count: 'exact', head: true })
      .eq('es_visible', false),
  ])

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reseñas de Productos</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Modera las opiniones de tus clientes antes de publicarlas
          </p>
        </div>
        {(totalPendientes ?? 0) > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span className="text-xs font-bold text-warning">
              {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <TablaResenas
        pendientes={pendientes ?? []}
        aprobadas={aprobadas ?? []}
      />
    </div>
  )
}
