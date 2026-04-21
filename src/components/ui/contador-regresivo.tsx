'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Restante {
  horas: number
  minutos: number
  segundos: number
  diff: number
}

interface Props {
  /** ISO timestamp o Date hacia el que cuenta regresivamente */
  fechaFin: string | Date | null | undefined
  className?: string
  /** Si true muestra solo el número sin etiqueta */
  compacto?: boolean
  /** Callback cuando el tiempo llega a 0 */
  onExpirado?: () => void
}

function calcularRestante(fin: Date): Restante | null {
  const diff = fin.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    horas: Math.floor(diff / 3600000),
    minutos: Math.floor((diff % 3600000) / 60000),
    segundos: Math.floor((diff % 60000) / 1000),
    diff,
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function ContadorRegresivo({ fechaFin, className, compacto = false, onExpirado }: Props) {
  const parsarFecha = useCallback((): Date | null => {
    if (!fechaFin) return null
    const d = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin
    return isNaN(d.getTime()) ? null : d
  }, [fechaFin])

  const [restante, setRestante] = useState<Restante | null>(() => {
    const fin = parsarFecha()
    return fin ? calcularRestante(fin) : null
  })

  useEffect(() => {
    const fin = parsarFecha()
    if (!fin) return

    const tick = () => {
      const r = calcularRestante(fin)
      setRestante(r)
      if (!r) {
        clearInterval(id)
        onExpirado?.()
      }
    }

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [parsarFecha, onExpirado])

  if (!restante) return null

  const urgente = restante.diff < 3600000    // < 1 hora → rojo
  const advertencia = restante.diff < 86400000 // < 24 horas → naranja

  const texto = restante.horas > 0
    ? `${pad(restante.horas)}:${pad(restante.minutos)}:${pad(restante.segundos)}`
    : `${pad(restante.minutos)}:${pad(restante.segundos)}`

  if (compacto) {
    return (
      <span className={cn(
        'font-mono font-bold tabular-nums',
        urgente ? 'text-red-600' : advertencia ? 'text-orange-500' : 'text-foreground',
        className
      )}>
        {texto}
      </span>
    )
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-mono font-bold tabular-nums text-sm',
      urgente ? 'text-red-600' : advertencia ? 'text-orange-500' : 'text-emerald-600',
      className
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0',
        urgente ? 'bg-red-500' : advertencia ? 'bg-orange-400' : 'bg-emerald-500'
      )} />
      {texto}
    </span>
  )
}
