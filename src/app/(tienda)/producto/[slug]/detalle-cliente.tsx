'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Star, ShoppingCart,
  Heart, Share2, MessageCircle, Package, Tag,
  Calendar, Clock, PlayCircle, X, Check, User
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
import type { PaqueteEvento } from '@/types'

interface Producto {
  id: string; nombre: string; slug: string; descripcion: string | null
  precio: number; precio_descuento: number | null; etiquetas: string[]
  requiere_tallas: boolean; categoria: { id: string; nombre: string; slug: string } | null
  tipo_producto: 'producto' | 'servicio' | 'evento'
  url_video?: string | null
  stock?: number | null
  paquetes_evento?: PaqueteEvento[]
}
interface Imagen { id: string; url: string; orden: number }
interface Variante {
  id: string; nombre: string; descripcion: string | null; precio_variante: number | null
  imagen_url?: string | null; stock?: number | null; orden: number
  tipo_precio?: string | null  // 'reemplaza' | 'suma'
}
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
  simboloMoneda?: string
  pais?: string
  configCitas: {
    habilitar_citas?: boolean
    hora_apertura?: string
    hora_cierre?: string
    duracion_cita_minutos?: number
    capacidad_citas_simultaneas?: number
    seleccion_empleado?: boolean
  }
  empleados?: { id: string; nombre_completo: string }[]
}

