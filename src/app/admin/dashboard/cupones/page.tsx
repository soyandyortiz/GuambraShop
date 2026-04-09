import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaCuponesAdmin } from '@/components/admin/cupones/lista-cupones'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function PáginaCupones() {
  const supabase = await crearClienteServidor()

  const { data: cupones } = await supabase
    .from('cupones')
    .select('id, codigo, tipo_descuento, valor_descuento, compra_minima, max_usos, usos_actuales, esta_activo, vence_en')
    .order('creado_en', { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cupones</h1>
          <p className="text-xs text-foreground-muted mt-0.5">{cupones?.length ?? 0} en total</p>
        </div>
        <Link href="/admin/dashboard/cupones/nuevo"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all">
          <Plus className="w-4 h-4" /> Nuevo
        </Link>
      </div>

      <ListaCuponesAdmin cupones={cupones ?? []} />
    </div>
  )
}
