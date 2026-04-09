import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioPerfil } from '@/components/admin/perfil/formulario-perfil'
import { redirect } from 'next/navigation'

export default async function PáginaPerfil() {
  const supabase = await crearClienteServidor()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [
    { data: config },
    { data: direcciones },
    { data: redes },
    { data: perfil },
  ] = await Promise.all([
    supabase.from('configuracion_tienda').select('*').single(),
    supabase.from('direcciones_negocio').select('id, etiqueta, direccion, ciudad, provincia, pais, es_principal, enlace_mapa').order('es_principal', { ascending: false }),
    supabase.from('redes_sociales').select('*').order('orden'),
    supabase.from('perfiles').select('id, nombre, telefono, rol').eq('id', user.id).single(),
  ])

  if (!config) {
    return (
      <div className="rounded-2xl bg-card border border-card-border p-8 text-center text-foreground-muted text-sm">
        No se encontró la configuración de la tienda. Ejecuta las migraciones.
      </div>
    )
  }

  return (
    <FormularioPerfil
      config={config}
      direcciones={direcciones ?? []}
      redes={redes ?? []}
      perfil={{ id: user.id, nombre: perfil?.nombre ?? null, telefono: perfil?.telefono ?? null }}
      rol={perfil?.rol ?? 'admin'}
    />
  )
}
