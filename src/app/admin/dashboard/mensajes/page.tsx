import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaMensajesAdmin } from '@/components/admin/mensajes/lista-mensajes'
import { redirect } from 'next/navigation'

export default async function PáginaMensajes() {
  const supabase = await crearClienteServidor()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [{ data: mensajes }, { data: perfil }] = await Promise.all([
    supabase.from('mensajes_admin').select('id, asunto, cuerpo, leido, creado_en').order('creado_en', { ascending: false }),
    supabase.from('perfiles').select('rol').eq('id', user.id).single(),
  ])

  const rol = (perfil?.rol ?? 'admin') as 'admin' | 'superadmin'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mensajes</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          {rol === 'superadmin' ? 'Comunícate con el administrador de la tienda' : 'Mensajes del administrador del sistema'}
        </p>
      </div>

      <ListaMensajesAdmin mensajes={mensajes ?? []} rol={rol} />
    </div>
  )
}
