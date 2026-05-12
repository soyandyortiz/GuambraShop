import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioPerfil } from '@/components/admin/perfil/formulario-perfil'
import { redirect } from 'next/navigation'

export default async function PáginaPerfil({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabInicial } = await searchParams
  const supabase = await crearClienteServidor()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [
    { data: config },
    { data: direcciones },
    { data: redes },
    { data: perfil },
    { data: metodosPago },
    { data: empleados },
  ] = await Promise.all([
    supabase.from('configuracion_tienda').select('*').single(),
    supabase.from('direcciones_negocio').select('id, etiqueta, direccion, ciudad, provincia, pais, es_principal, enlace_mapa').order('es_principal', { ascending: false }),
    supabase.from('redes_sociales').select('*').order('orden'),
    supabase.from('perfiles').select('id, nombre, telefono, rol').eq('id', user.id).single(),
    supabase.from('metodos_pago').select('*').order('orden'),
    supabase.from('empleados_cita').select('id, nombre_completo, activo, orden').order('orden'),
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
      metodosPago={(metodosPago as any) ?? []}
      empleados={(empleados as any) ?? []}
      tabInicial={tabInicial}
    />
  )
}
