import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaSolicitudes } from '@/components/admin/solicitudes/tabla-solicitudes'
import { PartyPopper } from 'lucide-react'

export default async function PáginaSolicitudes() {
  const supabase = await crearClienteServidor()

  const [{ data: solicitudes }, { data: config }] = await Promise.all([
    supabase
      .from('solicitudes_evento')
      .select('*')
      .order('creado_en', { ascending: false }),
    supabase
      .from('configuracion_tienda')
      .select('whatsapp, simbolo_moneda')
      .single(),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <PartyPopper className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Solicitudes de evento</h1>
          <p className="text-sm text-foreground-muted">
            Gestiona las cotizaciones de servicios personalizados
          </p>
        </div>
      </div>

      <TablaSolicitudes
        solicitudesInic={solicitudes ?? []}
        whatsapp={config?.whatsapp ?? ''}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
