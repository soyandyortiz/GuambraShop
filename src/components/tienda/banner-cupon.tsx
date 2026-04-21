'use client'

import { useState } from 'react'
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

  if (cerrado) return null

  const descuento = tipo_descuento === 'porcentaje'
    ? `${valor_descuento}% de descuento`
    : `${formatearPrecio(valor_descuento, simboloMoneda)} de descuento`

  function copiar() {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="w-full bg-primary text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
        <Tag className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
        <span className="font-medium opacity-90 hidden sm:inline">Oferta especial:</span>
        <button
          onClick={copiar}
          title="Copiar código"
          className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 transition-all rounded-lg px-2.5 py-1 font-mono font-bold tracking-widest text-xs"
        >
          {codigo}
          {copiado
            ? <Check className="w-3 h-3" />
            : <Copy className="w-3 h-3 opacity-70" />
          }
        </button>
        <span className="opacity-90 text-xs">{descuento}</span>
        {vence_en && (
          <span className="flex items-center gap-1.5 text-xs opacity-90">
            · vence en
            <ContadorRegresivo
              fechaFin={vence_en}
              compacto
              className="text-white font-bold"
              onExpirado={() => setCerrado(true)}
            />
          </span>
        )}
      </div>

      <button
        onClick={() => setCerrado(true)}
        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
