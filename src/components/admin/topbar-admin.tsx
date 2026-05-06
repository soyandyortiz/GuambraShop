'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ExternalLink } from 'lucide-react'
import { crearClienteSupabase, CLAVE_DEMO } from '@/lib/supabase/cliente'
import { DemoStore } from '@/lib/supabase/demo-store'
import type { Rol } from '@/types'

interface Props {
  nombre: string
  email: string
  rol: Rol
  fotoPerfil?: string | null
}

export function TopbarAdmin({ nombre, email, rol, fotoPerfil }: Props) {
  const router = useRouter()

  async function cerrarSesion() {
    DemoStore.limpiar()
    localStorage.removeItem(CLAVE_DEMO)
    const supabase = crearClienteSupabase()
    await supabase.auth.signOut()
    router.push('/admin')
    router.refresh()
  }

  return (
    <header className="hidden lg:flex fixed top-0 left-60 right-0 h-11 bg-card border-b border-border z-30 items-center justify-end px-5 gap-3">

      {/* Ver tienda */}
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-primary transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Ver tienda
      </Link>

      <div className="w-px h-4 bg-border" />

      {/* Perfil */}
      <div className="flex items-center gap-2">
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
        <div className="leading-none">
          <p className="text-xs font-semibold text-foreground">{nombre}</p>
          <p className="text-[10px] text-foreground-muted truncate max-w-[160px]">{email}</p>
        </div>
        {rol === 'superadmin' && (
          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-full">
            SUPER
          </span>
        )}
      </div>

      <div className="w-px h-4 bg-border" />

      {/* Cerrar sesión */}
      <button
        onClick={cerrarSesion}
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-danger transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Salir
      </button>
    </header>
  )
}
