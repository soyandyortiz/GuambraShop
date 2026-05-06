'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Package, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Categoria } from '@/types'

interface Props {
  categorias: Pick<Categoria, 'id' | 'nombre' | 'slug' | 'imagen_url'>[]
}

const SCROLL_PX = 260

export function CarruselCategorias({ categorias }: Props) {
  if (!categorias?.length) return null

  const trackRef = useRef<HTMLDivElement>(null)
  const [mostrarIzq, setMostrarIzq] = useState(false)
  const [mostrarDer, setMostrarDer] = useState(false)

  const actualizarFlechas = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setMostrarIzq(el.scrollLeft > 4)
    setMostrarDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    actualizarFlechas()
    // Re-evaluar si cambia el tamaño de ventana
    window.addEventListener('resize', actualizarFlechas)
    return () => window.removeEventListener('resize', actualizarFlechas)
  }, [actualizarFlechas, categorias])

  function desplazar(dir: 'izq' | 'der') {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'der' ? SCROLL_PX : -SCROLL_PX, behavior: 'smooth' })
    setTimeout(actualizarFlechas, 350)
  }

  return (
    <section className="mt-6 relative px-8 sm:px-10">

      {/* ── Flecha izquierda ── */}
      <button
        onClick={() => desplazar('izq')}
        aria-label="Categorías anteriores"
        className={cn(
          'absolute left-0 top-8 sm:top-10 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full',
          'bg-card border border-border shadow-md',
          'flex items-center justify-center',
          'text-foreground-muted hover:text-primary hover:border-primary/40 hover:bg-background-subtle',
          'transition-colors duration-150',
          mostrarIzq ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* ── Track scrollable ── */}
      <div
        ref={trackRef}
        onScroll={actualizarFlechas}
        className="flex gap-3 sm:gap-5 overflow-x-auto scrollbar-none py-2"
      >
        {categorias.map((cat) => (
          <Link
            key={cat.id}
            href={`/categoria/${cat.slug}`}
            className="flex flex-col items-center gap-2 group flex-shrink-0 w-[68px] sm:w-[80px]"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-background-subtle border border-border group-hover:border-primary/40 transition-colors duration-150">
              {cat.imagen_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.imagen_url} alt={cat.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Package className="w-8 h-8 text-primary/60" />
                </div>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] text-foreground-muted font-bold text-center w-full leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[2rem]">
              {cat.nombre}
            </span>
          </Link>
        ))}

        {/* Todas las categorías */}
        <Link
          href="/categorias"
          className="flex flex-col items-center gap-2 group flex-shrink-0 w-[68px] sm:w-[80px]"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center group-hover:border-primary/60 group-hover:bg-primary/10 transition-colors duration-150">
            <LayoutGrid className="w-7 h-7 text-primary/50 group-hover:text-primary transition-colors duration-300" />
          </div>
          <span className="text-[10px] sm:text-[11px] text-primary/60 font-bold text-center w-full leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[2rem]">
            Todas las Categorías
          </span>
        </Link>
      </div>

      {/* ── Flecha derecha ── */}
      <button
        onClick={() => desplazar('der')}
        aria-label="Más categorías"
        className={cn(
          'absolute right-0 top-8 sm:top-10 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full',
          'bg-card border border-border shadow-md',
          'flex items-center justify-center',
          'text-foreground-muted hover:text-primary hover:border-primary/40 hover:bg-background-subtle',
          'transition-colors duration-150',
          mostrarDer ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

    </section>
  )
}
