'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Star, ShoppingCart, Check, Eye, Calendar, ChevronDown } from 'lucide-react'
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
  stock?: number | null
  stockDisponibleHoy?: number | null
  variantes?: any[]
}

export function TarjetaProducto({
  id, nombre, slug, precio, precio_descuento,
  imagen_url, calificacion_promedio, total_resenas,
  etiquetas, variante_count, tipo_producto, stock, stockDisponibleHoy, variantes,
}: Props) {
  const esAlquiler = tipo_producto === 'alquiler'
  const agotado = !esAlquiler && stock !== null && stock !== undefined && stock === 0
  const pocasUnidades = !esAlquiler && stock !== null && stock !== undefined && stock > 0 && stock <= 5
  const enStock = !esAlquiler && stock !== null && stock !== undefined && stock > 5 && tipo_producto === 'producto'
  const disponibleHoy = esAlquiler ? (stockDisponibleHoy ?? null) : null
  const router = useRouter()
  const { esFavorito, toggleFavorito } = usarFavoritos()
  const { agregar } = usarCarrito()
  const [agregando, setAgregando] = useState(false)
  const [modalAgendarAbierto, setModalAgendarAbierto] = useState(false)
  
  // Gestión de variantes
  const [varianteId, setVarianteId] = useState<string>(variantes?.[0]?.id || '')
  const varianteSeleccionada = variantes?.find(v => v.id === varianteId)

  const fav = esFavorito(id)
  const descuento = precio_descuento ? calcularDescuento(precio, precio_descuento) : 0

  function agregarAlCarrito(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (tipo_producto === 'evento' || tipo_producto === 'alquiler') {
      router.push(`/producto/${slug}`)
      return
    }
    if (tipo_producto === 'servicio') {
      setModalAgendarAbierto(true)
      return
    }
    if (agregando) return
    setAgregando(true)

    const precioFinal = varianteSeleccionada?.precio_variante ?? (precio_descuento ?? precio)
    
    agregar({
      producto_id: id,
      nombre,
      slug,
      tipo_producto: tipo_producto ?? 'producto',
      imagen_url: varianteSeleccionada?.imagen_url || imagen_url,
      precio: precioFinal,
      cantidad: 1,
      variante_id: varianteSeleccionada?.id,
      nombre_variante: varianteSeleccionada?.nombre,
    })
    toast.success(`${nombre}${varianteSeleccionada ? ` (${varianteSeleccionada.nombre})` : ''} añadido`)
    setTimeout(() => setAgregando(false), 2000)
  }

  const precioActual = varianteSeleccionada?.precio_variante ?? (precio_descuento ?? precio)
  const hayDescuento = !!precio_descuento && !varianteSeleccionada

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
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-foreground-muted/20" />
            </div>
          )}
        </div>

        {/* Badges de descuento, servicio y stock */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {tipo_producto === 'evento' && (
            <div className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              Evento
            </div>
          )}
          {tipo_producto === 'servicio' && (
            <div className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              Servicio
            </div>
          )}
          {tipo_producto === 'alquiler' && (
            <div className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              Alquiler
            </div>
          )}
          {descuento > 0 && tipo_producto !== 'evento' && (
            <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
              -{descuento}%
            </div>
          )}
          {/* Badges de stock — lógica diferente según tipo */}
          {esAlquiler && disponibleHoy !== null && (
            disponibleHoy === 0 ? (
              <div className="bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
                Sin disponibilidad
              </div>
            ) : (
              <div className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
                {disponibleHoy} disponible{disponibleHoy !== 1 ? 's' : ''}
              </div>
            )
          )}
          {agotado && (
            <div className="bg-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              Agotado
            </div>
          )}
          {pocasUnidades && (stock ?? 0) <= 2 && (
            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse flex-shrink-0" />
              ¡Solo {stock === 1 ? 'queda 1' : `quedan ${stock}`}!
            </div>
          )}
          {pocasUnidades && (stock ?? 0) > 2 && (
            <div className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              Últimas {stock}
            </div>
          )}
          {enStock && (
            <div className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
              En stock
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
          <p className="text-[11px] text-foreground font-bold line-clamp-2 leading-tight min-h-[1.8rem] hover:text-primary transition-colors">
            {nombre}
          </p>
        </Link>

        {/* Precio */}
        <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
          {tipo_producto === 'evento' ? (
            <p className="text-xs font-bold text-emerald-600 leading-none">
              Desde {formatearPrecio(precio)}
            </p>
          ) : tipo_producto === 'alquiler' ? (
            <p className="text-xs font-bold text-amber-600 leading-none">
              {formatearPrecio(precio)}<span className="text-[9px] font-semibold text-foreground-muted ml-0.5">/día</span>
            </p>
          ) : (
            <>
              <p className="text-xs font-black text-emerald-600 leading-none">
                {formatearPrecio(precioActual)}
              </p>
              {hayDescuento && (
                <p className="text-[9px] text-foreground-muted leading-none">
                  <span className="line-through">{formatearPrecio(precio)}</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Selector de variantes (si existen) */}
        {variantes && variantes.length > 0 && (
          <div className="mt-1.5 relative group/select">
            <select
              value={varianteId}
              onChange={(e) => setVarianteId(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-8 pl-2 pr-7 rounded-lg bg-background-subtle border border-card-border text-[10px] font-medium text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer transition-all hover:border-primary/30"
            >
              {variantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} {v.precio_variante ? `(${formatearPrecio(v.precio_variante)})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-muted pointer-events-none group-hover/select:text-primary transition-colors" />
          </div>
        )}

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
        <div className="grid grid-cols-2 gap-1 mt-2">
          <Link
            href={`/producto/${slug}`}
            className="flex items-center justify-center gap-1 h-8 rounded-lg bg-foreground text-background text-[10px] font-bold hover:opacity-80 active:scale-95 transition-all"
          >
            <Eye className="w-3 h-3 flex-shrink-0" />
            Ver
          </Link>

          <button
            type="button"
            onClick={agregarAlCarrito}
            disabled={agregando && tipo_producto !== 'servicio' && tipo_producto !== 'evento'}
            className={cn(
              'flex items-center justify-center gap-1 h-8 rounded-lg text-[10px] font-bold active:scale-95 transition-all',
              tipo_producto === 'evento'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : agregando && tipo_producto !== 'servicio'
                  ? 'bg-green-600 text-white'
                  : (agotado || (varianteSeleccionada?.stock === 0)) && tipo_producto !== 'servicio'
                    ? 'bg-gray-400 text-white hover:opacity-90'
                    : 'bg-primary text-white hover:opacity-90'
            )}
          >
            {tipo_producto === 'evento' ? (
              <Calendar className="w-3 h-3 flex-shrink-0" />
            ) : agregando && tipo_producto !== 'servicio' ? (
              <Check className="w-3 h-3 flex-shrink-0 animate-in zoom-in duration-300" />
            ) : tipo_producto === 'servicio' ? (
              <Calendar className="w-3 h-3 flex-shrink-0" />
            ) : (
              <ShoppingCart className="w-3 h-3 flex-shrink-0" />
            )}
            {tipo_producto === 'evento'
              ? 'Cotizar'
              : agregando && tipo_producto !== 'servicio'
                ? '¡Listo!'
                : tipo_producto === 'servicio'
                  ? 'Agendar'
                  : (agotado || (varianteSeleccionada?.stock === 0))
                    ? 'Sin stock'
                    : 'Agregar'}
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
