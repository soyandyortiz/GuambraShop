'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, Ticket, Megaphone,
  Settings, MessageSquare, ShoppingBag, LogOut, Star, ClipboardList, CalendarDays, Truck, PartyPopper
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase, CLAVE_DEMO } from '@/lib/supabase/cliente'
import { DemoStore } from '@/lib/supabase/demo-store'
import { useRouter } from 'next/navigation'
import { usarConteosAdmin } from '@/hooks/usar-conteos-admin'
import type { Rol } from '@/types'

const navegacion = [
  { href: '/admin/dashboard',             icono: <LayoutDashboard className="w-4 h-4" />, etiqueta: 'Inicio',         badge: null },
  { href: '/admin/dashboard/productos',   icono: <Package className="w-4 h-4" />,         etiqueta: 'Productos',      badge: null },
  { href: '/admin/dashboard/categorias',  icono: <Tag className="w-4 h-4" />,              etiqueta: 'Categorías',     badge: null },
  { href: '/admin/dashboard/cupones',     icono: <Ticket className="w-4 h-4" />,           etiqueta: 'Cupones',        badge: null },
  { href: '/admin/dashboard/promociones', icono: <Megaphone className="w-4 h-4" />,        etiqueta: 'Promociones',    badge: null },
  { href: '/admin/dashboard/pedidos',      icono: <ClipboardList className="w-4 h-4" />,   etiqueta: 'Pedidos',        badge: 'pedidos' },
  { href: '/admin/dashboard/solicitudes', icono: <PartyPopper className="w-4 h-4" />,      etiqueta: 'Eventos',        badge: 'solicitudes' },
  { href: '/admin/dashboard/envios',      icono: <Truck className="w-4 h-4" />,             etiqueta: 'Envíos',         badge: null },
  { href: '/admin/dashboard/calendario',  icono: <CalendarDays className="w-4 h-4" />,     etiqueta: 'Calendario',     badge: 'citas' },
  { href: '/admin/dashboard/resenas',     icono: <Star className="w-4 h-4" />,             etiqueta: 'Reseñas',        badge: null },
  { href: '/admin/dashboard/mensajes',    icono: <MessageSquare className="w-4 h-4" />,    etiqueta: 'Mensajes',       badge: null },
  { href: '/admin/dashboard/perfil',      icono: <Settings className="w-4 h-4" />,         etiqueta: 'Perfil tienda',  badge: null },
]

interface PropsSidebar {
  rol: Rol
  nombre: string
  fotoPerfil?: string | null
  faviconUrl?: string | null
}

function BadgeConteo({ count, activo }: { count: number; activo: boolean }) {
  if (count === 0) return null
  return (
    <span className={cn(
      'ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center leading-none',
      activo ? 'bg-white text-primary' : 'bg-danger text-white'
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar({ rol, nombre, fotoPerfil, faviconUrl }: PropsSidebar) {
  const pathname = usePathname()
  const router = useRouter()
  const esSuperadmin = rol === 'superadmin'
  const { pedidosPendientes, citasPendientes, solicitudesNuevas } = usarConteosAdmin()

  function obtenerBadge(badge: string | null) {
    if (badge === 'pedidos')      return pedidosPendientes
    if (badge === 'citas')        return citasPendientes
    if (badge === 'solicitudes')  return solicitudesNuevas
    return 0
  }

  async function cerrarSesion() {
    DemoStore.limpiar()
    localStorage.removeItem(CLAVE_DEMO)
    const supabase = crearClienteSupabase()
    await supabase.auth.signOut()
    router.push('/admin')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden",
          faviconUrl ? "bg-transparent" : "bg-primary"
        )}>
          {faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
          ) : (
            <ShoppingBag className="w-4 h-4 text-white" />
          )}
        </div>
        <span className="font-bold text-sm text-foreground">Panel Admin</span>
        {esSuperadmin && (
          <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
            SUPER
          </span>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="flex flex-col gap-0.5">
          {navegacion.map((item) => {
            const activo = pathname === item.href
            const count  = obtenerBadge(item.badge)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  activo
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
                )}
              >
                {item.icono}
                {item.etiqueta}
                <BadgeConteo count={count} activo={activo} />
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border">
            {fotoPerfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPerfil} alt={nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {nombre?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{nombre}</p>
            <p className="text-[10px] text-foreground-muted capitalize">{rol}</p>
          </div>
        </div>
        <button
          onClick={cerrarSesion}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
