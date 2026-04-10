'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, ShoppingCart, Store, LayoutDashboard, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usarCarrito } from '@/hooks/usar-carrito'
import { usarFavoritos } from '@/hooks/usar-favoritos'
import { useEffect, useState } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

interface Props {
  esAdmin?: boolean
}

export function NavInferior({ esAdmin: esAdminProp }: Props) {
  const pathname = usePathname()
  const { conteo: conteoCarrito } = usarCarrito()
  const { conteo: conteoFavoritos } = usarFavoritos()
  const [esAdmin, setEsAdmin] = useState(esAdminProp ?? false)

  if (pathname.startsWith('/admin')) return null

  useEffect(() => {
    if (esAdminProp !== undefined) return
    const supabase = crearClienteSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('perfiles').select('rol').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.rol === 'admin' || data?.rol === 'superadmin') setEsAdmin(true)
        })
    })
  }, [esAdminProp])

  const itemsBase = [
    { href: '/',              label: 'Inicio',     icon: Home },
    { href: '/categorias',    label: 'Categorías', icon: LayoutGrid },
    { href: '/favoritos',     label: 'Favoritos',  icon: Heart,        badge: conteoFavoritos },
    { href: '/carrito',       label: 'Carrito',    icon: ShoppingCart, badge: conteoCarrito },
    { href: '/perfil-tienda', label: 'Tienda',     icon: Store },
  ]

  const items = esAdmin
    ? [...itemsBase, { href: '/admin/dashboard', label: 'Admin', icon: LayoutDashboard }]
    : itemsBase

  return (
    <nav className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xs sm:max-w-md md:max-w-lg pointer-events-none">
      <div className={cn(
        'relative flex items-center justify-around pointer-events-auto',
        'h-[3.75rem] sm:h-[4.25rem] px-1',
        'rounded-[1.75rem] sm:rounded-[2.5rem]',
        'bg-primary',
        'shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35),0_2px_8px_-2px_rgba(0,0,0,0.2)]',
      )}>

        {items.map(({ href, label, icon: Icon, badge }) => {
          const activo = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-[3px]',
                'flex-1 h-full rounded-[1.25rem] sm:rounded-[2rem]',
                'transition-all duration-200 ease-out select-none',
                'active:scale-90',
              )}
            >
              {/* Píldora blanca para el item activo */}
              {activo && (
                <span className="absolute inset-x-1.5 inset-y-[6px] rounded-[1rem] bg-white/25 shadow-inner" />
              )}

              {/* Icono */}
              <span className="relative z-10">
                <Icon
                  className={cn(
                    'transition-all duration-200',
                    'w-[1.35rem] h-[1.35rem] sm:w-6 sm:h-6',
                    activo ? 'text-white scale-110 drop-shadow-sm' : 'text-white/60',
                  )}
                  strokeWidth={activo ? 2.5 : 1.75}
                />

                {/* Badge */}
                {badge !== undefined && badge > 0 && (
                  <span className={cn(
                    'absolute -top-1.5 -right-2',
                    'min-w-[16px] h-4 px-1',
                    'bg-white text-primary',
                    'text-[9px] font-black leading-none',
                    'rounded-full flex items-center justify-center',
                    'shadow-md',
                  )}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={cn(
                'relative z-10 text-[9px] sm:text-[10px] font-bold tracking-wide leading-none transition-all duration-200',
                activo ? 'text-white' : 'text-white/55',
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
