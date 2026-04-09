import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaPromocionesAdmin } from '@/components/admin/promociones/lista-promociones'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function PáginaPromociones() {
  const supabase = await crearClienteServidor()

  const { data: promociones } = await supabase
    .from('promociones')
    .select('id, nombre, descripcion, precio, imagen_url, formato_imagen, esta_activa, inicia_en, termina_en')
    .order('creado_en', { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Promociones</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Se muestran como modal al entrar a la tienda · {promociones?.length ?? 0} en total
          </p>
        </div>
        <Link href="/admin/dashboard/promociones/nueva"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all">
          <Plus className="w-4 h-4" /> Nueva
        </Link>
      </div>

      <ListaPromocionesAdmin promociones={promociones ?? []} />
    </div>
  )
}
