import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaEnviosAdmin } from '@/components/admin/envios/lista-envios'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function PáginaEnvios() {
  const supabase = await crearClienteServidor()

  const { data: zonas } = await supabase
    .from('zonas_envio')
    .select('id, provincia, ciudad, empresa_envio, precio, tiempo_entrega, esta_activa, orden')
    .order('orden')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Envíos</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {zonas?.length ?? 0} zona{zonas?.length !== 1 ? 's' : ''} configurada{zonas?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/dashboard/envios/nueva"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all">
          <Plus className="w-4 h-4" /> Nueva zona
        </Link>
      </div>

      <ListaEnviosAdmin zonas={zonas ?? []} />
    </div>
  )
}
