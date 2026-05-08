import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaCuponesAdmin } from '@/components/admin/cupones/lista-cupones'
import Link from 'next/link'
import { Plus, Ticket } from 'lucide-react'

export default async function PáginaCupones() {
  const supabase = await crearClienteServidor()

  const { data: cupones } = await supabase
    .from('cupones')
    .select('id, codigo, tipo_descuento, valor_descuento, compra_minima, max_usos, usos_actuales, esta_activo, vence_en')
    .order('creado_en', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Cupones de Descuento</h1>
            <p className="text-sm text-foreground-muted mt-0.5">
              Gestiona los códigos promocionales y ofertas especiales
            </p>
          </div>
        </div>
        <Link href="/admin/dashboard/cupones/nuevo"
          className="flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nuevo Cupón
        </Link>
      </div>

      <ListaCuponesAdmin cupones={cupones ?? []} />
    </div>
  )
}
