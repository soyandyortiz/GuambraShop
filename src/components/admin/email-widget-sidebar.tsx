import { Mail } from 'lucide-react'
import { crearClienteServidor } from '@/lib/supabase/servidor'

const LIMITE_DIA: Record<string, number> = {
  gmail:  500,
  smtp:   200,
  resend: 100,
}
const LIMITE_MES_RESEND = 3000

export async function EmailWidgetSidebar() {
  const supabase = await crearClienteServidor()

  const { data: cfg } = await supabase
    .from('configuracion_email')
    .select('proveedor, activo')
    .maybeSingle()

  if (!cfg?.activo || !cfg?.proveedor) return null

  const ahora     = new Date()
  const hoy       = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

  const [
    { count: facturasHoy },
    { count: proformasHoy },
    { count: facturasMes },
    { count: proformasMes },
  ] = await Promise.all([
    supabase.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy),
    supabase.from('proformas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy),
    supabase.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', inicioMes),
    supabase.from('proformas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', inicioMes),
  ])

  const enviosHoy = (facturasHoy ?? 0) + (proformasHoy ?? 0)
  const enviosMes = (facturasMes ?? 0) + (proformasMes ?? 0)

  const limiteDia = LIMITE_DIA[cfg.proveedor] ?? 200
  const limiteMes = cfg.proveedor === 'resend' ? LIMITE_MES_RESEND : null

  const pctDia = Math.min((enviosHoy / limiteDia) * 100, 100)
  const pctMes = limiteMes ? Math.min((enviosMes / limiteMes) * 100, 100) : 0

  const colorBarra =
    pctDia >= 90 ? 'bg-red-500' :
    pctDia >= 75 ? 'bg-amber-500' :
    'bg-emerald-500'

  const colorTexto =
    pctDia >= 90 ? 'text-red-600' :
    pctDia >= 75 ? 'text-amber-600' :
    'text-foreground-muted'

  return (
    <div className="mx-2 mb-1 px-3 py-2.5 rounded-xl border border-border block">
      {/* Fila: ícono + label + conteo hoy */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-foreground-muted" />
          <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
            Emails hoy
          </span>
        </div>
        <span className={`text-[10px] font-black ${colorTexto}`}>
          {enviosHoy}/{limiteDia}
        </span>
      </div>

      {/* Barra diaria */}
      <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorBarra}`}
          style={{ width: `${pctDia}%` }}
        />
      </div>

      {/* Barra mensual (solo Resend) */}
      {limiteMes && (
        <>
          <div className="flex items-center justify-between mt-2 mb-1">
            <span className="text-[9px] text-foreground-muted">Este mes</span>
            <span className={`text-[9px] font-bold ${pctMes >= 90 ? 'text-red-600' : pctMes >= 75 ? 'text-amber-600' : 'text-foreground-muted'}`}>
              {enviosMes}/{limiteMes}
            </span>
          </div>
          <div className="h-1 rounded-full bg-background-subtle overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pctMes >= 90 ? 'bg-red-500' : pctMes >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pctMes}%` }}
            />
          </div>
        </>
      )}

      <p className="text-[9px] text-foreground-muted mt-1.5 font-medium">
        {pctDia >= 100
          ? <span className="text-red-600 font-bold">⛔ Límite alcanzado</span>
          : `${limiteDia - enviosHoy} restantes hoy`
        }
      </p>
    </div>
  )
}
