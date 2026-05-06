import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/sidebar'
import { HeaderAdmin } from '@/components/admin/header-admin'
import { ModalMensajes } from '@/components/admin/mensajes/modal-mensajes'
import { BannerDemo } from '@/components/admin/banner-demo'
import { DemoProvider } from '@/components/providers/demo-provider'

const EMAIL_DEMO = 'demo@tiendademo.local'

export default async function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin')

  const [{ data: perfil }, { data: config }, { data: mensajesSinLeer }] = await Promise.all([
    supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single(),
    supabase.from('configuracion_tienda').select('foto_perfil_url, favicon_url').single(),
    supabase.from('mensajes_admin').select('id, asunto, cuerpo, leido, creado_en')
      .eq('leido', false).order('creado_en'),
  ])

  const nombre = perfil?.nombre ?? 'Usuario'
  const rol    = (perfil?.rol ?? 'admin') as 'admin' | 'superadmin'
  const fotoPerfil = config?.foto_perfil_url ?? null
  const faviconUrl = config?.favicon_url ?? null
  const esDemo = user.email === EMAIL_DEMO

  return (
    <DemoProvider esDemo={esDemo}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Banner demo — siempre visible en la parte superior */}
        {esDemo && <BannerDemo />}

        <div className="flex flex-1">
          {/* Sidebar desktop */}
          <Sidebar nombre={nombre} rol={rol} fotoPerfil={fotoPerfil} faviconUrl={faviconUrl} />

          <div className="flex flex-col flex-1 min-w-0 lg:ml-60">
            {/* Header móvil */}
            <HeaderAdmin nombre={nombre} rol={rol} fotoPerfil={fotoPerfil} />

            {/* Contenido principal */}
            <main className="flex-1 min-w-0 overflow-x-clip">
              <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Modal mensajes sin leer — solo para admin (no superadmin) */}
        {rol === 'admin' && mensajesSinLeer && mensajesSinLeer.length > 0 && (
          <ModalMensajes mensajes={mensajesSinLeer} />
        )}
      </div>
    </DemoProvider>
  )
}
