export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaProformas } from '@/components/admin/proformas/tabla-proformas'
import Link from 'next/link'
import { Plus, ScrollText } from 'lucide-react'
import type { Proforma } from '@/types'

export default async function PáginaProformas() {
  const supabase = await crearClienteServidor()

  const [{ data: proformas }, { data: tienda }] = await Promise.all([
    supabase
      .from('proformas')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(200),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Proformas
          </h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            Cotizaciones enviadas a clientes con PDF adjunto
          </p>
        </div>
        <Link
          href="/admin/dashboard/proformas/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Proforma
        </Link>
      </div>

      <TablaProformas
        proformas={(proformas ?? []) as Proforma[]}
        simboloMoneda={tienda?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
