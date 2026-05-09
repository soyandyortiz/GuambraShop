'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, Ticket, Megaphone,
  Settings, MessageSquare, Star,
  ClipboardList, CalendarDays, Truck, PartyPopper, TrendingUp,
  Users, KeyRound, FileText, Mail, Receipt, Printer, Calculator
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usarConteosAdmin } from '@/hooks/usar-conteos-admin'
import type { Rol } from '@/types'

interface PropsSidebar {
  rol: Rol
  nombre: string
  fotoPerfil?: string | null
  faviconUrl?: string | null  // reservado para uso futuro
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

export function Sidebar({ rol, nombre: _nombre, fotoPerfil: _fotoPerfil, faviconUrl: _faviconUrl }: PropsSidebar) {
  const pathname = usePathname()
  const esSuperadmin = rol === 'superadmin'
  const { pedidosPendientes, citasPendientes, solicitudesNuevas, alquileresVencidos } = usarConteosAdmin()

  const secciones: Seccion[] = [
    {
      titulo: 'Ventas',
      items: [
        { href: '/admin/dashboard/venta-nueva', icono: <Receipt className="w-4 h-4" />,      etiqueta: 'Nueva Venta',  badge: null },
        { href: '/admin/dashboard/pedidos',     icono: <ClipboardList className="w-4 h-4" />, etiqueta: 'Pedidos',      badge: 'pedidos' },
        { href: '/admin/dashboard/clientes',    icono: <Users className="w-4 h-4" />,         etiqueta: 'Clientes',     badge: null },
        { href: '/admin/dashboard/ingresos',    icono: <TrendingUp className="w-4 h-4" />,    etiqueta: 'Ingresos',     badge: null },
      ],
    },
    {
      titulo: 'Finanzas',
      items: [
        { href: '/admin/dashboard/cierres-caja', icono: <Calculator className="w-4 h-4" />, etiqueta: 'Cierre de Caja', badge: null },
        { href: '/admin/dashboard/egresos',      icono: <TrendingUp className="w-4 h-4" />,    etiqueta: 'Egresos',        badge: null },
      ],
    },
    {
      titulo: 'Catálogo',
      items: [
        { href: '/admin/dashboard/productos',   icono: <Package className="w-4 h-4" />,   etiqueta: 'Productos',   badge: null },
        { href: '/admin/dashboard/categorias',  icono: <Tag className="w-4 h-4" />,        etiqueta: 'Categorías',  badge: null },
        { href: '/admin/dashboard/cupones',     icono: <Ticket className="w-4 h-4" />,     etiqueta: 'Cupones',     badge: null },
        { href: '/admin/dashboard/promociones', icono: <Megaphone className="w-4 h-4" />,  etiqueta: 'Promociones', badge: null },
      ],
    },
    {
      titulo: 'Servicios',
      items: [
        { href: '/admin/dashboard/calendario',  icono: <CalendarDays className="w-4 h-4" />, etiqueta: 'Calendario', badge: 'citas' },
        { href: '/admin/dashboard/solicitudes', icono: <PartyPopper className="w-4 h-4" />,  etiqueta: 'Eventos',    badge: 'solicitudes' },
        { href: '/admin/dashboard/alquileres',  icono: <KeyRound className="w-4 h-4" />,     etiqueta: 'Alquileres', badge: 'alquileres' },
        { href: '/admin/dashboard/envios',      icono: <Truck className="w-4 h-4" />,        etiqueta: 'Envíos',     badge: null },
      ],
    },
    {
      titulo: 'Administración',
      items: [
        { href: '/admin/dashboard/facturacion', icono: <FileText className="w-4 h-4" />, etiqueta: 'Facturación', badge: null },
        { href: '/admin/dashboard/resenas',     icono: <Star className="w-4 h-4" />,     etiqueta: 'Reseñas',     badge: null },
        ...(esSuperadmin ? [
          { href: '/admin/dashboard/mensajes',  icono: <MessageSquare className="w-4 h-4" />, etiqueta: 'Mensajes',  badge: null },
          { href: '/admin/dashboard/email',     icono: <Mail className="w-4 h-4" />,          etiqueta: 'Email',     badge: null },
          { href: '/admin/dashboard/impresion', icono: <Printer className="w-4 h-4" />,       etiqueta: 'Impresión', badge: null },
        ] : []),
        { href: '/admin/dashboard/perfil',      icono: <Settings className="w-4 h-4" />,  etiqueta: 'Configuración', badge: null },
      ],
    },
  ]

  function obtenerBadge(badge: string | null) {
    if (badge === 'pedidos')     return pedidosPendientes
    if (badge === 'citas')       return citasPendientes
    if (badge === 'solicitudes') return solicitudesNuevas
    if (badge === 'alquileres')  return alquileresVencidos
    return 0
  }

  const esActivo = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border fixed left-0 top-11 bottom-0 z-40 overflow-y-auto">

      {/* Inicio */}
      <div className="px-2 pt-2">
        <Link
          href="/admin/dashboard"
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
            esActivo('/admin/dashboard')
              ? 'bg-primary text-white'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
          )}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          Inicio
        </Link>
      </div>

      {/* Secciones */}
      <nav className="px-2 pb-3 mt-1">
        {secciones.map(seccion => (
          <div key={seccion.titulo} className="mb-2">
            <p className="px-3 py-1 text-[9px] font-bold text-foreground-muted/50 uppercase tracking-widest">
              {seccion.titulo}
            </p>
            <div className="flex flex-col gap-0.5">
              {seccion.items.map(item => {
                const activo = esActivo(item.href)
                const count  = obtenerBadge(item.badge)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      activo
                        ? 'bg-primary text-white'
                        : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle'
                    )}
                  >
                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{item.icono}</span>
                    <span className="truncate">{item.etiqueta}</span>
                    <BadgeConteo count={count} activo={activo} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  )
}
