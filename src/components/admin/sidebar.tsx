'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, Ticket, Megaphone,
  Settings, MessageSquare, ShoppingBag, LogOut, Star,
  ClipboardList, CalendarDays, Truck, PartyPopper, TrendingUp,
  Users, KeyRound, FileText, Mail, Receipt
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase, CLAVE_DEMO } from '@/lib/supabase/cliente'
import { DemoStore } from '@/lib/supabase/demo-store'
import { useRouter } from 'next/navigation'
import { usarConteosAdmin } from '@/hooks/usar-conteos-admin'
import type { Rol } from '@/types'

interface PropsSidebar {
  rol: Rol
  nombre: string
  fotoPerfil?: string | null
  faviconUrl?: string | null
}

interface ItemNav {
  href: string
  icono: React.ReactNode
  etiqueta: string
  badge: string | null
}

interface Seccion {
  titulo: string
  items: ItemNav[]
}

function BadgeConteo({ count, activo }: { count: number; activo: boolean }) {
  if (count === 0) return null
  return (
    <span className={cn(
      'ml-auto min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center leading-none',
      activo ? 'bg-white text-primary' : 'bg-danger text-white'
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar({ rol, nombre, fotoPerfil, faviconUrl }: PropsSidebar) {
  const pathname = usePathname()
  const router   = useRouter()
  const esSuperadmin = rol === 'superadmin'
  const { pedidosPendientes, citasPendientes, solicitudesNuevas } = usarConteosAdmin()

  const secciones: Seccion[] = [
    {
      titulo: 'Ventas',
      items: [
        { href: '/admin/dashboard/venta-nueva', icono: <Receipt className="w-3.5 h-3.5" />,      etiqueta: 'Nueva Venta',  badge: null },
        { href: '/admin/dashboard/pedidos',     icono: <ClipboardList className="w-3.5 h-3.5" />, etiqueta: 'Pedidos',      badge: 'pedidos' },
        { href: '/admin/dashboard/clientes',    icono: <Users className="w-3.5 h-3.5" />,         etiqueta: 'Clientes',     badge: null },
        { href: '/admin/dashboard/ingresos',    icono: <TrendingUp className="w-3.5 h-3.5" />,    etiqueta: 'Ingresos',     badge: null },
      ],
    },
    {
      titulo: 'Catálogo',
      items: [
        { href: '/admin/dashboard/productos',   icono: <Package className="w-3.5 h-3.5" />,   etiqueta: 'Productos',   badge: null },
        { href: '/admin/dashboard/categorias',  icono: <Tag className="w-3.5 h-3.5" />,        etiqueta: 'Categorías',  badge: null },
        { href: '/admin/dashboard/cupones',     icono: <Ticket className="w-3.5 h-3.5" />,     etiqueta: 'Cupones',     badge: null },
        { href: '/admin/dashboard/promociones', icono: <Megaphone className="w-3.5 h-3.5" />,  etiqueta: 'Promociones', badge: null },
      ],
    },
    {
      titulo: 'Servicios',
      items: [
        { href: '/admin/dashboard/calendario',  icono: <CalendarDays className="w-3.5 h-3.5" />, etiqueta: 'Calendario', badge: 'citas' },
        { href: '/admin/dashboard/solicitudes', icono: <PartyPopper className="w-3.5 h-3.5" />,  etiqueta: 'Eventos',    badge: 'solicitudes' },
        { href: '/admin/dashboard/alquileres',  icono: <KeyRound className="w-3.5 h-3.5" />,     etiqueta: 'Alquileres', badge: null },
        { href: '/admin/dashboard/envios',      icono: <Truck className="w-3.5 h-3.5" />,        etiqueta: 'Envíos',     badge: null },
      ],
    },
    {
      titulo: 'Administración',
      items: [
        { href: '/admin/dashboard/facturacion', icono: <FileText className="w-3.5 h-3.5" />, etiqueta: 'Facturación', badge: null },
        { href: '/admin/dashboard/resenas',     icono: <Star className="w-3.5 h-3.5" />,     etiqueta: 'Reseñas',     badge: null },
        ...(esSuperadmin ? [
          { href: '/admin/dashboard/mensajes', icono: <MessageSquare className="w-3.5 h-3.5" />, etiqueta: 'Mensajes',     badge: null },
          { href: '/admin/dashboard/email',    icono: <Mail className="w-3.5 h-3.5" />,           etiqueta: 'Email',        badge: null },
        ] : []),
        { href: '/admin/dashboard/perfil',      icono: <Settings className="w-3.5 h-3.5" />,  etiqueta: 'Configuración', badge: null },
      ],
    },
  ]

  function obtenerBadge(badge: string | null) {
    if (badge === 'pedidos')     return pedidosPendientes
    if (badge === 'citas')       return citasPendientes
    if (badge === 'solicitudes') return solicitudesNuevas
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

  const esActivo = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-card border-r border-border fixed left-0 top-0 bottom-0 z-40">

      {/* Logo */}
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border flex-shrink-0">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0',
          faviconUrl ? 'bg-transparent' : 'bg-primary'
        )}>
          {faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faviconUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
          )}
        </div>
        <span className="font-bold text-sm text-foreground truncate">Panel Admin</span>
        {esSuperadmin && (
          <span className="ml-auto text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-full flex-shrink-0">
            SUPER
          </span>
        )}
      </div>

      {/* Inicio */}
      <div className="px-2 pt-2">
        <Link
          href="/admin/dashboard"
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            esActivo('/admin/dashboard')
              ? 'bg-primary text-white'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
          )}
        >
          <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
          Inicio
        </Link>
      </div>

      {/* Secciones */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 mt-1">
        {secciones.map(seccion => (
          <div key={seccion.titulo} className="mb-3">
            <p className="px-2.5 py-1 text-[10px] font-bold text-foreground-muted/60 uppercase tracking-wider">
              {seccion.titulo}
            </p>
            <div className="flex flex-col gap-px">
              {seccion.items.map(item => {
                const activo = esActivo(item.href)
                const count  = obtenerBadge(item.badge)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      activo
                        ? 'bg-primary text-white'
                        : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
                    )}
                  >
                    <span className="flex-shrink-0">{item.icono}</span>
                    <span className="truncate">{item.etiqueta}</span>
                    <BadgeConteo count={count} activo={activo} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-2 border-t border-border flex-shrink-0 pt-2">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border">
            {fotoPerfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPerfil} alt={nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-primary">
                {nombre?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-foreground truncate">{nombre}</p>
            <p className="text-[9px] text-foreground-muted capitalize">{rol}</p>
          </div>
        </div>
        <button
          onClick={cerrarSesion}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
