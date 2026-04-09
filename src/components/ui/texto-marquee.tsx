'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  texto: string
  className?: string
  /** Velocidad base en segundos (se ajusta proporcionalmente al largo del texto) */
  velocidad?: number
}

/**
 * Muestra texto en una sola línea.
 * Si desborda el contenedor, anima de ida y vuelta (marquee)
 * con desenfoque gaussiano en los extremos.
 */
export function TextoMarquee({ texto, className, velocidad = 3 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLSpanElement>(null)

  const [estado, setEstado] = useState<{
    activo: boolean
    dist: number
    vel: number
  }>({ activo: false, dist: 0, vel: velocidad })

  useEffect(() => {
    let frameId: number

    const medir = () => {
      const container = containerRef.current
      const text      = textRef.current
      if (!container || !text) return

      // Forzar reflow para asegurar que el layout esté calculado
      void container.getBoundingClientRect()

      const desborda = text.scrollWidth > container.clientWidth + 1

      if (desborda) {
        const dist = text.scrollWidth - container.clientWidth
        // Mínimo 2s, máximo proporcional a la distancia (30px/s)
        const vel = Math.max(2, dist / 30)
        setEstado({ activo: true, dist, vel })
      } else {
        setEstado({ activo: false, dist: 0, vel: velocidad })
      }
    }

    // Doble requestAnimationFrame: garantiza que el navegador
    // terminó el layout antes de medir
    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(medir)
    })

    return () => cancelAnimationFrame(frameId)
  }, [texto, velocidad])

  return (
    <div
      ref={containerRef}
      className="overflow-hidden whitespace-nowrap w-full"
      style={estado.activo ? {
        maskImage:
          'linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
      } : undefined}
    >
      <span
        ref={textRef}
        className={cn('inline-block', estado.activo && 'animate-texto-marquee', className)}
        style={estado.activo ? ({
          '--scroll-dist': `${estado.dist}px`,
          '--vel':         `${estado.vel}s`,
        } as React.CSSProperties) : undefined}
      >
        {texto}
      </span>
    </div>
  )
}
