'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, ShoppingCart, Store, LayoutDashboard } from 'lucide-react'
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
    { href: '/',             label: 'Inicio',     icon: Home },
    { href: '/favoritos',    label: 'Favoritos',  icon: Heart,         badge: conteoFavoritos },
    { href: '/carrito',      label: 'Carrito',    icon: ShoppingCart,  badge: conteoCarrito },
    { href: '/perfil-tienda',label: 'Tienda',     icon: Store },
  ]

  const items = esAdmin
    ? [...itemsBase, { href: '/admin/dashboard', label: 'Admin', icon: LayoutDashboard }]
    : itemsBase

  return (
    <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-sm sm:max-w-md md:max-w-lg pointer-events-none">
      <div className={cn(
        'relative flex items-center justify-around pointer-events-auto',
        'h-16 sm:h-[4.25rem] px-1 sm:px-2',
        'rounded-[2rem] sm:rounded-[2.5rem]',
        'bg-[#0f1117]/95 backdrop-blur-2xl',
        'border border-white/[0.08]',
        'shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7),0_0_0_0.5px_rgba(255,255,255,0.05)]',
      )}>

        {items.map(({ href, label, icon: Icon, badge }) => {
          const activo = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-[3px]',
                'flex-1 h-full rounded-[1.5rem] sm:rounded-[2rem]',
                'transition-all duration-200 ease-out select-none',
                'active:scale-90',
                !activo && 'hover:text-white/70',
              )}
            >
              {/* Píldora sólida con color primario para el item activo */}
              {activo && (
                <span className="absolute inset-x-1 inset-y-[6px] rounded-[1.25rem] bg-primary shadow-[0_4px_16px_rgba(0,0,0,0.35)]" />
              )}

              {/* Icono */}
              <span className="relative z-10">
                <Icon
                  className={cn(
                    'transition-all duration-200',
                    'w-[22px] h-[22px] sm:w-6 sm:h-6',
                    activo ? 'text-white scale-110' : 'text-white/40',
                  )}
                  strokeWidth={activo ? 2.25 : 1.75}
                />

                {/* Badge */}
                {badge !== undefined && badge > 0 && (
                  <span className={cn(
                    'absolute -top-1.5 -right-2',
                    'min-w-[15px] h-[15px] px-[3px]',
                    activo ? 'bg-white text-primary' : 'bg-primary text-white',
                    'text-[8px] font-black leading-none',
                    'rounded-full flex items-center justify-center',
                    'shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
                    'ring-1 ring-[#0f1117]',
                  )}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={cn(
                'relative z-10 text-[9px] sm:text-[10px] font-bold tracking-wide leading-none transition-all duration-200',
                activo ? 'text-white' : 'text-white/35',
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
