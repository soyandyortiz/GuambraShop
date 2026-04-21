'use client'

import { useState, useEffect, useRef } from 'react'
import { Tag, X, Copy, Check } from 'lucide-react'
import { ContadorRegresivo } from '@/components/ui/contador-regresivo'
import { formatearPrecio } from '@/lib/utils'

interface Props {
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  vence_en: string | null
  simboloMoneda?: string
}

export function BannerCupon({ codigo, tipo_descuento, valor_descuento, vence_en, simboloMoneda = '$' }: Props) {
  const [cerrado, setCerrado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [marquee, setMarquee] = useState(false)

  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  // Detecta si el contenido desborda y activa el carrusel
  useEffect(() => {
    const comprobar = () => {
      const outer = outerRef.current
      const inner = innerRef.current
      if (!outer || !inner) return
      setMarquee(inner.offsetWidth > outer.offsetWidth)
    }

    comprobar()
    const ro = new ResizeObserver(comprobar)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [codigo, valor_descuento, vence_en])

  if (cerrado) return null

  const descuento = tipo_descuento === 'porcentaje'
    ? `${valor_descuento}% dto.`
    : `${formatearPrecio(valor_descuento, simboloMoneda)} dto.`

  function copiar() {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  // Bloque de contenido reutilizable (se renderiza 2 veces en modo marquee)
  function Segmento({ medir }: { medir?: boolean }) {
    return (
      <span
        ref={medir ? innerRef : undefined}
        className="inline-flex items-center gap-2 pr-10 whitespace-nowrap"
      >
        <Tag className="w-3.5 h-3.5 flex-shrink-0" />
        <button
          onClick={copiar}
          title="Copiar código"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-amber-400 hover:bg-gray-800 active:scale-95 transition-all rounded-lg px-2.5 py-0.5 font-mono font-bold tracking-widest text-xs"
        >
          {codigo}
          {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-70" />}
        </button>
        <span className="text-xs font-semibold">{descuento}</span>
        {vence_en && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            · vence en
            <ContadorRegresivo
              fechaFin={vence_en}
              compacto
              className="text-gray-900 font-bold"
              onExpirado={() => setCerrado(true)}
            />
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="w-full bg-amber-400 text-gray-900 px-3 py-2 flex items-center gap-2">

      {/* Área de contenido con overflow oculto */}
      <div ref={outerRef} className="flex-1 overflow-hidden min-w-0">
        {marquee ? (
          // Modo carrusel: duplica el contenido y anima
          <div
            className="flex items-center"
            style={{ animation: 'marquee-banner 18s linear infinite' }}
          >
            <Segmento />
            <Segmento />
          </div>
        ) : (
          // Modo estático: mide si desborda
          <div className="flex items-center">
            <Segmento medir />
          </div>
        )}
      </div>

      {/* Botón cerrar */}
      <button
        onClick={() => setCerrado(true)}
        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
        aria-label="Cerrar banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
