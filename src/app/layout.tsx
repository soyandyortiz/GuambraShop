import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { CarritoProvider } from '@/components/providers/carrito-provider'
import { FavoritosProvider } from '@/components/providers/favoritos-provider'
import { Toaster } from 'sonner'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { obtenerPaleta } from '@/lib/paletas'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
    .select('nombre_tienda, meta_descripcion, favicon_url')
    .single()

  return {
    title: config?.nombre_tienda ?? 'Tienda',
    description: config?.meta_descripcion ?? 'Tu tienda online profesional',
    icons: config?.favicon_url
      ? { icon: config.favicon_url, shortcut: config.favicon_url }
      : { icon: '/favicon-blank.png' },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor()
  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('color_primario')
    .single()

  const paleta = obtenerPaleta(config?.color_primario)

  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth"
      className={geist.variable}
      style={{
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


