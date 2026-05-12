import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/sidebar'
import { HeaderAdmin } from '@/components/admin/header-admin'
import { TopbarAdmin } from '@/components/admin/topbar-admin'
import { ModalMensajes } from '@/components/admin/mensajes/modal-mensajes'
import { BannerDemo } from '@/components/admin/banner-demo'
import { DemoProvider } from '@/components/providers/demo-provider'
import { StorageWidgetSidebar } from '@/components/admin/storage-widget-sidebar'
import { BannerAlmacenamiento } from '@/components/admin/banner-almacenamiento'

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

        {/* Sidebar + Topbar: ambos fixed, topbar ancho completo z-50, sidebar top-11 z-40 */}
        <Sidebar nombre={nombre} rol={rol} fotoPerfil={fotoPerfil} faviconUrl={faviconUrl} footer={<StorageWidgetSidebar />} />
        <TopbarAdmin nombre={nombre} email={email} rol={rol} fotoPerfil={fotoPerfil} />

        {/* Contenido: desplazado por sidebar (ml-60) y topbar (pt-11) en desktop */}
        <div className="flex flex-col flex-1 min-w-0 lg:ml-60 lg:pt-11">
          {/* Header móvil */}
          <HeaderAdmin nombre={nombre} rol={rol} fotoPerfil={fotoPerfil} />

          <main className="flex-1 min-w-0 overflow-x-clip">
            <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
              <BannerAlmacenamiento />
              {children}
            </div>
          </main>
        </div>

        {rol === 'admin' && mensajesSinLeer && mensajesSinLeer.length > 0 && (
          <ModalMensajes mensajes={mensajesSinLeer} />
        )}
      </div>
    </DemoProvider>
  )
}
