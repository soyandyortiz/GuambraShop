'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Star, ShoppingCart,
  Heart, Share2, MessageCircle, Package, Tag
} from 'lucide-react'
import Link from 'next/link'
import { cn, formatearPrecio, calcularDescuento } from '@/lib/utils'
import { usarCarrito } from '@/hooks/usar-carrito'
import { usarFavoritos } from '@/hooks/usar-favoritos'
import { toast } from 'sonner'
import { generarEnlaceWhatsApp } from '@/lib/whatsapp'
import { FormularioResena } from '@/components/tienda/formulario-resena'

interface Producto {
  id: string; nombre: string; slug: string; descripcion: string | null
  precio: number; precio_descuento: number | null; etiquetas: string[]
  requiere_tallas: boolean; categoria: { id: string; nombre: string; slug: string } | null
  tipo_producto: 'producto' | 'servicio'
}
interface Imagen { id: string; url: string; orden: number }
interface Variante { id: string; nombre: string; descripcion: string | null; precio_variante: number | null; orden: number }
interface Talla { id: string; talla: string; disponible: boolean; orden: number }
interface Resena { id: string; nombre_cliente: string; calificacion: number; comentario: string | null; creado_en: string }

interface Props {
  producto: Producto
  imagenes: Imagen[]
  variantes: Variante[]
  tallas: Talla[]
  resenas: Resena[]
  whatsapp: string
  nombreTienda: string
  configCitas: {
    habilitar_citas?: boolean
    hora_apertura?: string
    hora_cierre?: string
    duracion_cita_minutos?: number
  }
}

