export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioNuevaProforma } from '@/components/admin/proformas/formulario-nueva-proforma'
import { redirect } from 'next/navigation'
import type { Producto } from '@/types'

export default async function PáginaNuevaProforma() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [{ data: productos }, { data: tienda }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, precio, precio_descuento, esta_activo, tipo_producto, tarifa_iva')
      .eq('esta_activo', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda, moneda')
      .single(),
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nueva Proforma</h1>
        <p className="text-sm text-foreground-muted mt-0.5">
          Genera una proforma y envíala por email al cliente
        </p>
      </div>
      <FormularioNuevaProforma
        productos={(productos ?? []) as Producto[]}
        simboloMoneda={tienda?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
