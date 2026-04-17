'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Star, ShoppingCart,
  Heart, Share2, MessageCircle, Package, Tag,
  Calendar, Clock, PlayCircle, X
} from 'lucide-react'
import Link from 'next/link'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn, formatearPrecio, calcularDescuento } from '@/lib/utils'
import { usarCarrito } from '@/hooks/usar-carrito'
import { usarFavoritos } from '@/hooks/usar-favoritos'
import { toast } from 'sonner'
import { generarEnlaceWhatsApp } from '@/lib/whatsapp'
import { FormularioResena } from '@/components/tienda/formulario-resena'
import { FormularioSolicitud } from '@/components/tienda/formulario-solicitud'

interface Producto {
  id: string; nombre: string; slug: string; descripcion: string | null
  precio: number; precio_descuento: number | null; etiquetas: string[]
  requiere_tallas: boolean; categoria: { id: string; nombre: string; slug: string } | null
  tipo_producto: 'producto' | 'servicio' | 'evento'
  url_video?: string | null
  stock?: number | null
}
interface Imagen { id: string; url: string; orden: number }
interface Variante { id: string; nombre: string; descripcion: string | null; precio_variante: number | null; imagen_url?: string | null; stock?: number | null; orden: number }
interface Talla { id: string; talla: string; disponible: boolean; stock?: number | null; orden: number }
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
  const [imagenVariante, setImagenVariante] = useState<string | null>(variantes[0]?.imagen_url ?? null)
  const [varianteId, setVarianteId] = useState<string | null>(variantes[0]?.id ?? null)
  const [talla, setTalla] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [tabActiva, setTabActiva] = useState<'desc' | 'resenas'>('desc')
  const [mostrarFormResena, setMostrarFormResena] = useState(false)
  const [citaFecha, setCitaFecha] = useState<string>('')
  const [citaHora, setCitaHora] = useState<string>('')
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])
  const [cargandoHoras, setCargandoHoras] = useState(false)
  const [videoAbierto, setVideoAbierto] = useState(false)

  // Convierte URL de YouTube/Vimeo a embed
  function urlEmbed(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    return null // URL genérica — se abre en nueva pestaña
  }

  // Asegurar que configCitas tenga valores por defecto si vienen nulos
  const configValida = {
    habilitar_citas: configCitas?.habilitar_citas ?? true,
    hora_apertura: configCitas?.hora_apertura ?? '09:00',
    hora_cierre: configCitas?.hora_cierre ?? '18:00',
    duracion: configCitas?.duracion_cita_minutos ?? 30
  }

  useEffect(() => {
    if (producto.tipo_producto !== 'servicio' || !citaFecha) return

    async function cargarCitas() {
      setCargandoHoras(true)
      const supabase = crearClienteSupabase()
      
      const { data } = await supabase
        .from('citas')
        .select('hora_inicio')
        .eq('producto_id', producto.id)
        .eq('fecha', citaFecha)
        
      if (data) {
        setHorasOcupadas(data.map(c => c.hora_inicio.slice(0, 5)))
      }
      setCargandoHoras(false)
    }
    
    cargarCitas()
    setCitaHora('')
  }, [citaFecha, producto.id, producto.tipo_producto])

  const slots: string[] = []
  if (configValida.hora_apertura && configValida.hora_cierre) {
    let actual = new Date(`1970-01-01T${configValida.hora_apertura}`)
    const cierre = new Date(`1970-01-01T${configValida.hora_cierre}`)
    const step = configValida.duracion
    
    while (actual < cierre) {
      slots.push(actual.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      actual.setMinutes(actual.getMinutes() + step)
    }
  }

  const variante = variantes.find(v => v.id === varianteId)
  const precioBase = variante?.precio_variante ?? producto.precio_descuento ?? producto.precio
  const precioOriginal = producto.precio
  const descuento = precioBase < precioOriginal ? calcularDescuento(precioOriginal, precioBase) : 0
  const fav = esFavorito(producto.id)

  // Stock efectivo: variante > talla > producto base (null = ilimitado)
  const stockEfectivo: number | null = (() => {
    if (producto.tipo_producto === 'servicio' || producto.tipo_producto === 'evento') return null
    if (varianteId) {
      const v = variantes.find(v => v.id === varianteId)
      if (v && v.stock !== undefined) return v.stock ?? null
    }
    if (producto.requiere_tallas && talla) {
      const t = tallas.find(t => t.talla === talla)
      if (t && t.stock !== undefined) return t.stock ?? null
    }
    return producto.stock ?? null
  })()
  const agotado = stockEfectivo !== null && stockEfectivo === 0
  const pocasUnidades = stockEfectivo !== null && stockEfectivo > 0 && stockEfectivo <= 5

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
      tipo_producto: producto.tipo_producto,
      talla: talla ?? undefined,
      cantidad,
      cita: producto.tipo_producto === 'servicio' ? {
        fecha: citaFecha,
        hora_inicio: citaHora,
        hora_fin: '00:00' // Opcional, se puede calcular sumando la duración
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
    <>
    <div className="max-w-5xl mx-auto">

      {/* ── Layout: columna en móvil, 2 columnas en laptop ── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-0 lg:min-h-[calc(100vh-80px)]">

        {/* ══ COLUMNA IZQUIERDA: imágenes ══ */}
        <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-border">

          {/* Carrusel principal */}
          <div className="relative bg-background-subtle">
            <div className="aspect-square overflow-hidden">
              {imagenVariante ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenVariante}
                  alt={producto.nombre}
                  className="w-full h-full object-contain p-4"
                />
              ) : imagenes.length > 0 ? (
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
                <button key={img.id} onClick={() => { setImgActiva(i); setImagenVariante(null) }}
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
              {producto.tipo_producto === 'evento' ? (
                <div>
                  <p className="text-sm text-foreground-muted mb-0.5">Precio referencial desde</p>
                  <p className="text-3xl font-bold text-purple-600">{formatearPrecio(precioBase)}</p>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-primary">{formatearPrecio(precioBase)}</p>
                  {descuento > 0 && (
                    <p className="text-sm text-foreground-muted line-through mb-1">{formatearPrecio(precioOriginal)}</p>
                  )}
                </>
              )}
            </div>

            {/* Disponibilidad de stock */}
            {producto.tipo_producto !== 'servicio' && producto.tipo_producto !== 'evento' && (
              <div className="mt-2">
                {agotado ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-600 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                    Sin stock
                  </span>
                ) : pocasUnidades ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    Últimas {stockEfectivo} unidades disponibles
                  </span>
                ) : stockEfectivo !== null && stockEfectivo > 5 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    En stock
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* ══ FLUJO EVENTO: formulario de solicitud de cotización ══ */}
          {producto.tipo_producto === 'evento' && (
            <FormularioSolicitud
              productoId={producto.id}
              productoNombre={producto.nombre}
              precioBase={producto.precio_descuento ?? producto.precio}
              whatsapp={whatsapp}
              simboloMoneda="$"
            />
          )}

          {/* ══ FLUJO NORMAL: variantes, tallas, cantidad, carrito ══ */}
          {/* Variantes */}
          {producto.tipo_producto !== 'evento' && variantes.length > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5">Variante</p>
              <div className="flex flex-wrap gap-2">
                {variantes.map(v => (
                  <button key={v.id} onClick={() => {
                    setVarianteId(v.id)
                    setImagenVariante(v.imagen_url ?? null)
                  }}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                      varianteId === v.id
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-border text-foreground hover:border-primary/40')}>
                    {v.imagen_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.imagen_url} alt={v.nombre} className="w-6 h-6 rounded-md object-cover border border-border flex-shrink-0" />
                    )}
                    <span className="font-medium">{v.nombre}</span>
                    {v.precio_variante && (
                      <span className="ml-0.5 text-xs text-foreground-muted">
                        {formatearPrecio(v.precio_variante)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tallas */}
          {producto.tipo_producto !== 'evento' && producto.requiere_tallas && tallas.length > 0 && (
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
          {producto.tipo_producto === 'servicio' && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" /> Selecciona el Día
              </p>
              <div className="flex flex-col gap-4">
                <input 
                  type="date" 
                  value={citaFecha}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCitaFecha(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                
                {citaFecha ? (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" /> Horarios Disponibles
                    </p>
                    {cargandoHoras ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.length > 0 ? slots.map(hora => {
                          const ocupada = horasOcupadas.includes(hora)
                          return (
                            <button
                              key={hora}
                              type="button"
                              disabled={ocupada}
                              onClick={() => setCitaHora(hora)}
                              className={cn(
                                'h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center',
                                ocupada ? 'bg-background-subtle text-foreground-muted/40 cursor-not-allowed line-through' :
                                citaHora === hora ? 'bg-primary text-white shadow-md shadow-primary/20' :
                                'bg-card border border-border text-foreground hover:border-primary/40'
                              )}
                            >
                              {hora}
                            </button>
                          )
                        }) : (
                          <p className="text-xs text-foreground-muted col-span-full">No hay horarios configurados</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-foreground-muted italic">Selecciona una fecha para ver horarios disponibles</p>
                )}
              </div>
            </div>
          )}

          {/* Cantidad — solo para productos y servicios */}
          {producto.tipo_producto !== 'evento' && <div className="px-4 py-4 border-t border-border lg:px-8">
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
          </div>}

          {/* Botón video — visible para todos los tipos */}
          {producto.url_video && (
            <div className="px-4 pt-4 lg:px-8">
              <button
                onClick={() => {
                  const embed = urlEmbed(producto.url_video!)
                  if (embed) {
                    setVideoAbierto(true)
                  } else {
                    window.open(producto.url_video!, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="w-full h-11 rounded-2xl border-2 border-blue-500 text-blue-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-[0.97] transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                {producto.tipo_producto === 'servicio' ? 'Ver video del servicio' : producto.tipo_producto === 'evento' ? 'Ver video del evento' : 'Ver video del producto'}
              </button>
            </div>
          )}

          {/* Botones de acción — solo para productos y servicios */}
          {producto.tipo_producto !== 'evento' && <div className="px-4 py-4 border-t border-border flex flex-col gap-2.5 lg:px-8">
            <div className="flex gap-3">
              <button onClick={consultarWhatsApp}
                className="flex-1 h-12 rounded-2xl border-2 border-primary text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-[0.97] transition-all">
                <MessageCircle className="w-4 h-4" />
                Consultar
              </button>
              <button onClick={agregarAlCarrito}
                className={cn(
                  'flex-1 h-12 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-sm',
                  agotado
                    ? 'bg-gray-500 shadow-gray-500/20 hover:bg-gray-500/90'
                    : 'bg-primary shadow-primary/30 hover:bg-primary/90'
                )}>
                <ShoppingCart className="w-4 h-4" />
                {agotado ? 'Agotado — Agregar igual' : 'Añadir al carrito'}
              </button>
            </div>
          </div>}

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

      {/* ── Modal de video ── */}
      {videoAbierto && producto.url_video && urlEmbed(producto.url_video) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setVideoAbierto(false)} />
          <div className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setVideoAbierto(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-xl bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="aspect-video w-full">
              <iframe
                src={urlEmbed(producto.url_video!)!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={producto.nombre}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
