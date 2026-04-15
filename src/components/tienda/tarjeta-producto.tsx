'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Star, ShoppingCart, Check, Eye, Calendar } from 'lucide-react'
import { cn, formatearPrecio, calcularDescuento } from '@/lib/utils'
import { usarFavoritos } from '@/hooks/usar-favoritos'
import { usarCarrito } from '@/hooks/usar-carrito'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { TipoProducto } from '@/types'
import { ModalAgendar } from '@/components/tienda/modal-agendar'

interface Props {
  id: string
  nombre: string
  slug: string
  precio: number
  precio_descuento: number | null
  imagen_url: string | null
  calificacion_promedio?: number
  total_resenas?: number
  etiquetas?: string[]
  variante_count?: number
  tipo_producto?: TipoProducto
}

export function TarjetaProducto({
  id, nombre, slug, precio, precio_descuento,
  imagen_url, calificacion_promedio, total_resenas,
  etiquetas, variante_count, tipo_producto,
}: Props) {
  const router = useRouter()
  const { esFavorito, toggleFavorito } = usarFavoritos()
  const { agregar } = usarCarrito()
  const [agregando, setAgregando] = useState(false)
  const [modalAgendarAbierto, setModalAgendarAbierto] = useState(false)

  const fav = esFavorito(id)
  const descuento = precio_descuento ? calcularDescuento(precio, precio_descuento) : 0

  function agregarAlCarrito(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (tipo_producto === 'servicio') {
      setModalAgendarAbierto(true)
      return
    }
    if (agregando) return
    setAgregando(true)
    agregar({
      producto_id: id,
      nombre,
      slug,
      tipo_producto: tipo_producto ?? 'producto',
      imagen_url,
      precio: precio_descuento ?? precio,
      cantidad: 1,
    })
    toast.success('Añadido al carrito')
    setTimeout(() => setAgregando(false), 2000)
  }

  return (
    <>
    <div className="bg-card rounded-2xl overflow-hidden border border-card-border hover:shadow-md hover:border-border-strong transition-all duration-300 flex flex-col">

      {/* Imagen — clic navega al producto */}
      <div
        className="relative w-full flex-shrink-0 cursor-pointer"
        style={{ paddingBottom: '100%' }}
        onClick={() => router.push(`/producto/${slug}`)}
      >
        <div className="absolute inset-0 bg-background-subtle">
          {imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagen_url}
              alt={nombre}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-foreground-muted/20" />
            </div>
          )}
        </div>

        {/* Badges de descuento y servicio */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {tipo_producto === 'servicio' && (
            <div className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              Servicio
            </div>
          )}
          {descuento > 0 && (
            <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
              -{descuento}%
            </div>
          )}
        </div>

        {/* Favorito */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorito(id) }}
          className={cn(
            'absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all z-10 shadow-sm',
            fav
              ? 'bg-primary border border-primary text-white'
              : 'bg-white/90 backdrop-blur-sm border border-primary/60 text-primary hover:border-primary hover:bg-primary/5'
          )}
        >
          <Heart className={cn('w-3.5 h-3.5', fav && 'fill-current')} />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-2 gap-0.5">
        <Link href={`/producto/${slug}`} className="block">
          <p className="text-xs text-foreground font-medium line-clamp-3 leading-tight min-h-[3.75rem] hover:text-primary transition-colors">
            {nombre}
          </p>
        </Link>

        {/* Precio */}
        <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-emerald-600 leading-none">
            {formatearPrecio(precio_descuento ?? precio)}
          </p>
          {precio_descuento && (
            <p className="text-[9px] text-foreground-muted leading-none">
              Antes <span className="line-through">{formatearPrecio(precio)}</span>
            </p>
          )}
        </div>

        {/* Rating */}
        {(calificacion_promedio ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i}
                  className={cn('w-2.5 h-2.5',
                    i < Math.round(calificacion_promedio ?? 0)
                      ? 'text-star fill-star'
                      : 'text-border fill-border'
                  )}
                />
              ))}
            </div>
            {(total_resenas ?? 0) > 0 && (
              <span className="text-[8px] text-foreground-muted">({total_resenas})</span>
            )}
          </div>
        )}

        {/* Botones Ver + Agregar — siempre visibles, 2 columnas */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <Link
            href={`/producto/${slug}`}
            className="flex items-center justify-center gap-1 py-2 rounded-xl bg-foreground text-background text-[10px] font-bold hover:opacity-80 active:scale-95 transition-all"
          >
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            Ver
          </Link>

          <button
            type="button"
            onClick={agregarAlCarrito}
            disabled={agregando && tipo_producto !== 'servicio'}
            className={cn(
              'flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold active:scale-95 transition-all',
              agregando && tipo_producto !== 'servicio'
                ? 'bg-green-600 text-white'
                : 'bg-primary text-white hover:opacity-90'
            )}
          >
            {agregando && tipo_producto !== 'servicio' ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0 animate-in zoom-in duration-300" />
            ) : tipo_producto === 'servicio' ? (
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {agregando && tipo_producto !== 'servicio' ? '¡Listo!' : tipo_producto === 'servicio' ? 'Agendar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>

    {/* Modal de agendamiento para servicios */}
    {modalAgendarAbierto && tipo_producto === 'servicio' && (
      <ModalAgendar
        productoId={id}
        nombre={nombre}
        slug={slug}
        imagenUrl={imagen_url}
        precio={precio_descuento ?? precio}
        onCerrar={() => setModalAgendarAbierto(false)}
      />
    )}
    </>
  )
}
