import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/sidebar'
import { HeaderAdmin } from '@/components/admin/header-admin'
import { TopbarAdmin } from '@/components/admin/topbar-admin'
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

  const nombre     = perfil?.nombre ?? 'Usuario'
  const email      = user.email ?? ''
  const rol        = (perfil?.rol ?? 'admin') as 'admin' | 'superadmin'
  const fotoPerfil = config?.foto_perfil_url ?? null
  const faviconUrl = config?.favicon_url ?? null
  const esDemo     = user.email === EMAIL_DEMO

  return (
    <DemoProvider esDemo={esDemo}>
      <div className="min-h-screen bg-background flex flex-col">
        {esDemo && <BannerDemo />}

        <div className="flex flex-1">
          {/* Sidebar desktop */}
          <Sidebar nombre={nombre} rol={rol} fotoPerfil={fotoPerfil} faviconUrl={faviconUrl} />

          {/* Topbar desktop */}
          <TopbarAdmin nombre={nombre} email={email} rol={rol} fotoPerfil={fotoPerfil} />

          <div className="flex flex-col flex-1 min-w-0 lg:ml-60">
            {/* Header móvil */}
            <HeaderAdmin nombre={nombre} rol={rol} fotoPerfil={fotoPerfil} />

            {/* Contenido principal — pt-11 para compensar la topbar desktop */}
            <main className="flex-1 min-w-0 overflow-x-clip lg:pt-11">
              <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        </div>

        {rol === 'admin' && mensajesSinLeer && mensajesSinLeer.length > 0 && (
          <ModalMensajes mensajes={mensajesSinLeer} />
        )}
      </div>
    </DemoProvider>
  )
}