export function DetalleProductoCliente({ producto, imagenes, variantes, tallas, resenas, whatsapp, simboloMoneda = '$', pais = 'EC', configCitas, empleados = [] }: Props) {
  const router = useRouter()
  const { agregar } = usarCarrito()
  const { esFavorito, toggleFavorito } = usarFavoritos()

  const [imgActiva, setImgActiva] = useState(0)
  const [imagenVariante, setImagenVariante] = useState<string | null>(null)

  // Variantes "reemplaza" — selección única
  const variantesReemplaza = variantes.filter(v => (v.tipo_precio ?? 'reemplaza') === 'reemplaza')
  // Variantes "suma" — add-ons multi-seleccionables
  const variantesExtra = variantes.filter(v => v.tipo_precio === 'suma')

  const [varianteId, setVarianteId] = useState<string | null>(variantesReemplaza[0]?.id ?? null)
  const [extrasSeleccionados, setExtrasSeleccionados] = useState<string[]>([])
  const [talla, setTalla] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [tabActiva, setTabActiva] = useState<'desc' | 'resenas'>('desc')
  const [mostrarFormResena, setMostrarFormResena] = useState(false)
  const [citaFecha, setCitaFecha] = useState<string>('')
  const [citaHora, setCitaHora] = useState<string>('')
  const [citaEmpleadoId, setCitaEmpleadoId] = useState<string>('cualquiera')
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])
  const [cargandoHoras, setCargandoHoras] = useState(false)
  const [modalEmpleado, setModalEmpleado] = useState(false)
  const [videoAbierto, setVideoAbierto] = useState(false)

  function urlEmbed(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    return null
  }

  const configValida = {
    habilitar_citas: configCitas?.habilitar_citas ?? true,
    hora_apertura: configCitas?.hora_apertura ?? '09:00',
    hora_cierre: configCitas?.hora_cierre ?? '18:00',
    duracion: configCitas?.duracion_cita_minutos ?? 30,
    capacidad: configCitas?.capacidad_citas_simultaneas ?? 1,
    seleccion_empleado: configCitas?.seleccion_empleado ?? false,
  }

  useEffect(() => {
    if (producto.tipo_producto !== 'servicio' || !citaFecha) return

    async function cargarDisponibilidad() {
      setCargandoHoras(true)
      const supabase = crearClienteSupabase()

      if (empleados.length > 0 && citaEmpleadoId !== 'cualquiera') {
        // Empleado específico: ver sus slots tomados
        const { data } = await supabase
          .from('citas')
          .select('hora_inicio')
          .eq('fecha', citaFecha)
          .eq('empleado_id', citaEmpleadoId)
          .in('estado', ['reservada', 'confirmada'])
        setHorasOcupadas(data?.map(c => c.hora_inicio.slice(0, 5)) ?? [])
      } else {
        // Sin empleado específico: contar por slot y comparar vs capacidad
        const { data } = await supabase
          .from('citas')
          .select('hora_inicio')
          .eq('fecha', citaFecha)
          .in('estado', ['reservada', 'confirmada'])
        if (data) {
          const counts: Record<string, number> = {}
          data.forEach(c => {
            const h = c.hora_inicio.slice(0, 5)
            counts[h] = (counts[h] || 0) + 1
          })
          const capacidad = empleados.length > 0
            ? empleados.length
            : configValida.capacidad
          setHorasOcupadas(
            Object.entries(counts)
              .filter(([, n]) => n >= capacidad)
              .map(([h]) => h)
          )
        } else {
          setHorasOcupadas([])
        }
      }
      setCargandoHoras(false)
    }

    cargarDisponibilidad()
    setCitaHora('')
  }, [citaFecha, citaEmpleadoId, configValida.capacidad, empleados.length, producto.tipo_producto])

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

  const variante = variantesReemplaza.find(v => v.id === varianteId)
  const precioBase = variante?.precio_variante ?? producto.precio_descuento ?? producto.precio
  const sumaExtras = extrasSeleccionados.reduce((sum, eid) => {
    const ext = variantesExtra.find(v => v.id === eid)
    return sum + (ext?.precio_variante ?? 0)
  }, 0)
  const precioTotal = precioBase + sumaExtras
  const precioOriginal = producto.precio
  const descuento = precioBase < precioOriginal ? calcularDescuento(precioOriginal, precioBase) : 0
  const fav = esFavorito(producto.id)

  const stockEfectivo: number | null = (() => {
    if (producto.tipo_producto === 'servicio' || producto.tipo_producto === 'evento') return null
    if (varianteId) {
      const v = variantesReemplaza.find(v => v.id === varianteId)
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

  function toggleExtra(id: string) {
    setExtrasSeleccionados(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  function ejecutarAgregar() {
    const extrasData = extrasSeleccionados.map(eid => {
      const ext = variantesExtra.find(v => v.id === eid)!
      return { id: eid, nombre: ext.nombre, precio: ext.precio_variante ?? 0 }
    })
    agregar({
      producto_id: producto.id,
      nombre: producto.nombre,
      slug: producto.slug,
      imagen_url: imagenes[0]?.url ?? null,
      precio: precioTotal,
      variante_id: varianteId ?? undefined,
      nombre_variante: variante?.nombre ?? undefined,
      tipo_producto: producto.tipo_producto,
      talla: talla ?? undefined,
      cantidad,
      extras: extrasData.length > 0 ? extrasData : undefined,
      cita: producto.tipo_producto === 'servicio' ? {
        fecha: citaFecha,
        hora_inicio: citaHora,
        hora_fin: '00:00',
        empleado_id: (empleados.length > 0 && citaEmpleadoId !== 'cualquiera') ? citaEmpleadoId : null,
        empleado_nombre: (empleados.length > 0 && citaEmpleadoId !== 'cualquiera')
          ? (empleados.find(e => e.id === citaEmpleadoId)?.nombre_completo ?? undefined)
          : undefined,
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
    const msg = `Hola, estoy interesado en *${producto.nombre}*${variante ? ` (${variante.nombre})` : ''}${talla ? `, talla ${talla}` : ''}.\n\nPrecio: ${formatearPrecio(precioTotal, simboloMoneda)}\n\n${window.location.href}`
    window.open(generarEnlaceWhatsApp(whatsapp, encodeURIComponent(msg)), '_blank')
  }

  const anteriorImg = () => setImgActiva(i => (i - 1 + imagenes.length) % imagenes.length)
  const siguienteImg = () => setImgActiva(i => (i + 1) % imagenes.length)

  return (
    <>
    <div className="max-w-5xl mx-auto">
      <div className="lg:grid lg:grid-cols-2 lg:gap-0 lg:min-h-[calc(100vh-80px)]">

        {/* ══ COLUMNA IZQUIERDA: imágenes ══ */}
        <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-border">
          <div className="relative bg-background-subtle">
            <div className="aspect-square overflow-hidden">
              {imagenVariante ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagenVariante} alt={producto.nombre} className="w-full h-full object-contain p-4" />
              ) : imagenes.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagenes[imgActiva].url} alt={producto.nombre} className="w-full h-full object-contain p-4" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-foreground-muted/20" />
                </div>
              )}
            </div>

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

            {descuento > 0 && (
              <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-xl">
                -{descuento}%
              </div>
            )}

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

          <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border">
            <button onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background-subtle transition-colors">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground truncate">{producto.nombre}</span>
          </div>

          {/* Info principal */}
          <div className="px-4 pt-5 pb-2 lg:pt-8 lg:px-8">
            {producto.categoria && (
              <Link href={`/categoria/${producto.categoria.slug}`}
                className="inline-flex items-center gap-1 text-xs text-primary mb-3 hover:underline">
                <Tag className="w-3 h-3" />
                {producto.categoria.nombre}
              </Link>
            )}

            <h1 className="text-xl font-bold text-foreground leading-snug lg:text-2xl">{producto.nombre}</h1>

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
                  <p className="text-3xl font-bold text-purple-600">{formatearPrecio(precioBase, simboloMoneda)}</p>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-primary">{formatearPrecio(precioTotal, simboloMoneda)}</p>
                  {sumaExtras > 0 && (
                    <p className="text-xs text-foreground-muted mb-1">
                      {formatearPrecio(precioBase, simboloMoneda)} + {formatearPrecio(sumaExtras, simboloMoneda)} add-ons
                    </p>
                  )}
                  {descuento > 0 && sumaExtras === 0 && (
                    <p className="text-sm text-foreground-muted line-through mb-1">{formatearPrecio(precioOriginal, simboloMoneda)}</p>
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

          {/* ══ Paquetes del evento ══ */}
          {producto.tipo_producto === 'evento' && (producto.paquetes_evento?.length ?? 0) > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-3">Servicios incluidos</p>
              <div className="flex flex-col gap-2">
                {producto.paquetes_evento!.map((paq, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                    <span className="text-xl flex-shrink-0 mt-0.5">{paq.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{paq.nombre}</p>
                      {paq.descripcion && (
                        <p className="text-xs text-foreground-muted mt-0.5">{paq.descripcion}</p>
                      )}
                    </div>
                    {(paq.precio_min != null || paq.precio_max != null) && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-purple-600">
                          {paq.precio_min != null && paq.precio_max != null
                            ? `${formatearPrecio(paq.precio_min, simboloMoneda)} – ${formatearPrecio(paq.precio_max, simboloMoneda)}`
                            : paq.precio_min != null
                            ? `Desde ${formatearPrecio(paq.precio_min, simboloMoneda)}`
                            : `Hasta ${formatearPrecio(paq.precio_max as number, simboloMoneda)}`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ Opciones del evento (variantes informativas) ══ */}
          {producto.tipo_producto === 'evento' && variantes.length > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-3">Opciones disponibles</p>
              <div className="flex flex-col gap-2">
                {variantes.map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-background-subtle border border-border">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {v.imagen_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.imagen_url} alt={v.nombre} className="w-8 h-8 rounded-lg object-cover border border-border flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{v.nombre}</p>
                        {v.descripcion && (
                          <p className="text-xs text-foreground-muted truncate">{v.descripcion}</p>
                        )}
                      </div>
                    </div>
                    {v.precio_variante != null && (
                      <p className="text-sm font-bold text-purple-600 flex-shrink-0">
                        {v.tipo_precio === 'suma' ? '+' : ''}{formatearPrecio(v.precio_variante, simboloMoneda)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ FLUJO EVENTO: formulario de solicitud ══ */}
          {producto.tipo_producto === 'evento' && (
            <FormularioSolicitud
              productoId={producto.id}
              productoNombre={producto.nombre}
              precioBase={producto.precio_descuento ?? producto.precio}
              whatsapp={whatsapp}
              simboloMoneda={simboloMoneda}
              pais={pais}
            />
          )}

          {/* ══ FLUJO NORMAL: variantes reemplaza ══ */}
          {producto.tipo_producto !== 'evento' && variantesReemplaza.length > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5">Variante</p>
              <div className="flex flex-wrap gap-2">
                {variantesReemplaza.map(v => (
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
                        {formatearPrecio(v.precio_variante, simboloMoneda)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ Add-ons (variantes suma) ══ */}
          {producto.tipo_producto !== 'evento' && variantesExtra.length > 0 && (
            <div className="px-4 py-4 border-t border-border lg:px-8">
              <p className="text-xs font-semibold text-foreground mb-2.5">Extras / Add-ons</p>
              <div className="flex flex-col gap-2">
                {variantesExtra.map(v => {
                  const seleccionado = extrasSeleccionados.includes(v.id)
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleExtra(v.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all',
                        seleccionado
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-border bg-card text-foreground hover:border-emerald-300'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        seleccionado ? 'border-emerald-500 bg-emerald-500' : 'border-border'
                      )}>
                        {seleccionado && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{v.nombre}</p>
                        {v.descripcion && <p className="text-xs text-foreground-muted">{v.descripcion}</p>}
                      </div>
                      {v.precio_variante !== null && (
                        <span className={cn('text-sm font-bold flex-shrink-0', seleccionado ? 'text-emerald-600' : 'text-foreground-muted')}>
                          +{formatearPrecio(v.precio_variante, simboloMoneda)}
                        </span>
                      )}
                    </button>
                  )
                })}
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
                              onClick={() => {
                                setCitaHora(hora)
                                if (empleados.length > 0) setModalEmpleado(true)
                              }}
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

                {/* Chip de empleado seleccionado */}
                {empleados.length > 0 && citaHora && (
                  <button
                    type="button"
                    onClick={() => setModalEmpleado(true)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Personal que te atiende</p>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {citaEmpleadoId === 'cualquiera'
                          ? 'Cualquier persona disponible'
                          : (empleados.find(e => e.id === citaEmpleadoId)?.nombre_completo ?? 'Cualquiera')}
                      </p>
                    </div>
                    <span className="text-xs text-primary font-semibold flex-shrink-0">Cambiar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cantidad */}
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

          {/* Botón video */}
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

          {/* Botones de acción */}
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

    {/* Modal de selección de empleado */}
    {modalEmpleado && empleados.length > 0 && (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalEmpleado(false)} />
        <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Tirante de arrastre */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Cabecera */}
          <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">¿Con quién prefieres tu cita?</h3>
              {citaFecha && citaHora && (
                <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {new Date(citaFecha + 'T00:00:00').toLocaleDateString('es-EC', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })} · {citaHora}
                </p>
              )}
            </div>
            <button
              onClick={() => setModalEmpleado(false)}
              className="w-8 h-8 rounded-xl bg-background-subtle flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Opciones */}
          <div className="p-4 flex flex-col gap-2 max-h-72 overflow-y-auto pb-safe">
            {/* Cualquier persona */}
            <button
              type="button"
              onClick={() => { setCitaEmpleadoId('cualquiera'); setModalEmpleado(false) }}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all',
                citaEmpleadoId === 'cualquiera'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background-subtle hover:border-primary/40'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg',
                citaEmpleadoId === 'cualquiera' ? 'bg-primary/20' : 'bg-border/60'
              )}>
                <User className={cn('w-5 h-5', citaEmpleadoId === 'cualquiera' ? 'text-primary' : 'text-foreground-muted')} />
              </div>
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', citaEmpleadoId === 'cualquiera' ? 'text-primary' : 'text-foreground')}>
                  Cualquier persona disponible
                </p>
                <p className="text-xs text-foreground-muted">Se asignará automáticamente</p>
              </div>
              {citaEmpleadoId === 'cualquiera' && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>

            {/* Empleados */}
            {empleados.map(emp => {
              const iniciales = emp.nombre_completo
                .split(' ')
                .slice(0, 2)
                .map(n => n[0]?.toUpperCase() ?? '')
                .join('')
              const seleccionado = citaEmpleadoId === emp.id
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => { setCitaEmpleadoId(emp.id); setModalEmpleado(false) }}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all',
                    seleccionado
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
                    seleccionado ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                  )}>
                    {iniciales}
                  </div>
                  <div className="flex-1">
                    <p className={cn('text-sm font-semibold', seleccionado ? 'text-primary' : 'text-foreground')}>
                      {emp.nombre_completo}
                    </p>
                    <p className="text-xs text-foreground-muted">Disponible</p>
                  </div>
                  {seleccionado && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Botón confirmar */}
          <div className="px-4 pb-6 pt-2">
            <button
              onClick={() => setModalEmpleado(false)}
              className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Confirmar selección
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal de video */}
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
