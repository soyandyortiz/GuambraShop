'use client'

import Link from 'next/link'
import { Package, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Categoria } from '@/types'

interface Props {
  categorias: Pick<Categoria, 'id' | 'nombre' | 'slug' | 'imagen_url'>[]
}

export function CarruselCategorias({ categorias }: Props) {
  if (!categorias?.length) return null

  const esDinamico = categorias.length >= 8
  // Duplicamos solo si es dinámico para el loop infinito
  const items = esDinamico ? [...categorias, ...categorias] : categorias

  return (
    <section className="mt-6">
      <div
        className={cn(
          "relative w-full overflow-hidden",
          esDinamico && "pause-on-hover"
        )}
        style={esDinamico ? {
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        } : undefined}
      >
        <div
          className={cn(
            "py-2",
            esDinamico ? "animate-marquee" : "flex flex-wrap justify-center gap-4 px-4"
          )}
          style={esDinamico ? { '--duration': `${categorias.length * 5}s` } as React.CSSProperties : undefined}
        >
          {items.map((cat, i) => (
            <Link
              key={`${cat.id}-${i}`}
              href={`/categoria/${cat.slug}`}
              className={cn(
                "flex flex-col items-center gap-2 group flex-shrink-0",
                esDinamico ? "mx-4" : "w-[72px]"
              )}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-background-subtle border border-border group-hover:border-primary/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
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

          {/* Botón "Todas las Categorías" al final del carrusel */}
          <Link
            href="/categorias"
            className={cn(
              "flex flex-col items-center gap-2 group flex-shrink-0",
              esDinamico ? "mx-4" : "w-[72px]"
            )}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center group-hover:border-primary/60 group-hover:bg-primary/10 transition-all duration-300 group-hover:scale-105">
              <LayoutGrid className="w-7 h-7 text-primary/50 group-hover:text-primary transition-colors duration-300" />
            </div>
              <span className="text-[10px] sm:text-[11px] text-primary/60 font-bold text-center w-full leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[2rem]">
                Todas las Categorías
              </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