export function DetalleProductoCliente({ producto, imagenes, variantes, tallas, resenas, whatsapp, configCitas }: Props) {
  const router = useRouter()
  const { agregar } = usarCarrito()
  const { esFavorito, toggleFavorito } = usarFavoritos()

  const [imgActiva, setImgActiva] = useState(0)
  const [varianteId, setVarianteId] = useState<string | null>(variantes[0]?.id ?? null)
  const [talla, setTalla] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [tabActiva, setTabActiva] = useState<'desc' | 'resenas'>('desc')
  const [mostrarFormResena, setMostrarFormResena] = useState(false)
  const [citaFecha, setCitaFecha] = useState<string>('')
  const [citaHora, setCitaHora] = useState<string>('')

  const variante = variantes.find(v => v.id === varianteId)
  const precioBase = variante?.precio_variante ?? producto.precio_descuento ?? producto.precio
  const precioOriginal = producto.precio
  const descuento = precioBase < precioOriginal ? calcularDescuento(precioOriginal, precioBase) : 0
  const fav = esFavorito(producto.id)

  const calificacionPromedio = resenas.length
    ? resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length
    : 0

  function ejecutarAgregar() {
    agregar({
      producto_id: producto.id,
      nombre: producto.nombre,
      slug: producto.slug,
      imagen_url: imagenes[0]?.url ?? null,
      precio: precioBase,
      variante_id: varianteId ?? undefined,
      nombre_variante: variante?.nombre,
      tipo_producto: producto.tipo_producto,
      talla: talla ?? undefined,
      cantidad,
      cita: producto.tipo_producto === 'servicio' && citaFecha && citaHora ? {
        fecha: citaFecha,
        hora_inicio: citaHora,
        hora_fin: '00:00:00'
      } : undefined
    })
    toast.success('Añadido al carrito', {
      action: { label: 'Ver carrito', onClick: () => router.push('/carrito') },
    })
  }

  function agregarAlCarrito() {
    if (producto.requiere_tallas && !talla) {
      toast.error('Selecciona una talla')
      return
    }
    if (producto.tipo_producto === 'servicio' && (!citaFecha || !citaHora)) {
      toast.error('Selecciona el día y la hora para tu cita')
      return
    }
    ejecutarAgregar()
  }

  async function compartir() {
    try {
      await navigator.share({ title: producto.nombre, url: window.location.href })
    } catch {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado')
    }
  }

  function consultarWhatsApp() {
    const msg = `Hola, estoy interesado en *${producto.nombre}*${variante ? ` (${variante.nombre})` : ''}${talla ? `, talla ${talla}` : ''}.\n\nPrecio: ${formatearPrecio(precioBase)}\n\n${window.location.href}`
    window.open(generarEnlaceWhatsApp(whatsapp, encodeURIComponent(msg)), '_blank')
  }

  const anteriorImg = () => setImgActiva(i => (i - 1 + imagenes.length) % imagenes.length)
  const siguienteImg = () => setImgActiva(i => (i + 1) % imagenes.length)

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Layout: columna en móvil, 2 columnas en laptop ── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-0 lg:min-h-[calc(100vh-80px)]">

        {/* ══ COLUMNA IZQUIERDA: imágenes ══ */}
        <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-border">

          {/* Carrusel principal */}
          <div className="relative bg-background-subtle">
            <div className="aspect-square overflow-hidden">
              {imagenes.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenes[imgActiva].url}
                  alt={producto.nombre}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-foreground-muted/20" />
                </div>
              )}
            </div>

            {/* Controles carrusel */}
            {imagenes.length > 1 && (
              <>
                <button onClick={anteriorImg}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/25 hover:bg-black/45 rounded-full flex items-center justify-center text-white transition-all">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={siguienteImg}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/25 hover:bg-black/45 rounded-full flex items-center justify-center text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imagenes.map((_, i) => (
                    <button key={i} onClick={() => setImgActiva(i)}
                      className={cn('rounded-full transition-all', i === imgActiva ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-foreground-muted/30')} />
                  ))}
                </div>
              </>
            )}

            {/* Badge descuento */}
            {descuento > 0 && (
              <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-xl">
                -{descuento}%
              </div>
            )}

            {/* Acciones flotantes */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button onClick={() => toggleFavorito(producto.id)}
                className={cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all',
                  fav ? 'bg-primary text-white' : 'bg-white text-foreground-muted hover:text-primary')}>
                <Heart className={cn('w-4 h-4', fav && 'fill-current')} />
              </button>
              <button onClick={compartir}
                className="w-9 h-9 rounded-xl bg-white text-foreground-muted hover:text-primary flex items-center justify-center shadow-sm transition-all">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Miniaturas debajo del carrusel */}
          {imagenes.length > 1 && (
            <div className="flex gap-2 px-4 py-3 bg-background-subtle border-t border-border overflow-x-auto scrollbar-none">
              {imagenes.map((img, i) => (
                <button key={img.id} onClick={() => setImgActiva(i)}
                  className={cn(
                    'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all bg-white',
                    i === imgActiva ? 'border-primary' : 'border-border hover:border-primary/40'
                  )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ══ COLUMNA DERECHA: info + acciones ══ */}
        <div className="lg:overflow-y-auto lg:h-screen">

          {/* Botón volver — solo visible en móvil */}
          <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border">
            <button onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background-subtle transition-colors">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground truncate">{producto.nombre}</span>
          </div>

          {/* Info principal */}
          <div className="px-4 pt-5 pb-2 lg:pt-8 lg:px-8">
            {/* Breadcrumb */}
            {producto.categoria && (
              <Link href={`/categoria/${producto.categoria.slug}`}
                className="inline-flex items-center gap-1 text-xs text-primary mb-3 hover:underline">
                <Tag className="w-3 h-3" />
                {producto.categoria.nombre}
              </Link>
            )}

            <h1 className="text-xl font-bold text-foreground leading-snug lg:text-2xl">{producto.nombre}</h1>

            {/* Rating */}
            {resenas.length > 0 && (
              <button onClick={() => setTabActiva('resenas')} className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('w-3.5 h-3.5',
                      i < Math.round(calificacionPromedio) ? 'text-star fill-star' : 'text-border fill-border')} />
                  ))}
                </div>
                <span className="text-xs text-foreground-muted">{calificacionPromedio.toFixed(1)} · {resenas.length} reseña{resenas.length !== 1 ? 's' : ''}</span>
              </button>
            )}

            {/* Precio */}
            <div className="flex items-end gap-3 mt-4">
              <p className="text-3xl font-bold text-primary">{formatearPrecio(precioBase)}</p>
              {descuento > 0 && (
                <p className="text-sm text-foreground-muted line-through mb-1">{formatearPrecio(precioOriginal)}</p>
              )}
            </div>
          </div>

          {/* Variantes */}
          {variantes.length > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5">Variante</p>
              <div className="flex flex-wrap gap-2">
                {variantes.map(v => (
                  <button key={v.id} onClick={() => setVarianteId(v.id)}
                    className={cn('px-3 py-2 rounded-xl border text-sm transition-all',
                      varianteId === v.id
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-border text-foreground hover:border-primary/40')}>
                    <span className="font-medium">{v.nombre}</span>
                    {v.precio_variante && (
                      <span className="ml-1.5 text-xs text-foreground-muted">
                        {formatearPrecio(v.precio_variante)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tallas */}
          {producto.requiere_tallas && tallas.length > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5">Talla</p>
              <div className="flex flex-wrap gap-2">
                {tallas.map(t => (
                  <button key={t.id} onClick={() => t.disponible && setTalla(t.talla)}
                    disabled={!t.disponible}
                    className={cn(
                      'w-11 h-11 rounded-xl border text-sm font-medium transition-all',
                      !t.disponible && 'opacity-30 cursor-not-allowed line-through',
                      talla === t.talla
                        ? 'border-primary bg-primary text-white'
                        : t.disponible ? 'border-border hover:border-primary/40 text-foreground' : 'border-border text-foreground-muted'
                    )}>
                    {t.talla}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Citas */}
          {producto.tipo_producto === 'servicio' && configCitas.habilitar_citas && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5">Agenda tu cita</p>
              <div className="flex flex-col gap-3">
                <input 
                  type="date" 
                  value={citaFecha}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCitaFecha(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground"
                />
                <input 
                  type="time" 
                  value={citaHora}
                  min={configCitas.hora_apertura}
                  max={configCitas.hora_cierre}
                  step={((configCitas.duracion_cita_minutos || 30) * 60).toString()}
                  onChange={(e) => setCitaHora(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground"
                />
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="px-4 py-4 border-t border-border lg:px-8">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Cantidad</p>
              <div className="flex items-center gap-3 bg-background-subtle rounded-xl p-1">
                <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                  className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground font-bold hover:border-primary/40 transition-all">
                  −
                </button>
                <span className="w-6 text-center text-sm font-bold text-foreground tabular-nums">{cantidad}</span>
                <button onClick={() => setCantidad(c => c + 1)}
                  className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground font-bold hover:border-primary/40 transition-all">
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="px-4 py-4 border-t border-border flex gap-3 lg:px-8">
            <button onClick={consultarWhatsApp}
              className="flex-1 h-12 rounded-2xl border-2 border-primary text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-[0.97] transition-all">
              <MessageCircle className="w-4 h-4" />
              Consultar
            </button>
            <button onClick={agregarAlCarrito}
              className="flex-1 h-12 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm shadow-primary/30">
              <ShoppingCart className="w-4 h-4" />
              Añadir al carrito
            </button>
          </div>

          {/* Tabs descripción / reseñas */}
          <div className="border-t border-border">
            <div className="flex border-b border-border px-4 lg:px-8">
              {(['desc', 'resenas'] as const).map(tab => (
                <button key={tab} onClick={() => setTabActiva(tab)}
                  className={cn(
                    'flex-1 h-10 text-sm font-medium transition-all border-b-2 -mb-px',
                    tabActiva === tab ? 'border-primary text-primary' : 'border-transparent text-foreground-muted'
                  )}>
                  {tab === 'desc' ? 'Descripción' : `Reseñas (${resenas.length})`}
                </button>
              ))}
            </div>

            <div className="px-4 py-5 lg:px-8 lg:pb-24">
              {tabActiva === 'desc' ? (
                <div>
                  {producto.descripcion ? (
                    <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                      {producto.descripcion}
                    </p>
                  ) : (
                    <p className="text-sm text-foreground-muted">Sin descripción disponible.</p>
                  )}
                  {producto.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {producto.etiquetas.map(e => (
                        <span key={e} className="text-xs bg-background-subtle text-foreground-muted px-2.5 py-1 rounded-lg">
                          #{e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {resenas.length === 0 ? (
                    <p className="text-sm text-foreground-muted text-center py-6">Sin reseñas todavía. ¡Sé el primero en opinar!</p>
                  ) : (
                    resenas.map(r => (
                      <div key={r.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{r.nombre_cliente[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-foreground">{r.nombre_cliente}</p>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn('w-3 h-3',
                                  i < r.calificacion ? 'text-star fill-star' : 'text-border fill-border')} />
                              ))}
                            </div>
                          </div>
                          {r.comentario && (
                            <p className="text-sm text-foreground-muted mt-0.5 leading-relaxed">{r.comentario}</p>
                          )}
                          <p className="text-[10px] text-foreground-muted mt-1">
                            {new Date(r.creado_en).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Botón para mostrar/ocultar formulario */}
                  {!mostrarFormResena ? (
                    <button
                      onClick={() => setMostrarFormResena(true)}
                      className="w-full h-11 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:border-primary/60 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Star className="w-4 h-4" />
                      Escribir una reseña
                    </button>
                  ) : (
                    <FormularioResena
                      productoId={producto.id}
                      onEnviada={() => setMostrarFormResena(false)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>


    </div>
  )
}
