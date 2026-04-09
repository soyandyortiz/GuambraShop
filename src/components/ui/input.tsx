'use client'

import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PropsInput extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string
  error?: string
  icono?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, PropsInput>(({
  etiqueta,
  error,
  icono,
  type,
  className,
  ...props
}, ref) => {
  const [verContraseña, setVerContraseña] = useState(false)
  const esContraseña = type === 'password'
  const tipoReal = esContraseña ? (verContraseña ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {etiqueta && (
        <label className="text-sm font-medium text-foreground">
          {etiqueta}
        </label>
      )}
      <div className="relative">
        {icono && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            {icono}
          </span>
        )}
        <input
          ref={ref}
          type={tipoReal}
          className={cn(
            'w-full h-11 rounded-xl border bg-input-bg text-foreground placeholder:text-foreground-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all duration-200 text-sm',
            icono ? 'pl-10 pr-4' : 'px-4',
            esContraseña && 'pr-11',
            error ? 'border-danger focus:ring-danger' : 'border-input-border',
            className
          )}
          {...props}
        />
        {esContraseña && (
          <button
            type="button"
            onClick={() => setVerContraseña(!verContraseña)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
          >
            {verContraseña ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
