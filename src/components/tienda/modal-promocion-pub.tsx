'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { generarEnlacePromocion } from '@/lib/whatsapp'

interface Promocion {
  id: string
  nombre: string
  descripcion: string | null
  precio: number | null
  imagen_url: string
  formato_imagen: 'cuadrado' | 'horizontal' | 'vertical'
  mensaje_whatsapp: string
}

interface Props {
  promocion: Promocion
  whatsapp: string
}

export function ModalPromocionPub({ promocion, whatsapp }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Solo mostrar una vez por sesión
    const clave = `promo_vista_${promocion.id}`
    if (sessionStorage.getItem(clave)) return
    const t = setTimeout(() => {
      setVisible(true)
      sessionStorage.setItem(clave, '1')
    }, 1500)
    return () => clearTimeout(t)
  }, [promocion.id])

  if (!visible) return null

  const mensajeWA = `Buen dia, estoy interesado en la promocion de su tienda. ${promocion.nombre}${promocion.precio ? ` - ${formatearPrecio(promocion.precio)}` : ''}`
  const urlWA = generarEnlacePromocion(whatsapp, mensajeWA)

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={() => setVisible(false)}
    >
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen — completa, sin recorte ni fondo */}
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={promocion.imagen_url} alt={promocion.nombre} className="w-full h-auto block" />
          <button
            onClick={() => setVisible(false)}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          <h3 className="font-bold text-foreground text-base">{promocion.nombre}</h3>
          {promocion.descripcion && (
            <p className="text-sm text-foreground-muted mt-1">{promocion.descripcion}</p>
          )}
          {promocion.precio && (
            <p className="text-xl font-bold text-primary mt-2">{formatearPrecio(promocion.precio)}</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setVisible(false)}
              className="flex-1 h-11 rounded-xl border border-border text-sm text-foreground-muted font-medium hover:text-foreground transition-all"
            >
              Cerrar
            </button>
            <a
              href={urlWA}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-2 flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
