import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ShoppingBag, Home, Search, MessageCircle } from 'lucide-react'

export default async function NotFound() {
  const supabase = await crearClienteServidor()
  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('nombre_tienda, logo_url, whatsapp')
    .single()

  const nombre    = config?.nombre_tienda ?? 'Tienda'
  const logo      = config?.logo_url ?? null
  const whatsapp  = config?.whatsapp ?? null
  const waUrl     = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={nombre} className="w-full h-full object-contain p-1" />
        ) : (
          <ShoppingBag className="w-8 h-8 text-primary" />
        )}
      </div>

      {/* Código 404 */}
      <p className="text-7xl font-black text-primary/20 leading-none mb-2">404</p>

      {/* Mensaje */}
      <h1 className="text-xl font-bold text-foreground mt-2">Página no encontrada</h1>
      <p className="text-sm text-foreground-muted mt-2 max-w-xs">
        La página que buscas no existe o fue movida. Aquí te dejamos algunas opciones.
      </p>

      {/* Acciones */}
      <div className="flex flex-col gap-2 w-full max-w-xs mt-8">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
        >
          <Home className="w-4 h-4" />
          Ir al inicio
        </Link>

        <Link
          href="/buscar"
          className="flex items-center justify-center gap-2 h-12 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/40 transition-all"
        >
          <Search className="w-4 h-4" />
          Buscar productos
        </Link>

        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-sm font-semibold hover:bg-[#25D366]/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar por WhatsApp
          </a>
        )}
      </div>

      <p className="text-xs text-foreground-muted mt-8">{nombre}</p>
    </div>
  )
}
