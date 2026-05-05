import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { TablaFacturas } from '@/components/admin/facturacion/tabla-facturas'
import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import type { Factura, ConfiguracionFacturacion } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PáginaFacturacion() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  const esSuperadmin = perfil?.rol === 'superadmin'

  const [{ data: facturas }, { data: config }] = await Promise.all([
    supabase
      .from('facturas')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100),
    supabase
      .from('configuracion_facturacion')
      .select('*')
      .maybeSingle(),
  ])

  const configActiva = config as ConfiguracionFacturacion | null

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Facturación SRI</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            Emite facturas electrónicas autorizadas por el SRI de Ecuador
          </p>
        </div>
        <div className="flex items-center gap-2">
          {esSuperadmin && (
            <Link
              href="/admin/dashboard/facturacion/configuracion"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
            >
              <Settings className="w-4 h-4" />
              Configurar SRI
            </Link>
          )}
          {configActiva && (
            <Link
              href="/admin/dashboard/facturacion/nueva"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva factura
            </Link>
          )}
        </div>
      </div>

      {/* Alerta si no hay configuración */}
      {!configActiva && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Configuración pendiente</p>
            <p className="text-sm text-amber-800 mt-0.5">
              Para emitir facturas electrónicas necesitas configurar los datos del contribuyente (RUC, certificado digital, etc.).
              {esSuperadmin
                ? ' Ve a Configurar SRI para completarlos.'
                : ' Contacta al administrador principal para configurar la facturación.'}
            </p>
          </div>
        </div>
      )}

      {/* Indicador de ambiente */}
      {configActiva && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
          configActiva.ambiente === 'produccion'
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${configActiva.ambiente === 'produccion' ? 'bg-green-500' : 'bg-amber-500'}`} />
          {configActiva.ambiente === 'produccion' ? 'Producción (facturas reales)' : 'Pruebas (SRI certificación)'}
          {' · '}RUC: {configActiva.ruc}
          {' · '}Sec. #{String(configActiva.secuencial_actual).padStart(9, '0')}
        </div>
      )}

      {/* Tabla */}
      <TablaFacturas facturas={(facturas ?? []) as Factura[]} configActiva={!!configActiva} />
    </div>
  )
}
