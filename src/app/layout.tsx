import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { CarritoProvider } from '@/components/providers/carrito-provider'
import { FavoritosProvider } from '@/components/providers/favoritos-provider'
import { Toaster } from 'sonner'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { obtenerPaleta } from '@/lib/paletas'
import { obtenerTema } from '@/lib/temas'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  preload: false,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await crearClienteServidor()
  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('nombre_tienda, meta_descripcion, favicon_url, logo_url, foto_portada_url, foto_perfil_url')
    .single()

  const nombre      = config?.nombre_tienda ?? 'Tienda'
  const descripcion = config?.meta_descripcion ?? 'Tu tienda online profesional'
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ogImage     = config?.foto_perfil_url ?? config?.logo_url ?? null

  return {
    title: nombre,
    description: descripcion,
    icons: config?.favicon_url
      ? { icon: config.favicon_url, shortcut: config.favicon_url }
      : { icon: '/favicon-blank.png' },
    openGraph: {
      title: nombre,
      description: descripcion,
      url: siteUrl,
      siteName: nombre,
      type: 'website',
      locale: 'es_EC',
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: nombre }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: nombre,
      description: descripcion,
      ...(ogImage && { images: [ogImage] }),
    },
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor()
  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('color_primario, tema_id')
    .single()

  const paleta = obtenerPaleta(config?.color_primario)
  const tema   = obtenerTema(config?.tema_id)

  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth"
      className={geist.variable}
      style={{
        // Variables del tema base (fondos, textos, bordes, cards)
        ...tema.vars,
        // Variables del color de acento (primary)
        '--primary': paleta.primary,
        '--primary-hover': paleta.hover,
        '--primary-foreground': paleta.foreground,
        '--input-focus': paleta.primary,
        '--danger': paleta.primary === '#ef4444' ? '#dc2626' : '#ef4444',
      } as React.CSSProperties}>
      <head />
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <CarritoProvider>
          <FavoritosProvider>
            {children}
            <Toaster position="top-right" richColors />
          </FavoritosProvider>
        </CarritoProvider>
      </body>
    </html>
  )
}


