'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Minus, Trash2, UserSearch, User, ShoppingCart,
  CheckCircle2, Receipt, CreditCard, Banknote, ArrowLeftRight,
  MoreHorizontal, X, Package, ChevronDown, Printer, FileText,
  RefreshCw
} from 'lucide-react'
import { imprimirTicket } from '@/lib/ticket'
import { FormularioCliente } from '@/components/admin/clientes/formulario-cliente'
import { cn, formatearPrecio, obtenerFechaEcuador, obtenerFechaEcuadorDesplazada } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import type { Cliente, TipoIdentificacionCliente } from '@/types'

// Convierte una URL de Supabase Storage a miniatura 300px para carga rápida
function thumbUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.pathname.includes('/object/public/')) {
      u.pathname = u.pathname.replace('/object/public/', '/render/image/public/')
      u.searchParams.set('quality', '60')
      u.searchParams.set('format', 'webp')
      return u.toString()
    }
  } catch { /* URL externa */ }
  return url
}

// ─── Tipos locales ────────────────────────────────────────────

interface VariantePOS {
  id: string
  nombre: string
  precio_variante: number | null
  stock_variante: number | null
  tipo_precio: string | null
}

interface ProductoPOS {
  id: string
  nombre: string
  slug: string
  tipo_producto: string
  precio: number
  precio_descuento: number | null
  stock: number | null
  imagen_url: string | null
  variantes: VariantePOS[]
  ventas: number
}

interface ItemCarritoPOS {
  key: string
  producto_id: string
  nombre: string
  imagen_url: string | null
  slug: string
  tipo_producto: string
  variante_id?: string
  nombre_variante?: string
  precio_final: number   // Para alquiler: precio_dia × dias (por traje)
  cantidad: number       // Para alquiler: número de trajes
  subtotal: number
  dias_alquiler?: number // Solo alquiler
}

type FormaPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro'

const MAPA_TIPO_SRI: Record<TipoIdentificacionCliente, string> = {
  ruc:              '04',
  cedula:           '05',
  pasaporte:        '06',
  consumidor_final: '07',
}

// ─── Props ────────────────────────────────────────────────────

interface Props {
  productos: ProductoPOS[]
  clientes: Cliente[]
  simboloMoneda: string
  pais: string
  nombreTienda?: string
  whatsappTienda?: string | null
  facturacionActiva?: boolean
  ticketAnchoPapel?: '58' | '80'
  ticketLinea1?: string | null
  ticketLinea2?: string | null
  ticketLinea3?: string | null
  ticketLinea4?: string | null
  ticketPie1?: string | null
  ticketPie2?: string | null
  ticketMostrarPrecioUnit?: boolean
}

type EstadoFactura = 'idle' | 'cargando' | 'autorizada' | 'pendiente' | 'error'

// ─── Componente ───────────────────────────────────────────────

