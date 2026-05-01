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
    .select('nombre_tienda, meta_descripcion')
    .single()

  const nombre      = config?.nombre_tienda ?? 'Tienda'
  const descripcion = config?.meta_descripcion ?? 'Tu tienda online profesional'
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  // Sin `icons` aquí: el favicon se inyecta dinámicamente en el <head> del
  // RootLayout usando favicon_url de la BD, para evitar conflictos con el
  // favicon estático y warnings de <link rel="preload"> con URLs externas.
  return {
    title: nombre,
    description: descripcion,
    openGraph: {
      title: nombre,
      description: descripcion,
      url: siteUrl,
      siteName: nombre,
      type: 'website',
      locale: 'es_EC',
    },
    twitter: {
      card: 'summary_large_image',
      title: nombre,
      description: descripcion,
    },
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor()
  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('color_primario, tema_id, favicon_url')
    .single()

  const paleta = obtenerPaleta(config?.color_primario)
  const tema   = obtenerTema(config?.tema_id)
  const faviconUrl = config?.favicon_url ?? '/favicon-blank.png'

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
      {/* Favicon inyectado directamente para evitar <link rel="preload"> de Next.js con URLs externas */}
      <head>
        <link rel="icon" href={faviconUrl} />
        <link rel="shortcut icon" href={faviconUrl} />
      </head>
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


