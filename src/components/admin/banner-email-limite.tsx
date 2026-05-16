import { MailX, Clock } from 'lucide-react'
import { crearClienteServidor } from '@/lib/supabase/servidor'

const LIMITE_DIA: Record<string, number> = {
  gmail:  500,
  smtp:   200,
  resend: 100,
}

export async function BannerEmailLimite() {
  const supabase = await crearClienteServidor()

  const { data: cfg } = await supabase
    .from('configuracion_email')
    .select('proveedor, activo')
    .maybeSingle()

  if (!cfg?.activo || !cfg?.proveedor) return null

  const limiteDia = LIMITE_DIA[cfg.proveedor] ?? 200
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const [{ count: facturasHoy }, { count: proformasHoy }] = await Promise.all([
    supabase.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy.toISOString()),
    supabase.from('proformas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy.toISOString()),
  ])

  const enviosHoy = (facturasHoy ?? 0) + (proformasHoy ?? 0)
  if (enviosHoy < limiteDia) return null

  const nombreProveedor = cfg.proveedor === 'gmail' ? 'Gmail' : cfg.proveedor === 'resend' ? 'Resend' : 'SMTP'

  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
        <MailX className="w-4 h-4 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-700">
          Límite diario de emails alcanzado — los envíos están bloqueados
        </p>
        <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3 flex-shrink-0" />
          {enviosHoy} emails enviados hoy con {nombreProveedor} (límite: {limiteDia}).
          El límite se restablece automáticamente a medianoche.
        </p>
      </div>
    </div>
  )
}
