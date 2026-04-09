'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface PropsBotón extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro'
  tamaño?: 'sm' | 'md' | 'lg'
  cargando?: boolean
  anchoCompleto?: boolean
}

export const Botón = forwardRef<HTMLButtonElement, PropsBotón>(({
  variante = 'primario',
  tamaño = 'md',
  cargando = false,
  anchoCompleto = false,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

  const variantes = {
    primario:   'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md',
    secundario: 'bg-background-subtle text-foreground border border-border hover:border-border-strong hover:bg-card',
    fantasma:   'text-foreground-muted hover:text-foreground hover:bg-background-subtle',
    peligro:    'bg-danger text-white hover:bg-red-700',
  }

  const tamaños = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={cn(base, variantes[variante], tamaños[tamaño], anchoCompleto && 'w-full', className)}
      {...props}
    >
      {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
})

Botón.displayName = 'Botón'