export function PosVenta({ productos, clientes, simboloMoneda, pais = 'EC', nombreTienda = 'Mi Tienda', whatsappTienda, facturacionActiva = false, ticketAnchoPapel = '80', ticketLinea1, ticketLinea2, ticketLinea3, ticketLinea4, ticketPie1, ticketPie2, ticketMostrarPrecioUnit = true }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Búsqueda de productos
  const [busquedaProducto, setBusquedaProducto] = useState('')
  // Carrito
  const [carrito, setCarrito] = useState<ItemCarritoPOS[]>([])
  // Variante a seleccionar
  const [productoVariante, setProductoVariante] = useState<ProductoPOS | null>(null)
  // Alquiler
  const [productoAlquiler, setProductoAlquiler] = useState<ProductoPOS | null>(null)
  const [cantidadAlquiler, setCantidadAlquiler] = useState(1)
  const [diasAlquiler, setDiasAlquiler] = useState(1)
  // Cliente
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(false)
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false)
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  // Pago y notas
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo')
  // Estado de creación
  const [creando, setCreando] = useState(false)
  const [ventaCreada, setVentaCreada] = useState<{ id: string; numero_orden: string } | null>(null)
  // Factura SRI (pantalla de éxito)
  const [estadoFactura, setEstadoFactura]     = useState<EstadoFactura>('idle')
  const [facturaInfo, setFacturaInfo]         = useState<{ id: string; numero?: string } | null>(null)
  const [errorFactura, setErrorFactura]       = useState<string | null>(null)
  // Pestaña móvil
  const [pestaña, setPestaña] = useState<'productos' | 'carrito'>('productos')

  // ─── Productos filtrados (tiempo real) ───────────────────

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProducto.toLowerCase().trim()
    if (!texto) return productos
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(texto)
    )
  }, [productos, busquedaProducto])

  // ─── Clientes filtrados ───────────────────────────────────

  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente.toLowerCase().trim()
    if (texto.length < 2) return []
    const palabras = texto.split(/\s+/)
    return clientes.filter(c => {
      const haystack = [
        c.razon_social,
        c.identificacion,
        c.email ?? '',
        c.telefono ?? '',
      ].join(' ').toLowerCase()
      return palabras.every(p => haystack.includes(p))
    }).slice(0, 10)
  }, [clientes, busquedaCliente])

  // ─── Descuento manual ────────────────────────────────────

  const [descTipo, setDescTipo]   = useState<'pct' | 'fijo'>('pct')
  const [descValor, setDescValor] = useState('')

  // ─── Totales ──────────────────────────────────────────────

  const subtotal      = carrito.reduce((s, i) => s + i.subtotal, 0)
  const totalItems    = carrito.reduce((s, i) => s + i.cantidad, 0)
  const descuentoMonto = useMemo(() => {
    const val = parseFloat(descValor) || 0
    if (val <= 0 || subtotal <= 0) return 0
    if (descTipo === 'pct') return +Math.min(subtotal, subtotal * val / 100).toFixed(2)
    return +Math.min(subtotal, val).toFixed(2)
  }, [descValor, descTipo, subtotal])
  const total = +(subtotal - descuentoMonto).toFixed(2)

  // ─── Funciones de carrito ─────────────────────────────────

  function agregarProducto(producto: ProductoPOS, varianteId?: string) {
    const variante = varianteId ? producto.variantes.find(v => v.id === varianteId) : undefined
    let precio = producto.precio_descuento ?? producto.precio
    if (variante) {
      if (variante.tipo_precio === 'reemplaza') precio = variante.precio_variante ?? precio
      else if (variante.tipo_precio === 'suma')  precio = precio + (variante.precio_variante ?? 0)
    }

    const key = `${producto.id}-${varianteId ?? 'base'}`
    setCarrito(prev => {
      const existente = prev.find(i => i.key === key)
      if (existente) {
        return prev.map(i => i.key === key
          ? { ...i, cantidad: i.cantidad + 1, subtotal: +(( i.cantidad + 1) * i.precio_final).toFixed(2) }
          : i
        )
      }
      return [...prev, {
        key,
        producto_id:     producto.id,
        nombre:          producto.nombre,
        imagen_url:      producto.imagen_url,
        slug:            producto.slug,
        tipo_producto:   producto.tipo_producto,
        variante_id:     varianteId,
        nombre_variante: variante?.nombre,
        precio_final:    +precio.toFixed(2),
        cantidad:        1,
        subtotal:        +precio.toFixed(2),
      }]
    })
    setProductoVariante(null)
    // Cambiar a carrito en móvil
    if (window.innerWidth < 1024) setPestaña('carrito')
  }

  function cambiarCantidad(key: string, delta: number) {
    setCarrito(prev => prev
      .map(i => i.key === key
        ? { ...i, cantidad: i.cantidad + delta, subtotal: +((i.cantidad + delta) * i.precio_final).toFixed(2) }
        : i
      )
      .filter(i => i.cantidad > 0)
    )
  }

  function eliminarItem(key: string) {
    setCarrito(prev => prev.filter(i => i.key !== key))
  }

  function clickProducto(producto: ProductoPOS) {
    if (producto.tipo_producto === 'alquiler') {
      setCantidadAlquiler(1)
      setDiasAlquiler(1)
      setProductoAlquiler(producto)
      return
    }
    if (producto.variantes.length > 0) {
      setProductoVariante(producto)
    } else {
      agregarProducto(producto)
    }
  }

  function agregarAlquiler() {
    if (!productoAlquiler) return
    const precioDia = productoAlquiler.precio_descuento ?? productoAlquiler.precio
    const precioFinal = +(precioDia * diasAlquiler).toFixed(2)
    const key = `${productoAlquiler.id}-alq-${diasAlquiler}d-${Date.now()}`
    setCarrito(prev => [...prev, {
      key,
      producto_id:   productoAlquiler.id,
      nombre:        productoAlquiler.nombre,
      imagen_url:    productoAlquiler.imagen_url,
      slug:          productoAlquiler.slug,
      tipo_producto: productoAlquiler.tipo_producto,
      precio_final:  precioFinal,
      cantidad:      cantidadAlquiler,
      subtotal:      +(precioFinal * cantidadAlquiler).toFixed(2),
      dias_alquiler: diasAlquiler,
    }])
    setProductoAlquiler(null)
    if (window.innerWidth < 1024) setPestaña('carrito')
  }

  // ─── Crear venta ──────────────────────────────────────────

  async function crearVenta() {
    if (carrito.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (!clienteSeleccionado && !esConsumidorFinal) {
      toast.error('Selecciona un cliente o elige Consumidor Final')
      return
    }

    const nombres  = esConsumidorFinal ? 'Consumidor Final' : (clienteSeleccionado?.razon_social ?? '')
    const telefono = clienteSeleccionado?.telefono ?? ''
    const emailFinal = clienteSeleccionado?.email ?? `consumidor-${Date.now()}@venta.local`

    const items = carrito.map(i => ({
      producto_id:   i.producto_id,
      nombre:        i.dias_alquiler
        ? `${i.nombre} — ${i.cantidad} traje${i.cantidad !== 1 ? 's' : ''} × ${i.dias_alquiler} día${i.dias_alquiler !== 1 ? 's' : ''}`
        : i.nombre_variante ? `${i.nombre} — ${i.nombre_variante}` : i.nombre,
      slug:          i.slug,
      tipo_producto: i.tipo_producto,
      imagen_url:    i.imagen_url,
      precio:        i.precio_final,
      variante:      i.nombre_variante,
      cantidad:      i.cantidad,
      subtotal:      i.subtotal,
      dias_alquiler: i.dias_alquiler,
    }))

    const datos_facturacion = esConsumidorFinal
      ? { tipo_identificacion: '07', identificacion: '9999999999999', razon_social: 'Consumidor Final', email: null, direccion: null, telefono: null }
      : clienteSeleccionado
      ? {
          tipo_identificacion: MAPA_TIPO_SRI[clienteSeleccionado.tipo_identificacion],
          identificacion:      clienteSeleccionado.identificacion,
          razon_social:        clienteSeleccionado.razon_social,
          email:               clienteSeleccionado.email ?? null,
          direccion:           clienteSeleccionado.direccion ?? null,
          telefono:            clienteSeleccionado.telefono ?? null,
        }
      : null

    setCreando(true)
    const supabase = crearClienteSupabase()
    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        tipo:             'local',
        cliente_id:       esConsumidorFinal ? null : (clienteSeleccionado?.id ?? null),
        nombres,
        email:            emailFinal.toLowerCase(),
        whatsapp:         (telefono || '0').replace(/\D/g, '') || '0',
        items,
        simbolo_moneda:   simboloMoneda,
        subtotal:         +subtotal.toFixed(2),
        descuento_cupon:  descuentoMonto,
        cupon_codigo:     descuentoMonto > 0 ? 'DESC' : null,
        costo_envio:      0,
        total,
        forma_pago:       formaPago,
        es_venta_manual:  true,
        datos_facturacion,
      })
      .select('id, numero_orden')
      .single()

    setCreando(false)
    if (error) { toast.error('Error al crear la venta'); return }

    // Decrementar stock de productos físicos
    const supabaseStock = crearClienteSupabase()
    await Promise.allSettled(
      carrito
        .filter(i => i.tipo_producto === 'producto')
        .map(i =>
          supabaseStock.rpc('decrementar_stock', {
            p_producto_id: i.producto_id,
            p_cantidad:    i.cantidad,
            p_variante_id: i.variante_id ?? null,
          })
        )
    )

    // Registrar alquileres vendidos por POS
    const alquileresCarrito = carrito.filter(i => i.tipo_producto === 'alquiler' && i.dias_alquiler)
    if (alquileresCarrito.length > 0) {
      const hoy = obtenerFechaEcuador()
      const alqPayload = alquileresCarrito.map(i => {
        return {
          pedido_id:    data.id,
          producto_id:  i.producto_id,
          fecha_inicio: hoy,
          fecha_fin:    obtenerFechaEcuadorDesplazada(i.dias_alquiler ?? 1),
          dias:         i.dias_alquiler ?? 1,
          cantidad:     i.cantidad,
          hora_recogida: null,
          estado:       'activo',
        }
      })
      await supabase.from('alquileres').insert(alqPayload)
    }

    // Registrar citas para servicios vendidos por POS (fecha = hoy, hora = ahora)
    const serviciosCarrito = carrito.filter(i => i.tipo_producto === 'servicio')
    if (serviciosCarrito.length > 0) {
      const ahora      = new Date()
      const horaInicio = ahora.toTimeString().slice(0, 8)
      ahora.setHours(ahora.getHours() + 1)
      const horaFin    = ahora.toTimeString().slice(0, 8)
      const fecha      = obtenerFechaEcuador()
      const citasPayload = serviciosCarrito.map(i => ({
        pedido_id:   data.id,
        producto_id: i.producto_id,
        fecha,
        hora_inicio: horaInicio,
        hora_fin:    horaFin,
        empleado_id: null,
        estado:      'confirmada',
      }))
      await supabase.from('citas').insert(citasPayload)
    }

    setVentaCreada(data)
    toast.success(`Venta #${data.numero_orden} registrada`)
    startTransition(() => router.refresh())
  }

  async function emitirFacturaPOS() {
    if (!ventaCreada) return
    setEstadoFactura('cargando')
    setErrorFactura(null)
    try {
      const res  = await fetch('/api/facturacion/desde-pedido', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pedidoId: ventaCreada.id }),
      })
      const data = await res.json()

      if (data.ok && data.estado === 'autorizada') {
        setEstadoFactura('autorizada')
        setFacturaInfo({ id: data.facturaId, numero: data.numeroFactura })
        toast.success(`Factura ${data.numeroFactura ?? ''} autorizada por el SRI`)
      } else if (data.estado === 'enviada') {
        setEstadoFactura('pendiente')
        setFacturaInfo({ id: data.facturaId })
        toast.info('El SRI está procesando la autorización. Consulta en Facturación.', { duration: 8000 })
      } else {
        setEstadoFactura('error')
        setErrorFactura(data.error ?? 'El SRI rechazó el comprobante')
        toast.error(data.error ?? 'Error al emitir la factura', { duration: 8000 })
      }
    } catch {
      setEstadoFactura('error')
      setErrorFactura('Error de conexión')
      toast.error('Error de conexión al emitir la factura')
    }
  }

  function nuevaVenta() {
    setCarrito([])
    setClienteSeleccionado(null)
    setEsConsumidorFinal(false)
    setBusquedaCliente('')
    setFormaPago('efectivo')
    setDescValor('')
    setDescTipo('pct')
    setVentaCreada(null)
    setEstadoFactura('idle')
    setFacturaInfo(null)
    setErrorFactura(null)
    setPestaña('productos')
  }

  // ─── Pantalla de éxito ────────────────────────────────────

  if (ventaCreada) {
    const datosTicket = {
      numero_orden:    ventaCreada.numero_orden,
      creado_en:       new Date().toISOString(),
      nombres:         esConsumidorFinal ? 'Consumidor Final' : (clienteSeleccionado?.razon_social ?? ''),
      tipo:            'local' as const,
      forma_pago:      formaPago,
      items:           carrito.map(i => ({
        nombre:   i.nombre_variante ? `${i.nombre} — ${i.nombre_variante}` : i.nombre,
        cantidad: i.cantidad,
        precio:   i.precio_final,
        subtotal: i.subtotal,
      })),
      subtotal,
      descuento_cupon: descuentoMonto,
      costo_envio:     0,
      total,
    }
    const cfgTicket = {
      nombreTienda, simboloMoneda,
      anchoPapel:        ticketAnchoPapel,
      linea1:            ticketLinea1 ?? null,
      linea2:            ticketLinea2 ?? null,
      linea3:            ticketLinea3 ?? null,
      linea4:            ticketLinea4 ?? null,
      pie1:              ticketPie1   ?? null,
      pie2:              ticketPie2   ?? null,
      mostrarPrecioUnit: ticketMostrarPrecioUnit,
    }

    return (
      <div className="rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-4 max-w-sm mx-auto">

        {/* Cabecera de éxito */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <p className="text-lg font-bold text-foreground">Venta registrada</p>
          <p className="text-2xl font-black text-primary">#{ventaCreada.numero_orden}</p>
          <p className="text-sm text-foreground-muted">
            <span className="font-semibold text-foreground">{formatearPrecio(subtotal, simboloMoneda)}</span>
            {' · '}{formaPago}
          </p>
        </div>

        {/* Acciones de documento */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide text-center">
            Documento de salida
          </p>

          {/* Ticket térmico */}
          <button
            onClick={() => imprimirTicket(datosTicket, cfgTicket)}
            className="w-full h-10 rounded-xl border border-border text-sm font-semibold text-foreground-muted hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir ticket {ticketAnchoPapel}mm
          </button>

          {/* Factura SRI */}
          {facturacionActiva && (
            <div className="flex flex-col gap-1.5">
              {estadoFactura === 'idle' && (
                <button
                  onClick={emitirFacturaPOS}
                  className="w-full h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
                >
                  <FileText className="w-4 h-4" /> Emitir factura electrónica SRI
                </button>
              )}

              {estadoFactura === 'cargando' && (
                <div className="w-full h-10 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Enviando al SRI…
                </div>
              )}

              {estadoFactura === 'autorizada' && facturaInfo && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700">Factura autorizada por el SRI</p>
                      {facturaInfo.numero && (
                        <p className="text-[11px] text-emerald-600 font-mono">{facturaInfo.numero}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/facturacion/ride?id=${facturaInfo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Descargar RIDE PDF
                  </a>
                </div>
              )}

              {estadoFactura === 'pendiente' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> SRI procesando autorización…
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1">
                    El SRI recibió el comprobante. Consulta el estado en{' '}
                    <a href="/admin/dashboard/facturacion" className="underline font-semibold">Facturación</a>.
                  </p>
                </div>
              )}

              {estadoFactura === 'error' && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 px-3 py-2.5 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-red-700">Error al emitir</p>
                  {errorFactura && <p className="text-[11px] text-red-600 break-words">{errorFactura}</p>}
                  <button
                    onClick={emitirFacturaPOS}
                    className="h-7 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navegación */}
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            onClick={() => router.push('/admin/dashboard/pedidos')}
            className="flex-1 h-9 rounded-xl border border-input-border text-sm text-foreground-muted hover:bg-background-subtle flex items-center justify-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4" /> Ver pedido
          </button>
          <button
            onClick={nuevaVenta}
            className="flex-1 h-9 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Nueva venta
          </button>
        </div>

      </div>
    )
  }

  // ─── Layout principal ─────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* Pestañas móvil */}
      <div className="flex lg:hidden gap-1 bg-background-subtle rounded-xl p-1">
        <button
          onClick={() => setPestaña('productos')}
          className={cn('flex-1 h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-2',
            pestaña === 'productos' ? 'bg-card shadow text-foreground' : 'text-foreground-muted'
          )}
        >
          <Package className="w-4 h-4" /> Productos
        </button>
        <button
          onClick={() => setPestaña('carrito')}
          className={cn('flex-1 h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 relative',
            pestaña === 'carrito' ? 'bg-card shadow text-foreground' : 'text-foreground-muted'
          )}
        >
          <ShoppingCart className="w-4 h-4" /> Carrito
          {totalItems > 0 && (
            <span className="absolute top-1.5 right-3 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Layout 2 columnas: productos | formulario */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">

        {/* ─── Columna izquierda: buscador + catálogo ──────── */}
        <div className={cn('flex flex-col gap-4', pestaña !== 'productos' && 'hidden lg:flex')}>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar producto…"
              value={busquedaProducto}
              onChange={e => setBusquedaProducto(e.target.value)}
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {busquedaProducto && (
              <button onClick={() => setBusquedaProducto('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-foreground-muted" />
              </button>
            )}
          </div>

          {/* Catálogo — scroll infinito con la página */}
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-foreground-muted text-sm">
              {busquedaProducto
                ? <>Sin resultados para <strong>&quot;{busquedaProducto}&quot;</strong></>
                : 'No hay productos activos'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {productosFiltrados.map((producto, idx) => {
                const precio   = producto.precio_descuento ?? producto.precio
                const sinStock = producto.stock !== null && producto.stock <= 0 && producto.tipo_producto === 'producto'
                const esTop    = idx === 0 && producto.ventas > 0
                return (
                  <button
                    key={producto.id}
                    onClick={() => !sinStock && clickProducto(producto)}
                    disabled={sinStock}
                    className={cn(
                      'relative aspect-[3/4] rounded-xl overflow-hidden ring-2',
                      sinStock
                        ? 'opacity-50 cursor-not-allowed ring-transparent'
                        : 'ring-transparent hover:ring-primary cursor-pointer'
                    )}
                  >
                    {/* Imagen */}
                    {producto.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl(producto.imagen_url) ?? producto.imagen_url ?? ''}
                        alt={producto.nombre}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}

                    {/* Gradiente + nombre + precio */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2.5 pt-8 pb-2.5">
                      <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2">
                        {producto.nombre}
                      </p>
                      <p className="text-white font-extrabold text-sm mt-1">
                        {formatearPrecio(precio, simboloMoneda)}
                      </p>
                    </div>

                    {/* Badge top */}
                    {esTop && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                        ★ Top
                      </div>
                    )}

                    {/* Badge variantes */}
                    {producto.variantes.length > 0 && !sinStock && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md">
                        {producto.variantes.length} var.
                      </div>
                    )}

                    {/* Sin stock */}
                    {sinStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-red-600 px-3 py-1 rounded-full">
                          Sin stock
                        </span>
                      </div>
                    )}

                    {/* Stock bajo */}
                    {!sinStock && producto.stock !== null && producto.stock > 0 && producto.stock <= 5 && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        {producto.stock} restantes
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Columna derecha: formulario sticky ──────────── */}
        <div className={cn(
          'flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start',
          pestaña !== 'carrito' && 'hidden lg:flex'
        )}>

          {/* ── Cliente ─────────────────────────────────────── */}
          <div className="rounded-2xl bg-card border border-card-border p-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Cliente
            </p>

            {/* Cliente seleccionado */}
            {clienteSeleccionado ? (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {clienteSeleccionado.razon_social.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{clienteSeleccionado.razon_social}</p>
                  <p className="text-[11px] text-foreground-muted font-mono">{clienteSeleccionado.identificacion}</p>
                </div>
                <button onClick={() => setClienteSeleccionado(null)} className="text-foreground-muted hover:text-danger transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

            ) : esConsumidorFinal ? (
              /* Consumidor Final activo */
              <div className="flex items-center gap-2 bg-foreground/5 border border-border rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-foreground-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Consumidor Final</p>
                  <p className="text-[11px] text-foreground-muted font-mono">9999999999999</p>
                </div>
                <button onClick={() => setEsConsumidorFinal(false)} className="text-foreground-muted hover:text-danger transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

            ) : (
              /* Búsqueda + acciones */
              <div className="flex flex-col gap-2">
                {/* Buscador */}
                <div className="relative">
                  <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, cédula o RUC…"
                    value={busquedaCliente}
                    onChange={e => { setBusquedaCliente(e.target.value); setMostrarListaClientes(true) }}
                    onFocus={() => setMostrarListaClientes(true)}
                    onBlur={() => setTimeout(() => setMostrarListaClientes(false), 150)}
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Lista desplegable — solo con 2+ caracteres */}
                {mostrarListaClientes && busquedaCliente.trim().length >= 2 && (
                  <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto border border-border rounded-xl bg-card p-1">
                    {clientesFiltrados.length === 0 ? (
                      <p className="text-xs text-foreground-muted text-center py-3">
                        Sin resultados para &quot;{busquedaCliente}&quot;
                      </p>
                    ) : clientesFiltrados.map(c => (
                      <button
                        key={c.id}
                        onMouseDown={() => {
                          setClienteSeleccionado(c)
                          setEsConsumidorFinal(false)
                          setBusquedaCliente('')
                          setMostrarListaClientes(false)
                        }}
                        className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-background-subtle text-left transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">{c.razon_social.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{c.razon_social}</p>
                          <p className="text-[10px] text-foreground-muted font-mono">{c.identificacion}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Acciones rápidas */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { setEsConsumidorFinal(true); setClienteSeleccionado(null) }}
                    className="h-9 rounded-xl border border-border bg-input-bg text-foreground-muted text-xs font-semibold hover:border-foreground/40 hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" /> Consumidor Final
                  </button>
                  <button
                    onClick={() => setModalNuevoCliente(true)}
                    className="h-9 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo cliente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Carrito ──────────────────────────────────────── */}
          <div className="rounded-2xl bg-card border border-card-border p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" /> Carrito
                {totalItems > 0 && <span className="text-primary">({totalItems})</span>}
              </p>
              {carrito.length > 0 && (
                <button
                  onClick={() => setCarrito([])}
                  className="text-[11px] text-danger hover:opacity-80 transition-opacity"
                >
                  Limpiar
                </button>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="text-center py-6 text-foreground-muted">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Agrega productos desde el catálogo</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {carrito.map(item => (
                  <div key={item.key} className="flex items-center gap-2 bg-background-subtle/50 rounded-xl px-2 py-1.5">
                    {item.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl(item.imagen_url) ?? item.imagen_url ?? ''} alt={item.nombre} decoding="async" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-background-subtle flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-foreground-muted/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.nombre}
                        {item.nombre_variante && <span className="text-foreground-muted"> — {item.nombre_variante}</span>}
                      </p>
                      {item.dias_alquiler && (
                        <p className="text-[10px] text-foreground-muted">
                          {item.cantidad} traje{item.cantidad !== 1 ? 's' : ''} × {item.dias_alquiler} día{item.dias_alquiler !== 1 ? 's' : ''}
                        </p>
                      )}
                      <p className="text-[11px] text-primary font-bold">{formatearPrecio(item.subtotal, simboloMoneda)}</p>
                    </div>
                    {/* Controles cantidad */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => cambiarCantidad(item.key, -1)}
                        className="w-6 h-6 rounded-lg border border-border flex items-center justify-center hover:bg-background-subtle transition-colors"
                      >
                        <Minus className="w-3 h-3 text-foreground-muted" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-foreground">{item.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidad(item.key, 1)}
                        className="w-6 h-6 rounded-lg border border-border flex items-center justify-center hover:bg-background-subtle transition-colors"
                      >
                        <Plus className="w-3 h-3 text-foreground-muted" />
                      </button>
                      <button
                        onClick={() => eliminarItem(item.key)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-danger hover:bg-danger/10 transition-colors ml-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Forma de pago ────────────────────────────────── */}
          <div className="rounded-2xl bg-card border border-card-border p-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">Forma de pago</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { valor: 'efectivo',      icono: <Banknote className="w-3.5 h-3.5" />,       label: 'Efectivo' },
                { valor: 'transferencia', icono: <ArrowLeftRight className="w-3.5 h-3.5" />, label: 'Transferencia' },
                { valor: 'tarjeta',       icono: <CreditCard className="w-3.5 h-3.5" />,     label: 'Tarjeta' },
                { valor: 'otro',          icono: <MoreHorizontal className="w-3.5 h-3.5" />, label: 'Otro' },
              ] as const).map(op => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setFormaPago(op.valor)}
                  className={cn(
                    'h-9 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all',
                    formaPago === op.valor
                      ? 'bg-primary text-white border-primary'
                      : 'bg-input-bg text-foreground-muted border-input-border hover:border-primary/50'
                  )}
                >
                  {op.icono}{op.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Descuento manual ─────────────────────────────── */}
          {carrito.length > 0 && (
            <div className="rounded-2xl bg-card border border-card-border p-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">Descuento</p>
              <div className="flex gap-1.5">
                {/* Toggle % / $ */}
                <div className="flex rounded-xl border border-border overflow-hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { setDescTipo('pct'); setDescValor('') }}
                    className={cn('px-3 py-2 text-xs font-bold transition-all',
                      descTipo === 'pct' ? 'bg-primary text-white' : 'bg-card text-foreground-muted hover:bg-background-subtle'
                    )}
                  >%</button>
                  <button
                    type="button"
                    onClick={() => { setDescTipo('fijo'); setDescValor('') }}
                    className={cn('px-3 py-2 text-xs font-bold transition-all',
                      descTipo === 'fijo' ? 'bg-primary text-white' : 'bg-card text-foreground-muted hover:bg-background-subtle'
                    )}
                  >{simboloMoneda}</button>
                </div>
                {/* Input valor */}
                <input
                  type="number"
                  min="0"
                  max={descTipo === 'pct' ? 100 : subtotal}
                  step="0.01"
                  placeholder={descTipo === 'pct' ? '0 %' : '0.00'}
                  value={descValor}
                  onChange={e => setDescValor(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {descValor && (
                  <button
                    onClick={() => setDescValor('')}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-foreground-muted hover:text-danger transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {descuentoMonto > 0 && (
                <p className="text-xs text-success font-semibold text-right">
                  Descuento: -{formatearPrecio(descuentoMonto, simboloMoneda)}
                </p>
              )}
            </div>
          )}

          {/* ── Total + botón crear ──────────────────────────── */}
          <div className="rounded-2xl bg-card border border-card-border p-3 flex flex-col gap-3">
            {descuentoMonto > 0 && (
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>Subtotal</span>
                <span>{formatearPrecio(subtotal, simboloMoneda)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-muted">Total</span>
              <span className="text-2xl font-black text-primary">{formatearPrecio(total, simboloMoneda)}</span>
            </div>
            <button
              onClick={crearVenta}
              disabled={creando || carrito.length === 0}
              className="w-full h-12 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creando ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Registrando…</>
              ) : (
                <><Receipt className="w-4 h-4" /> Registrar venta</>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ── Modal nuevo cliente ──────────────────────────── */}
      <FormularioCliente
        abierto={modalNuevoCliente}
        alCerrar={() => setModalNuevoCliente(false)}
        pais={pais}
        alGuardar={(nuevoCliente) => {
          setClienteSeleccionado(nuevoCliente)
          setBusquedaCliente('')
          setMostrarListaClientes(false)
        }}
      />

      {/* ── Modal alquiler: cantidad de trajes + días ─────── */}
      {productoAlquiler && (
        <div
          className="fixed inset-0 bg-black/55 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setProductoAlquiler(null)}
        >
          <div
            className="bg-card rounded-2xl border border-card-border p-5 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-foreground">{productoAlquiler.nombre}</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {formatearPrecio(productoAlquiler.precio_descuento ?? productoAlquiler.precio, simboloMoneda)} / día por traje
                </p>
              </div>
              <button onClick={() => setProductoAlquiler(null)} className="text-foreground-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Cantidad de trajes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">
                  Cantidad de trajes
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCantidadAlquiler(v => Math.max(1, v - 1))}
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-background-subtle transition-colors"
                  >
                    <Minus className="w-4 h-4 text-foreground-muted" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={cantidadAlquiler}
                    onChange={e => setCantidadAlquiler(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-9 text-center rounded-xl border border-input-border bg-input-bg text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setCantidadAlquiler(v => v + 1)}
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-background-subtle transition-colors"
                  >
                    <Plus className="w-4 h-4 text-foreground-muted" />
                  </button>
                </div>
              </div>

              {/* Días de alquiler */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">
                  Días de alquiler
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiasAlquiler(v => Math.max(1, v - 1))}
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-background-subtle transition-colors"
                  >
                    <Minus className="w-4 h-4 text-foreground-muted" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={diasAlquiler}
                    onChange={e => setDiasAlquiler(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-9 text-center rounded-xl border border-input-border bg-input-bg text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setDiasAlquiler(v => v + 1)}
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-background-subtle transition-colors"
                  >
                    <Plus className="w-4 h-4 text-foreground-muted" />
                  </button>
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-foreground-muted leading-snug">
                  <p>{cantidadAlquiler} traje{cantidadAlquiler !== 1 ? 's' : ''} × {diasAlquiler} día{diasAlquiler !== 1 ? 's' : ''}</p>
                  <p className="text-[10px]">
                    {formatearPrecio(productoAlquiler.precio_descuento ?? productoAlquiler.precio, simboloMoneda)}/día × {cantidadAlquiler} × {diasAlquiler}
                  </p>
                </div>
                <p className="text-lg font-black text-primary">
                  {formatearPrecio(
                    +((productoAlquiler.precio_descuento ?? productoAlquiler.precio) * cantidadAlquiler * diasAlquiler).toFixed(2),
                    simboloMoneda
                  )}
                </p>
              </div>

              <button
                onClick={agregarAlquiler}
                className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <ShoppingCart className="w-4 h-4" /> Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal selección de variante ───────────────────── */}
      {productoVariante && (
        <div
          className="fixed inset-0 bg-black/55 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setProductoVariante(null)}
        >
          <div
            className="bg-card rounded-2xl border border-card-border p-5 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-foreground">{productoVariante.nombre}</p>
                <p className="text-xs text-foreground-muted mt-0.5">Selecciona una variante</p>
              </div>
              <button onClick={() => setProductoVariante(null)} className="text-foreground-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {productoVariante.variantes.map(v => {
                const precioBase = productoVariante.precio_descuento ?? productoVariante.precio
                const precioFinal = v.tipo_precio === 'reemplaza'
                  ? (v.precio_variante ?? precioBase)
                  : precioBase + (v.precio_variante ?? 0)
                const sinStock = v.stock_variante !== null && v.stock_variante <= 0
                return (
                  <button
                    key={v.id}
                    onClick={() => !sinStock && agregarProducto(productoVariante, v.id)}
                    disabled={sinStock}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left',
                      sinStock
                        ? 'opacity-50 cursor-not-allowed border-border'
                        : 'border-card-border hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">{v.nombre}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatearPrecio(precioFinal, simboloMoneda)}</p>
                      {sinStock && <p className="text-[10px] text-danger">Sin stock</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
