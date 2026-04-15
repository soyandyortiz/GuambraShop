'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, Truck,
  Store, ChevronRight, Loader2, MessageCircle, Package,
  CheckCircle2, User, Mail, Phone, MapPin, ChevronDown, Calendar
} from 'lucide-react'
import { usarCarrito } from '@/hooks/usar-carrito'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn, formatearPrecio } from '@/lib/utils'
import { toast } from 'sonner'
import { generarMensajeWhatsApp, generarEnlaceWhatsApp } from '@/lib/whatsapp'
import { PROVINCIAS_ECUADOR, CODIGOS_PAIS } from '@/lib/ecuador'

interface Props {
  whatsapp: string
  nombreTienda: string
  simboloMoneda: string
}

interface Cupon {
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima: number | null
  usos_actuales: number
}

interface PedidoCreado {
  numero_orden: string
  whatsappUrl: string
}

type Paso = 'carrito' | 'envio' | 'datos'

const INPUT_BASE =
  'w-full h-11 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'

export function CarritoCliente({ whatsapp, nombreTienda, simboloMoneda }: Props) {
  const { items, quitar, actualizarCantidad, limpiar, subtotal, hidratado } = usarCarrito()

  const soloServicios = items.every(i => i.tipo_producto === 'servicio')

  const [confirmarVaciar, setConfirmarVaciar] = useState(false)
  const [codigoCupon, setCodigoCupon] = useState('')
  const [cupon, setCupon] = useState<Cupon | null>(null)
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [tipoEnvio, setTipoEnvio] = useState<'tienda' | 'envio' | null>(null)
  const [paso, setPaso] = useState<Paso>('carrito')
  const [creandoPedido, setCreandoPedido] = useState(false)
  const [pedidoCreado, setPedidoCreado] = useState<PedidoCreado | null>(null)

  // Datos del cliente
  const [nombres, setNombres] = useState('')
  const [email, setEmail] = useState('')
  const [codigoPais, setCodigoPais] = useState('+593')
  const [telefono, setTelefono] = useState('')
  // Solo delivery
  const [provincia, setProvincia] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [direccion, setDireccion] = useState('')
  const [detallesDir, setDetallesDir] = useState('')

  const descuentoCupon = cupon
    ? cupon.tipo_descuento === 'porcentaje'
      ? (subtotal * cupon.valor_descuento) / 100
      : cupon.valor_descuento
    : 0
  const total = subtotal - descuentoCupon

  const ciudadesDisponibles =
    PROVINCIAS_ECUADOR.find(p => p.nombre === provincia)?.ciudades ?? []

  // --- Validar cupón ---
  async function validarCupon() {
    if (!codigoCupon.trim()) return
    setValidandoCupon(true)
    const supabase = crearClienteSupabase()
    const { data } = await supabase
      .from('cupones')
      .select('codigo, tipo_descuento, valor_descuento, compra_minima, max_usos, usos_actuales, esta_activo, vence_en')
      .eq('codigo', codigoCupon.trim().toUpperCase())
      .eq('esta_activo', true)
      .single()

    setValidandoCupon(false)
    if (!data) { toast.error('Cupón no válido'); return }
    if (data.vence_en && new Date(data.vence_en) < new Date()) { toast.error('Cupón vencido'); return }
    if (data.max_usos && data.usos_actuales >= data.max_usos) { toast.error('Cupón agotado'); return }
    if (data.compra_minima && subtotal < data.compra_minima) {
      toast.error(`Compra mínima: ${formatearPrecio(data.compra_minima, simboloMoneda)}`); return
    }
    setCupon(data as Cupon)
    toast.success(`¡Cupón "${data.codigo}" aplicado!`)
  }

  // --- Avanzar al paso datos ---
  function continuarADatos() {
    if (!tipoEnvio) { toast.error('Selecciona el método de entrega'); return }
    setPaso('datos')
  }

  // --- Validar formulario ---
  function validarFormulario(): boolean {
    if (!nombres.trim()) { toast.error('Ingresa tu nombre completo'); return false }
    if (!email.trim() || !email.includes('@')) { toast.error('Ingresa un email válido'); return false }
    if (!telefono.trim()) { toast.error('Ingresa tu número de WhatsApp'); return false }
    if (tipoEnvio === 'envio') {
      if (!provincia) { toast.error('Selecciona la provincia'); return false }
      if (!ciudad) { toast.error('Selecciona la ciudad'); return false }
      if (!direccion.trim()) { toast.error('Ingresa la dirección de domicilio'); return false }
    }
    return true
  }

  // --- Crear pedido ---
  async function confirmarPedido() {
    if (!validarFormulario()) return
    setCreandoPedido(true)

    const supabase = crearClienteSupabase()
    const whatsappCompleto = codigoPais + telefono.replace(/\D/g, '')

    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        tipo: tipoEnvio === 'tienda' ? 'local' : 'delivery',
        nombres: nombres.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsappCompleto,
        provincia: tipoEnvio === 'envio' ? provincia : null,
        ciudad: tipoEnvio === 'envio' ? ciudad : null,
        direccion: tipoEnvio === 'envio' ? direccion.trim() : null,
        detalles_direccion: tipoEnvio === 'envio' && detallesDir.trim() ? detallesDir.trim() : null,
        items: items.map(i => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          slug: i.slug,
          tipo_producto: i.tipo_producto,
          imagen_url: i.imagen_url,
          precio: i.precio,
          variante: i.nombre_variante ?? null,
          talla: i.talla ?? null,
          cantidad: i.cantidad,
          subtotal: +(i.precio * i.cantidad).toFixed(2),
          cita: i.cita,
        })),
        simbolo_moneda: simboloMoneda,
        subtotal: +subtotal.toFixed(2),
        descuento_cupon: +descuentoCupon.toFixed(2),
        cupon_codigo: cupon?.codigo ?? null,
        costo_envio: 0,
        total: +total.toFixed(2),
      })
      .select('id, numero_orden')
      .single()

    setCreandoPedido(false)

    if (error || !data) {
      toast.error('Error al crear el pedido. Intenta nuevamente.')
      return
    }

    const serviciosParaCita = items.filter(i => i.tipo_producto === 'servicio' && i.cita)
    if (serviciosParaCita.length > 0) {
      const citasPayload = serviciosParaCita.map(i => ({
        pedido_id: data.id,
        producto_id: i.producto_id,
        fecha: i.cita!.fecha,
        hora_inicio: i.cita!.hora_inicio,
        hora_fin: i.cita!.hora_fin,
        estado: 'pendiente'
      }))
      await supabase.from('citas').insert(citasPayload)
    }

    // Incrementar uso del cupón
    if (cupon) {
      supabase
        .from('cupones')
        .update({ usos_actuales: cupon.usos_actuales + 1 })
        .eq('codigo', cupon.codigo)
        .then(() => {})
    }

    // Generar mensaje WhatsApp con número de pedido
    const msg = generarMensajeWhatsApp({
      numeroPedido: data.numero_orden,
      nombreTienda,
        items: items.map(i => ({
          nombre: i.nombre,
          variante: i.nombre_variante,
          talla: i.talla,
          cantidad: i.cantidad,
          precio: i.precio,
          slug: i.slug,
          tipo_producto: i.tipo_producto,
          cita: i.cita,
        })),
      cupon: cupon ? { codigo: cupon.codigo, descuento: descuentoCupon } : undefined,
      envio: tipoEnvio === 'tienda'
        ? { tipo: 'tienda' }
        : {
            tipo: 'envio',
            provincia,
            ciudad,
            direccion: direccion.trim(),
            detallesDireccion: detallesDir.trim() || undefined,
          },
      siteUrl: window.location.origin,
      simboloMoneda,
    })

    const urlWhatsApp = generarEnlaceWhatsApp(whatsapp, msg)
    limpiar()
    setCupon(null)
    setPedidoCreado({ numero_orden: data.numero_orden, whatsappUrl: urlWhatsApp })
  }

  // --- Loading / carrito vacío ---
  if (!hidratado) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (items.length === 0 && !pedidoCreado) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-3xl bg-background-subtle flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-9 h-9 text-foreground-muted/40" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Tu carrito está vacío</h2>
        <p className="text-sm text-foreground-muted mt-1">Agrega productos para continuar</p>
        <Link href="/"
          className="inline-flex items-center gap-2 mt-6 h-12 px-6 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all">
          Ver productos <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Header */}
      {!pedidoCreado && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">
            Mi carrito <span className="text-primary">({items.length})</span>
          </h1>
          {paso === 'carrito' && (
            <button onClick={() => setConfirmarVaciar(true)}
              className="text-xs text-foreground-muted hover:text-danger transition-colors">
              Vaciar
            </button>
          )}
          {paso !== 'carrito' && (
            <button
              onClick={() => setPaso(paso === 'datos' ? 'envio' : 'carrito')}
              className="text-xs text-primary hover:underline">
              ← Volver
            </button>
          )}
        </div>
      )}

      {/* Indicador de pasos */}
      {!pedidoCreado && (
        <div className="flex items-center gap-1.5 mb-5">
          {(['carrito', 'envio', 'datos'] as Paso[]).map((p, i) => (
            <div key={p} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                paso === p ? 'bg-primary text-white' :
                (['carrito', 'envio', 'datos'].indexOf(paso) > i) ? 'bg-primary/20 text-primary' :
                'bg-background-subtle text-foreground-muted'
              )}>
                {(['carrito', 'envio', 'datos'].indexOf(paso) > i) ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-[11px] font-medium',
                paso === p ? 'text-foreground' : 'text-foreground-muted'
              )}>
                {p === 'carrito' ? 'Carrito' : p === 'envio' ? 'Entrega' : 'Mis datos'}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PASO 1: Items del carrito                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {paso === 'carrito' && (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={`${item.producto_id}|${item.variante_id ?? ''}|${item.talla ?? ''}`}
              className="flex gap-3 bg-card border border-card-border rounded-2xl p-3">
              <Link href={`/producto/${item.slug}`} className="flex-shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-background-subtle border border-border">
                  {item.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-foreground-muted/30" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1">{item.nombre}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {item.nombre_variante && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">
                      {item.nombre_variante}
                    </span>
                  )}
                  {item.talla && (
                    <span className="text-[10px] bg-background-subtle text-foreground-muted px-1.5 py-0.5 rounded-md">
                      Talla: {item.talla}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-primary mt-1">{formatearPrecio(item.precio, simboloMoneda)}</p>
                <div className="flex items-center justify-between mt-2">
                  {item.tipo_producto === 'servicio' ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-2 py-1 rounded-lg">
                      <Calendar className="w-3.5 h-3.5" />
                      Espacio único Reservado
                    </div>
                  ) : (
                    <div className="flex items-center bg-background-subtle rounded-xl p-1 gap-2">
                      <button onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1, item.variante_id, item.talla)}
                        className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-all">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1, item.variante_id, item.talla)}
                        className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-all">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-foreground-muted font-medium">
                      = {formatearPrecio(item.precio * item.cantidad, simboloMoneda)}
                    </p>
                    <button onClick={() => quitar(item.producto_id, item.variante_id, item.talla)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Cupón */}
          <div className="bg-card border border-card-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" /> Cupón de descuento
            </p>
            {cupon ? (
              <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-bold text-success">{cupon.codigo}</p>
                  <p className="text-xs text-foreground-muted">
                    -{cupon.tipo_descuento === 'porcentaje' ? `${cupon.valor_descuento}%` : formatearPrecio(cupon.valor_descuento, simboloMoneda)}
                  </p>
                </div>
                <button onClick={() => { setCupon(null); setCodigoCupon('') }}
                  className="text-xs text-foreground-muted hover:text-danger transition-colors">
                  Quitar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={codigoCupon}
                  onChange={e => setCodigoCupon(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && validarCupon()}
                  placeholder="CÓDIGO"
                  className="flex-1 h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                />
                <button onClick={validarCupon} disabled={validandoCupon || !codigoCupon.trim()}
                  className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-all">
                  {validandoCupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </button>
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Subtotal</span>
              <span className="font-medium text-foreground">{formatearPrecio(subtotal, simboloMoneda)}</span>
            </div>
            {descuentoCupon > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-success">Descuento cupón</span>
                <span className="font-medium text-success">-{formatearPrecio(descuentoCupon, simboloMoneda)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-primary text-lg">{formatearPrecio(total, simboloMoneda)}</span>
            </div>
          </div>

          <button onClick={() => {
            if (soloServicios) {
              setTipoEnvio('tienda')
              setPaso('datos')
            } else {
              setPaso('envio')
            }
          }}
            className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/30 py-4">
            {soloServicios ? 'Completar mis datos' : 'Elegir entrega'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PASO 2: Método de entrega                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {paso === 'envio' && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">¿Cómo quieres recibir tu pedido?</h2>

          {/* Retiro en tienda */}
          <button onClick={() => setTipoEnvio('tienda')}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
              tipoEnvio === 'tienda' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              tipoEnvio === 'tienda' ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted')}>
              <Store className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {soloServicios ? 'Atención en local físico' : 'Entrega en local físico'}
              </p>
              <p className="text-xs text-foreground-muted">Sin costo adicional</p>
            </div>
            <span className="text-sm font-bold text-success">Gratis</span>
          </button>

          {/* Envío a domicilio */}
          <button onClick={() => setTipoEnvio('envio')}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
              tipoEnvio === 'envio' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              tipoEnvio === 'envio' ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted')}>
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Envío a domicilio</p>
              <p className="text-xs text-foreground-muted">Coordinaremos el costo por WhatsApp</p>
            </div>
          </button>

          {/* Resumen */}
          {tipoEnvio && (
            <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Subtotal</span>
                <span className="font-medium">{formatearPrecio(subtotal, simboloMoneda)}</span>
              </div>
              {descuentoCupon > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-success">Descuento</span>
                  <span className="font-medium text-success">-{formatearPrecio(descuentoCupon, simboloMoneda)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between mt-1">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-primary text-lg">{formatearPrecio(total, simboloMoneda)}</span>
              </div>
            </div>
          )}

          <button
            onClick={continuarADatos}
            disabled={!tipoEnvio}
            className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30 py-4">
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PASO 3: Datos del cliente                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {paso === 'datos' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-foreground">Tus datos de contacto</h2>

          {/* ── Delivery: datos de dirección ── */}
          {tipoEnvio === 'envio' && !soloServicios && (
            <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Dirección de entrega
              </p>

              {/* Provincia */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Provincia *</label>
                <div className="relative">
                  <select
                    value={provincia}
                    onChange={e => { setProvincia(e.target.value); setCiudad('') }}
                    className={cn(INPUT_BASE, 'appearance-none pr-9 cursor-pointer')}
                  >
                    <option value="">Selecciona la provincia</option>
                    {PROVINCIAS_ECUADOR.map(p => (
                      <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Ciudad *</label>
                <div className="relative">
                  <select
                    value={ciudad}
                    onChange={e => setCiudad(e.target.value)}
                    disabled={!provincia}
                    className={cn(INPUT_BASE, 'appearance-none pr-9 cursor-pointer disabled:opacity-50')}
                  >
                    <option value="">Selecciona la ciudad</option>
                    {ciudadesDisponibles.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Dirección domicilio *</label>
                <input
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Principal 123 y Calle 2"
                  className={INPUT_BASE}
                />
              </div>

              {/* Detalles */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Detalles (piso, referencia…)</label>
                <input
                  value={detallesDir}
                  onChange={e => setDetallesDir(e.target.value)}
                  placeholder="Ej: Edificio azul, piso 3, timbre B"
                  className={INPUT_BASE}
                />
              </div>
            </div>
          )}

          {/* ── Datos personales ── */}
          <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <User className="w-3.5 h-3.5 text-primary" /> Datos personales
            </p>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">Nombres completos *</label>
              <input
                value={nombres}
                onChange={e => setNombres(e.target.value)}
                placeholder="Ej: Ana García Torres"
                className={INPUT_BASE}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tuemail@ejemplo.com"
                className={INPUT_BASE}
              />
            </div>

            {/* WhatsApp con código de país */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> WhatsApp *
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={codigoPais}
                    onChange={e => setCodigoPais(e.target.value)}
                    className="h-11 pl-3 pr-7 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                  >
                    {CODIGOS_PAIS.map(c => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.bandera} {c.codigo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
                </div>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="0987654321"
                  className={cn(INPUT_BASE, 'flex-1')}
                />
              </div>
            </div>
          </div>

          {/* Resumen rápido */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">
                {soloServicios ? 'Servicio(s) agendado(s)' : (tipoEnvio === 'tienda' ? 'Entrega en local físico' : 'Envío a domicilio')}
              </span>
              <span className="font-medium text-foreground-muted">
                {soloServicios ? '' : (tipoEnvio === 'tienda' ? 'Gratis' : 'A coordinar')}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-primary/20">
              <span className="font-bold text-foreground">Total del pedido</span>
              <span className="font-bold text-primary text-lg">{formatearPrecio(total, simboloMoneda)}</span>
            </div>
          </div>

          <button
            onClick={confirmarPedido}
            disabled={creandoPedido}
            className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30 py-4">
            {creandoPedido
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando pedido…</>
              : <><CheckCircle2 className="w-4 h-4" /> Confirmar pedido</>
            }
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: Pedido creado exitosamente                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {pedidoCreado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden">
            {/* Header verde */}
            <div className="bg-success/10 border-b border-success/20 px-5 pt-6 pb-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">¡Pedido registrado!</h2>
              <p className="text-sm text-foreground-muted mt-1">Tu número de orden es:</p>
              <div className="mt-3 px-5 py-2.5 bg-card border-2 border-primary/30 rounded-2xl inline-block">
                <p className="text-2xl font-black text-primary tracking-wider">{pedidoCreado.numero_orden}</p>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4">
              <p className="text-sm text-foreground-muted text-center mb-4">
                Ahora comunícate con nuestro equipo de ventas por WhatsApp para confirmar y coordinar tu pedido.
              </p>

              <a
                href={pedidoCreado.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar al equipo de ventas
              </a>

              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full h-11 mt-3 rounded-2xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:border-primary/40 transition-all"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación vaciar carrito */}
      {confirmarVaciar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmarVaciar(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-danger" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">¿Vaciar carrito?</p>
                <p className="text-xs text-foreground-muted">Se eliminarán todos los productos</p>
              </div>
            </div>
            <div className="flex gap-2 p-3">
              <button
                onClick={() => setConfirmarVaciar(false)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-foreground-muted hover:bg-background-subtle transition-all">
                Cancelar
              </button>
              <button
                onClick={() => { limpiar(); setConfirmarVaciar(false) }}
                className="flex-1 h-10 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-danger/90 active:scale-[0.97] transition-all">
                Sí, vaciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
