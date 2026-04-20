'use client'

import { ShoppingBag, Menu, X } from 'lucide-react'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { crearClienteSupabase, CLAVE_DEMO } from '@/lib/supabase/cliente'
import { DemoStore } from '@/lib/supabase/demo-store'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, Ticket,
  Megaphone, Settings, MessageSquare, LogOut, Star, ClipboardList, CalendarDays, Truck, TrendingUp, PartyPopper
} from 'lucide-react'
import type { Rol } from '@/types'
import { usarConteosAdmin } from '@/hooks/usar-conteos-admin'

]

interface PropsHeaderAdmin {
  nombre: string
  rol: Rol
  fotoPerfil?: string | null
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

export function HeaderAdmin({ nombre, rol, fotoPerfil }: PropsHeaderAdmin) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const esSuperadmin = rol === 'superadmin'
  const { pedidosPendientes, citasPendientes, solicitudesNuevas } = usarConteosAdmin()

  const itemsNavegacion = [
    { href: '/admin/dashboard',             icono: <LayoutDashboard className="w-4 h-4" />, etiqueta: 'Inicio',        badge: null },
    { href: '/admin/dashboard/productos',   icono: <Package className="w-4 h-4" />,         etiqueta: 'Productos',     badge: null },
    { href: '/admin/dashboard/categorias',  icono: <Tag className="w-4 h-4" />,              etiqueta: 'Categorías',    badge: null },
    { href: '/admin/dashboard/cupones',     icono: <Ticket className="w-4 h-4" />,           etiqueta: 'Cupones',       badge: null },
    { href: '/admin/dashboard/promociones', icono: <Megaphone className="w-4 h-4" />,        etiqueta: 'Promociones',   badge: null },
    { href: '/admin/dashboard/pedidos',     icono: <ClipboardList className="w-4 h-4" />,    etiqueta: 'Pedidos',       badge: 'pedidos' },
    { href: '/admin/dashboard/ingresos',   icono: <TrendingUp className="w-4 h-4" />,         etiqueta: 'Ingresos',      badge: null },
    { href: '/admin/dashboard/solicitudes',icono: <PartyPopper className="w-4 h-4" />,        etiqueta: 'Eventos',       badge: 'solicitudes' },
    { href: '/admin/dashboard/envios',      icono: <Truck className="w-4 h-4" />,             etiqueta: 'Envíos',        badge: null },
    { href: '/admin/dashboard/calendario',  icono: <CalendarDays className="w-4 h-4" />,     etiqueta: 'Calendario',    badge: 'citas' },
    { href: '/admin/dashboard/resenas',     icono: <Star className="w-4 h-4" />,             etiqueta: 'Reseñas',       badge: null },
    ...(esSuperadmin ? [
      { href: '/admin/dashboard/mensajes',    icono: <MessageSquare className="w-4 h-4" />,    etiqueta: 'Mensajes',      badge: null },
    ] : []),
    { href: '/admin/dashboard/perfil',      icono: <Settings className="w-4 h-4" />,         etiqueta: 'Perfil tienda', badge: null },
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

  return (
    <>
      {/* Header móvil/tablet */}
      <header className="lg:hidden h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 border-2 border-primary/30">
            {fotoPerfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="font-bold text-sm text-foreground">Panel Admin</span>
          {esSuperadmin && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              SUPER
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">

          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-background-subtle border border-border text-foreground-muted"
          >
            {menuAbierto ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Menú móvil desplegable */}
      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <nav className="absolute top-0 right-0 w-64 h-full bg-card border-l border-border flex flex-col shadow-2xl">
            {/* Info usuario */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border">
                  {fotoPerfil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoPerfil} alt={nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {nombre?.charAt(0)?.toUpperCase() ?? 'A'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{nombre}</p>
                  <p className="text-xs text-foreground-muted capitalize">{rol}</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto py-3 px-2">
              {itemsNavegacion.map((item) => {
                const activo = pathname === item.href
                const count  = obtenerBadge(item.badge)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuAbierto(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all',
                      activo
                        ? 'bg-primary text-white'
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

            {/* Cerrar sesión */}
            <div className="p-3 border-t border-border">
              <button
                onClick={cerrarSesion}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
