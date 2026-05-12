'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, Truck,
  Store, ChevronRight, Loader2, MessageCircle, Package,
  CheckCircle2, User, Mail, Phone, MapPin, ChevronDown, Calendar, Landmark,
  FileText, Copy, Upload, Clock,
} from 'lucide-react'
import { usarCarrito } from '@/hooks/usar-carrito'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn, formatearPrecio } from '@/lib/utils'
import { toast } from 'sonner'
import { generarMensajeWhatsApp, generarEnlaceWhatsApp } from '@/lib/whatsapp'
import { CODIGOS_PAIS } from '@/lib/ecuador'
import { obtenerNombresRegiones, obtenerCiudades, obtenerInfoPais } from '@/lib/locales'
import { ContadorRegresivo } from '@/components/ui/contador-regresivo'
import { PayPalBotones } from '@/components/tienda/paypal-botones'

interface MetodoPago {
  id: string
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  cedula_titular: string
  nombre_titular: string
}

interface Props {
  whatsapp: string
  nombreTienda: string
  simboloMoneda: string
  pais?: string
  metodosPago: MetodoPago[]
  paypalActivo?: boolean
  paypalClientId?: string
}

interface Cupon {
  codigo:          string
  tipo_descuento:  'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima:   number | null
  usos_actuales:   number
  inicia_en:       string | null
  vence_en:        string | null
}

interface PedidoTemporal {
  numero_temporal: string
  expira_en: string
}

interface PedidoConfirmado {
  numero_orden: string
  whatsappUrl: string
  formaPago: 'transferencia' | 'paypal'
}

type Paso = 'carrito' | 'envio' | 'datos' | 'pago'

const INPUT_BASE =
  'w-full h-11 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'

export function CarritoCliente({ whatsapp, nombreTienda, simboloMoneda, pais = 'EC', metodosPago, paypalActivo = false, paypalClientId = '' }: Props) {
  const { items, quitar, actualizarCantidad, limpiar, subtotal, hidratado } = usarCarrito()

  const soloServicios  = items.length > 0 && items.every(i => i.tipo_producto === 'servicio')
  const soloAlquileres = items.length > 0 && items.every(i => i.tipo_producto === 'alquiler')

  const [confirmarVaciar, setConfirmarVaciar] = useState(false)
  const [codigoCupon, setCodigoCupon] = useState('')
  const [cupon, setCupon] = useState<Cupon | null>(null)
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [tipoEnvio, setTipoEnvio] = useState<'tienda' | 'envio' | null>(null)
  const [paso, setPaso] = useState<Paso>('carrito')
  const [creandoPedido, setCreandoPedido] = useState(false)
  const [pedidoTemporal, setPedidoTemporal] = useState<PedidoTemporal | null>(null)
  const [pedidoConfirmado, setPedidoConfirmado] = useState<PedidoConfirmado | null>(null)
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null)
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [iniciandoTransferencia, setIniciandoTransferencia] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'paypal'>('transferencia')

  // Datos del cliente
  const [nombres, setNombres] = useState('')
  const [email, setEmail] = useState('')
  const [codigoPais, setCodigoPais] = useState('+593')
  const [telefono, setTelefono] = useState('')
  // Datos de facturación SRI (opcionales)
  const [quiereFactura, setQuiereFactura] = useState(false)
  const [tipoIdFactura, setTipoIdFactura]     = useState<'04' | '05' | '06' | '07'>('05')
  const [idFactura, setIdFactura]             = useState('')
  const [razonSocialFactura, setRazonSocialFactura] = useState('')
  const [emailFactura, setEmailFactura]       = useState('')
  const [direccionFactura, setDireccionFactura] = useState('')
  const [telefonoFactura, setTelefonoFactura] = useState('')

  // Solo delivery
  const [provincia, setProvincia] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [direccion, setDireccion] = useState('')
  const [detallesDir, setDetallesDir] = useState('')

  // null = no consultado aún / ciudad sin zona configurada ("A coordinar")
  const [costoEnvio, setCostoEnvio] = useState<number | null>(null)
  const [tiempoEntrega, setTiempoEntrega] = useState<string | null>(null)
  const [consultandoEnvio, setConsultandoEnvio] = useState(false)

  const descuentoCupon = cupon
    ? cupon.tipo_descuento === 'porcentaje'
      ? (subtotal * cupon.valor_descuento) / 100
      : cupon.valor_descuento
    : 0
  const total = subtotal - descuentoCupon + (tipoEnvio === 'envio' && costoEnvio !== null ? costoEnvio : 0)

  const infoPais = obtenerInfoPais(pais)
  const regionesDisponibles = obtenerNombresRegiones(pais)
  const ciudadesDisponibles = obtenerCiudades(pais, provincia)

  // --- Consultar costo de envío por ciudad ---
  async function consultarEnvio(ciudadSeleccionada: string) {
    if (!ciudadSeleccionada) { setCostoEnvio(null); setTiempoEntrega(null); return }
    setConsultandoEnvio(true)
    const supabase = crearClienteSupabase()
    const { data } = await supabase
      .from('zonas_envio')
      .select('precio, tiempo_entrega')
      .eq('ciudad', ciudadSeleccionada)
      .eq('esta_activa', true)
      .single()
    setConsultandoEnvio(false)
    if (data) {
      setCostoEnvio(data.precio)
      setTiempoEntrega(data.tiempo_entrega)
    } else {
      setCostoEnvio(null)
      setTiempoEntrega(null)
    }
  }

  // --- Validar cupón ---
  async function validarCupon() {
    if (!codigoCupon.trim()) return
    setValidandoCupon(true)
    const supabase = crearClienteSupabase()
    const { data } = await supabase
      .from('cupones')
      .select('codigo, tipo_descuento, valor_descuento, compra_minima, max_usos, usos_actuales, esta_activo, inicia_en, vence_en')
      .eq('codigo', codigoCupon.trim().toUpperCase())
      .eq('esta_activo', true)
      .single()

    setValidandoCupon(false)
    if (!data) { toast.error('Cupón no válido'); return }
    const ahora = new Date()
    if (data.inicia_en && new Date(data.inicia_en) > ahora) {
      toast.error(`Cupón disponible desde el ${new Date(data.inicia_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'long' })}`)
      return
    }
    if (data.vence_en && new Date(data.vence_en) < ahora) { toast.error('Cupón vencido'); return }
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
    if (quiereFactura && tipoIdFactura !== '07') {
      if (!idFactura.trim()) { toast.error('Ingresa tu número de identificación para la factura'); return false }
      if (!razonSocialFactura.trim()) { toast.error('Ingresa el nombre o razón social para la factura'); return false }
      if (tipoIdFactura === '05' && idFactura.replace(/\D/g,'').length !== 10) {
        toast.error('La cédula debe tener 10 dígitos'); return false
      }
      if (tipoIdFactura === '04' && idFactura.replace(/\D/g,'').length !== 13) {
        toast.error('El RUC debe tener 13 dígitos'); return false
      }
    }
    return true
  }

  function copiarDatosContacto() {
    setRazonSocialFactura(nombres.trim().toUpperCase())
    setEmailFactura(email.trim())
    setTelefonoFactura(telefono.trim())
    toast.success('Datos de contacto copiados')
  }

  // --- Construir payload común del pedido (usado por transferencia y PayPal) ---
  function buildDatosPedido() {
    const whatsappCompleto = codigoPais + telefono.replace(/\D/g, '')
    return {
      tipo:               tipoEnvio === 'tienda' ? 'local' : 'delivery',
      nombres:            nombres.trim(),
      email:              email.trim().toLowerCase(),
      whatsapp:           whatsappCompleto,
      provincia:          tipoEnvio === 'envio' ? provincia : null,
      ciudad:             tipoEnvio === 'envio' ? ciudad : null,
      direccion:          tipoEnvio === 'envio' ? direccion.trim() : null,
      detalles_direccion: tipoEnvio === 'envio' && detallesDir.trim() ? detallesDir.trim() : null,
      items: items.map(i => ({
        producto_id:   i.producto_id,
        nombre:        i.nombre,
        slug:          i.slug,
        tipo_producto: i.tipo_producto,
        imagen_url:    i.imagen_url,
        precio:        i.precio,
        variante:      i.nombre_variante ?? null,
        variante_id:   i.variante_id ?? null,
        talla:         i.talla ?? null,
        cantidad:      i.cantidad,
        subtotal:      +(i.precio * (i.alquiler?.dias ?? 1) * i.cantidad).toFixed(2),
        cita:          i.cita ?? null,
        alquiler:      i.alquiler ?? null,
      })),
      simbolo_moneda:    simboloMoneda,
      subtotal:          +subtotal.toFixed(2),
      descuento_cupon:   +descuentoCupon.toFixed(2),
      cupon_codigo:      cupon?.codigo ?? null,
      costo_envio:       tipoEnvio === 'envio' && costoEnvio !== null ? +costoEnvio.toFixed(2) : 0,
      total:             +total.toFixed(2),
      datos_facturacion: quiereFactura ? {
        tipo_identificacion: tipoIdFactura,
        identificacion:      tipoIdFactura === '07' ? '9999999999999' : idFactura.replace(/\D/g,''),
        razon_social:        tipoIdFactura === '07' ? 'CONSUMIDOR FINAL' : razonSocialFactura.trim().toUpperCase(),
        email:               emailFactura.trim() || null,
        direccion:           direccionFactura.trim() || null,
        telefono:            telefonoFactura.trim() || null,
      } : null,
    }
  }

  // --- Validar stock y disponibilidad ---
  async function validarDisponibilidad(): Promise<boolean> {
    const supabase = crearClienteSupabase()

    for (const item of items) {
      if (item.tipo_producto === 'servicio') continue

      if (item.variante_id) {
        const { data } = await supabase
          .from('variantes_producto')
          .select('stock_variante')
          .eq('id', item.variante_id)
          .single()
        if (data && data.stock_variante !== null && data.stock_variante < item.cantidad) {
          const s = data.stock_variante
          toast.error(s === 0 ? `"${item.nombre}" está agotado` : `"${item.nombre}" solo tiene ${s} unidad${s !== 1 ? 'es' : ''} disponible${s !== 1 ? 's' : ''}`)
          return false
        }
      } else if (item.talla) {
        const { data } = await supabase
          .from('tallas_producto')
          .select('stock')
          .eq('producto_id', item.producto_id)
          .eq('talla', item.talla)
          .single()
        if (data && data.stock !== null && data.stock < item.cantidad) {
          const s = data.stock
          toast.error(s === 0 ? `"${item.nombre}" talla ${item.talla} está agotada` : `"${item.nombre}" talla ${item.talla} solo tiene ${s} unidad${s !== 1 ? 'es' : ''}`)
          return false
        }
      } else {
        const { data } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single()
        if (data && data.stock !== null && data.stock < item.cantidad) {
          const s = data.stock
          toast.error(s === 0 ? `"${item.nombre}" está agotado` : `"${item.nombre}" solo tiene ${s} unidad${s !== 1 ? 'es' : ''} disponible${s !== 1 ? 's' : ''}`)
          return false
        }
      }
    }

    for (const item of items.filter(i => i.tipo_producto === 'servicio' && i.cita)) {
      const empleadoId = item.cita?.empleado_id
      let citaOcupada = false

      if (empleadoId) {
        const { data } = await supabase
          .from('citas')
          .select('id')
          .eq('fecha', item.cita!.fecha)
          .eq('hora_inicio', item.cita!.hora_inicio)
          .eq('empleado_id', empleadoId)
          .in('estado', ['reservada', 'confirmada'])
          .maybeSingle()
        citaOcupada = !!data
      } else {
        const { data: configData } = await supabase
          .from('configuracion_tienda')
          .select('capacidad_citas_simultaneas, seleccion_empleado')
          .single()
        const { count } = await supabase
          .from('citas')
          .select('id', { count: 'exact', head: true })
          .eq('fecha', item.cita!.fecha)
          .eq('hora_inicio', item.cita!.hora_inicio)
          .in('estado', ['reservada', 'confirmada'])
        let capacidad = configData?.capacidad_citas_simultaneas ?? 1
        if (configData?.seleccion_empleado) {
          const { count: totalEmpleados } = await supabase
            .from('empleados_cita')
            .select('id', { count: 'exact', head: true })
            .eq('activo', true)
          capacidad = totalEmpleados ?? 1
        }
        citaOcupada = (count ?? 0) >= capacidad
      }

      if (citaOcupada) {
        const fechaDisplay = new Date(item.cita!.fecha + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
        const horaDisplay = item.cita!.hora_inicio.slice(0, 5)
        toast.error(`El horario del ${fechaDisplay} a las ${horaDisplay} ya fue reservado para "${item.nombre}". Por favor elige otro horario.`, { duration: 6000 })
        return false
      }
    }

    for (const item of items.filter(i => i.tipo_producto === 'alquiler' && i.alquiler)) {
      const al = item.alquiler!
      const { data: dispData } = await supabase.rpc('verificar_disponibilidad_alquiler', {
        p_producto_id:  item.producto_id,
        p_fecha_inicio: al.fecha_inicio,
        p_fecha_fin:    al.fecha_fin,
      })
      const disponible = (dispData as { disponible: number }[] | null)?.[0]?.disponible ?? 0
      if (disponible < item.cantidad) {
        const fmtFecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long' })
        toast.error(
          disponible === 0
            ? `"${item.nombre}" ya no tiene disponibilidad para el ${fmtFecha(al.fecha_inicio)} al ${fmtFecha(al.fecha_fin)}. Elige otras fechas.`
            : `"${item.nombre}" solo tiene ${disponible} unidad${disponible !== 1 ? 'es' : ''} disponible${disponible !== 1 ? 's' : ''} para esas fechas.`,
          { duration: 6000 }
        )
        return false
      }
    }

    return true
  }

  // --- Confirmar pedido: valida y avanza al paso de pago (sin crear nada aún) ---
  async function confirmarPedido() {
    if (!validarFormulario()) return
    setCreandoPedido(true)
    const ok = await validarDisponibilidad()
    setCreandoPedido(false)
    if (!ok) return
    setPaso('pago')
  }

  // --- Iniciar pago por transferencia: crea el pedido temporal con timer ---
  async function iniciarTransferencia() {
    setIniciandoTransferencia(true)
    const res = await fetch('/api/pedidos/crear-temporal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDatosPedido()),
    })
    setIniciandoTransferencia(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al preparar el pedido. Intenta nuevamente.')
      return
    }
    const data = await res.json()
    setPedidoTemporal({ numero_temporal: data.numero_temporal, expira_en: data.expira_en })
  }

  // --- Subir comprobante y confirmar pedido ---
  async function subirComprobante() {
    if (!archivoComprobante || !pedidoTemporal) return
    setSubiendoComprobante(true)

    const form = new FormData()
    form.append('numero_temporal', pedidoTemporal.numero_temporal)
    form.append('archivo', archivoComprobante)

    const res = await fetch('/api/pedidos/subir-comprobante', {
      method: 'POST',
      body: form,
    })

    setSubiendoComprobante(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al subir el comprobante. Intenta nuevamente.')
      return
    }

    const data = await res.json()

    const msg = generarMensajeWhatsApp({
      numeroPedido: data.numero_orden,
      nombreTienda,
      items: items.map(i => ({
        nombre:        i.nombre,
        variante:      i.nombre_variante,
        talla:         i.talla,
        cantidad:      i.cantidad,
        precio:        i.precio,
        slug:          i.slug,
        tipo_producto: i.tipo_producto,
        cita:          i.cita,
        alquiler:      i.alquiler ?? undefined,
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
    setPedidoTemporal(null)
    setPedidoConfirmado({ numero_orden: data.numero_orden, whatsappUrl: urlWhatsApp, formaPago: 'transferencia' })
  }

  // --- Pago PayPal aprobado ---
  function handlePayPalSuccess(data: { numero_orden: string }) {
    const msg = generarMensajeWhatsApp({
      numeroPedido: data.numero_orden,
      nombreTienda,
      items: items.map(i => ({
        nombre:        i.nombre,
        variante:      i.nombre_variante,
        talla:         i.talla,
        cantidad:      i.cantidad,
        precio:        i.precio,
        slug:          i.slug,
        tipo_producto: i.tipo_producto,
        cita:          i.cita,
        alquiler:      i.alquiler ?? undefined,
      })),
      cupon: cupon ? { codigo: cupon.codigo, descuento: descuentoCupon } : undefined,
      envio: tipoEnvio === 'tienda'
        ? { tipo: 'tienda' }
        : { tipo: 'envio', provincia, ciudad, direccion: direccion.trim(), detallesDireccion: detallesDir.trim() || undefined },
      siteUrl: window.location.origin,
      simboloMoneda,
    })
    const urlWhatsApp = generarEnlaceWhatsApp(whatsapp, msg)
    limpiar()
    setCupon(null)
    setPedidoTemporal(null)
    setPedidoConfirmado({ numero_orden: data.numero_orden, whatsappUrl: urlWhatsApp, formaPago: 'paypal' })
  }

  // --- Loading / carrito vacío ---
  if (!hidratado) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (items.length === 0 && !pedidoConfirmado) {
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
      {!pedidoConfirmado && (
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
          {paso !== 'carrito' && (paso !== 'pago' || !pedidoTemporal) && (
            <button
              onClick={() => {
                if (paso === 'datos') setPaso(soloServicios ? 'carrito' : 'envio')
                else if (paso === 'pago') setPaso('datos')
                else setPaso('carrito')
              }}
              className="text-xs text-primary hover:underline">
              ← Volver
            </button>
          )}
        </div>
      )}

      {/* Indicador de pasos */}
      {!pedidoConfirmado && (
        <div className="flex items-center gap-1.5 mb-5">
          {(['carrito', 'envio', 'datos', 'pago'] as Paso[]).map((p, i) => {
            const pasosList = ['carrito', 'envio', 'datos', 'pago']
            const currentIndex = pasosList.indexOf(paso)
            return (
              <div key={p} className="flex items-center gap-1.5 flex-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  paso === p ? 'bg-primary text-white' :
                  currentIndex > i ? 'bg-primary/20 text-primary' :
                  'bg-background-subtle text-foreground-muted'
                )}>
                  {currentIndex > i ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-[11px] font-medium',
                  paso === p ? 'text-foreground' : 'text-foreground-muted'
                )}>
                  {p === 'carrito' ? 'Carrito' : p === 'envio' ? 'Entrega' : p === 'datos' ? 'Mis datos' : 'Pago'}
                </span>
                {i < 3 && <div className="flex-1 h-px bg-border" />}
              </div>
            )
          })}
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
                  {((item as { extras?: { id: string; nombre: string; precio: number }[] }).extras ?? []).map((ex) => (
                    <span key={ex.id} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium">
                      +{ex.nombre}
                    </span>
                  ))}
                </div>
                {item.tipo_producto === 'alquiler' && item.alquiler ? (
                  <p className="text-sm font-bold text-primary mt-1">
                    {formatearPrecio(item.precio, simboloMoneda)}<span className="text-xs font-normal text-foreground-muted">/día</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-primary mt-1">{formatearPrecio(item.precio, simboloMoneda)}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  {item.tipo_producto === 'servicio' ? (
                    <div className="flex flex-col gap-0.5">
                      {item.cita && (
                        <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {new Date(item.cita.fecha + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })} — {item.cita.hora_inicio.slice(0, 5)}
                        </div>
                      )}
                      {item.cita?.empleado_nombre && (
                        <p className="text-[10px] text-foreground-muted">Con: {item.cita.empleado_nombre}</p>
                      )}
                    </div>
                  ) : item.tipo_producto === 'alquiler' ? (
                    <div className="flex flex-col gap-0.5">
                      {item.alquiler && (
                        <>
                          <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            {new Date(item.alquiler.fecha_inicio + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                            {' → '}
                            {new Date(item.alquiler.fecha_fin + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                          </div>
                          <p className="text-[10px] text-foreground-muted">
                            {item.cantidad > 1 ? `${item.cantidad} uds. × ` : ''}{item.alquiler.dias} día{item.alquiler.dias !== 1 ? 's' : ''}
                            {item.alquiler.hora_recogida ? ` · Retiro: ${item.alquiler.hora_recogida}` : ''}
                          </p>
                        </>
                      )}
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
                      = {formatearPrecio(item.precio * (item.alquiler?.dias ?? 1) * item.cantidad, simboloMoneda)}
                    </p>
                    <button onClick={() => quitar(item.producto_id, item.variante_id, item.talla, item.cita, item.alquiler)}
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
              <div className="flex flex-col gap-2">
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
                {cupon.vence_en && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <Tag className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium flex-1">
                      Oferta vence en{' '}
                      <ContadorRegresivo
                        fechaFin={cupon.vence_en}
                        compacto
                        className="text-red-600"
                        onExpirado={() => { setCupon(null); setCodigoCupon(''); toast.error('El cupón ha expirado'); }}
                      />
                    </p>
                  </div>
                )}
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
            {soloServicios ? 'Completar mis datos' : soloAlquileres ? 'Elegir entrega del alquiler' : 'Elegir entrega'} <ChevronRight className="w-4 h-4" />
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
                {soloServicios ? 'Atención en local físico' : soloAlquileres ? 'Retiro y devolución en local' : 'Entrega en local físico'}
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
              <p className="text-xs text-foreground-muted">El costo se calcula según tu ciudad</p>
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

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">{infoPais.etiquetaRegion} *</label>
                <div className="relative">
                  <select
                    value={provincia}
                    onChange={e => { setProvincia(e.target.value); setCiudad(''); setCostoEnvio(null); setTiempoEntrega(null) }}
                    className={cn(INPUT_BASE, 'appearance-none pr-9 cursor-pointer')}
                  >
                    <option value="">Selecciona {infoPais.etiquetaRegion.toLowerCase()}</option>
                    {regionesDisponibles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">{infoPais.etiquetaCiudad} *</label>
                <div className="relative">
                  <select
                    value={ciudad}
                    onChange={e => { setCiudad(e.target.value); consultarEnvio(e.target.value) }}
                    disabled={!provincia}
                    className={cn(INPUT_BASE, 'appearance-none pr-9 cursor-pointer disabled:opacity-50')}
                  >
                    <option value="">Selecciona {infoPais.etiquetaCiudad.toLowerCase()}</option>
                    {ciudadesDisponibles.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Dirección domicilio *</label>
                <input
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Principal 123 y Calle 2"
                  className={INPUT_BASE}
                />
              </div>

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

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">Nombres completos *</label>
              <input
                value={nombres}
                onChange={e => setNombres(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className={INPUT_BASE}
              />
            </div>

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

          {/* ── Datos de facturación (opcionales) ── */}
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setQuiereFactura(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  quiereFactura ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted'
                )}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">¿Necesitas factura electrónica?</p>
                  <p className="text-xs text-foreground-muted">Opcional · Datos para el SRI</p>
                </div>
              </div>
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors flex-shrink-0 relative',
                quiereFactura ? 'bg-primary' : 'bg-border'
              )}>
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                  quiereFactura ? 'left-[22px]' : 'left-0.5'
                )} />
              </div>
            </button>

            {quiereFactura && (
              <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-2">Tipo de identificación</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { valor: '05', label: 'Cédula', sub: '10 dígitos' },
                      { valor: '04', label: 'RUC', sub: '13 dígitos' },
                      { valor: '06', label: 'Pasaporte', sub: 'Extranjero' },
                      { valor: '07', label: 'Consumidor final', sub: 'Sin datos' },
                    ].map(t => (
                      <button
                        key={t.valor}
                        type="button"
                        onClick={() => setTipoIdFactura(t.valor as typeof tipoIdFactura)}
                        className={cn(
                          'px-3 py-2 rounded-xl border text-left transition-all',
                          tipoIdFactura === t.valor
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-background-subtle'
                        )}
                      >
                        <p className={cn('text-xs font-semibold', tipoIdFactura === t.valor ? 'text-primary' : 'text-foreground')}>{t.label}</p>
                        <p className="text-[10px] text-foreground-muted">{t.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {tipoIdFactura !== '07' && (
                  <>
                    <button
                      type="button"
                      onClick={copiarDatosContacto}
                      disabled={!nombres.trim()}
                      className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      <Copy className="w-3 h-3" />
                      Usar mis datos de contacto
                    </button>

                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        {tipoIdFactura === '04' ? 'RUC *' : tipoIdFactura === '05' ? 'Cédula *' : 'Número de pasaporte *'}
                      </label>
                      <input
                        type="text"
                        value={idFactura}
                        onChange={e => setIdFactura(e.target.value)}
                        placeholder={tipoIdFactura === '04' ? '060xxxxxxxx' : tipoIdFactura === '05' ? '06xxxxxxxx' : 'AB123456'}
                        className={cn(INPUT_BASE, 'font-mono')}
                        maxLength={tipoIdFactura === '04' ? 13 : tipoIdFactura === '05' ? 10 : 20}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        {tipoIdFactura === '04' ? 'Razón social *' : 'Nombres y apellidos *'}
                      </label>
                      <input
                        type="text"
                        value={razonSocialFactura}
                        onChange={e => setRazonSocialFactura(e.target.value.toUpperCase())}
                        placeholder="EN MAYÚSCULAS COMO APARECE EN EL SRI"
                        className={cn(INPUT_BASE, 'uppercase')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        Email <span className="text-foreground-muted/60">(para recibir el RIDE)</span>
                      </label>
                      <input
                        type="email"
                        value={emailFactura}
                        onChange={e => setEmailFactura(e.target.value)}
                        placeholder="tuemail@correo.com"
                        className={INPUT_BASE}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        Dirección <span className="text-foreground-muted/60">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={direccionFactura}
                        onChange={e => setDireccionFactura(e.target.value)}
                        placeholder="Av. Principal 123, Ciudad"
                        className={INPUT_BASE}
                      />
                    </div>
                  </>
                )}

                {tipoIdFactura === '07' && (
                  <p className="text-xs text-foreground-muted bg-background-subtle rounded-xl px-3 py-2">
                    La factura se emitirá a nombre de <strong>Consumidor Final</strong> sin datos de identificación.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumen rápido */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-1.5">
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
            {!soloServicios && !soloAlquileres && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">
                  {tipoEnvio === 'tienda' ? 'Retiro en local' : (
                    consultandoEnvio ? 'Calculando envío…' :
                    ciudad ? (costoEnvio !== null ? `Envío a ${ciudad}` : `Envío a ${ciudad}`) : 'Envío a domicilio'
                  )}
                </span>
                <span className={cn('font-medium', costoEnvio === null && tipoEnvio === 'envio' ? 'text-foreground-muted text-xs' : 'text-foreground')}>
                  {tipoEnvio === 'tienda' ? (
                    <span className="text-success">Gratis</span>
                  ) : consultandoEnvio ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                  ) : costoEnvio !== null ? (
                    formatearPrecio(costoEnvio, simboloMoneda)
                  ) : ciudad ? (
                    'A coordinar'
                  ) : '—'}
                </span>
              </div>
            )}
            {tiempoEntrega && tipoEnvio === 'envio' && (
              <p className="text-xs text-foreground-muted">{tiempoEntrega}</p>
            )}
            <div className="flex justify-between pt-1.5 border-t border-primary/20 mt-0.5">
              <span className="font-bold text-foreground">Total del pedido</span>
              <div className="text-right">
                <span className="font-bold text-primary text-lg">{formatearPrecio(total, simboloMoneda)}</span>
                {tipoEnvio === 'envio' && ciudad && costoEnvio === null && (
                  <p className="text-[10px] text-foreground-muted">+ envío a coordinar</p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={confirmarPedido}
            disabled={creandoPedido}
            className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30 py-4">
            {creandoPedido
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando pedido…</>
              : <><ChevronRight className="w-4 h-4" /> Continuar al pago</>
            }
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PASO 4: Pago                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {paso === 'pago' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-foreground">Elige tu método de pago</h2>

          {/* Total a pagar */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-foreground-muted uppercase tracking-wide font-semibold mb-0.5">Total a pagar</p>
              <p className="text-2xl font-black text-primary">{formatearPrecio(total, simboloMoneda)}</p>
            </div>
            {pedidoTemporal && (
              <div className="text-right">
                <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Pedido</p>
                <p className="text-sm font-bold text-foreground font-mono">{pedidoTemporal.numero_temporal}</p>
              </div>
            )}
          </div>

          {/* Selector de método de pago (solo si no hay temporal activo) */}
          {!pedidoTemporal && paypalActivo && paypalClientId && (
            <div className="flex rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setMetodoPago('transferencia')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all',
                  metodoPago === 'transferencia'
                    ? 'bg-primary text-white'
                    : 'bg-card text-foreground-muted hover:text-foreground'
                )}>
                <Landmark className="w-3.5 h-3.5" /> Transferencia
              </button>
              <button
                onClick={() => setMetodoPago('paypal')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all border-l border-border',
                  metodoPago === 'paypal'
                    ? 'bg-[#0070ba] text-white'
                    : 'bg-card text-foreground-muted hover:text-foreground'
                )}>
                <svg className="w-14 h-5" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PayPal">
                  <path d="M12.237 2.347H6.433c-.393 0-.728.285-.79.673L3.378 19.047c-.046.29.178.554.473.554h2.847c.393 0 .728-.285.79-.673l.63-3.982c.062-.388.396-.673.79-.673h1.813c3.77 0 5.947-1.823 6.52-5.44.256-1.582.01-2.826-.73-3.697-.813-.96-2.256-1.489-4.274-1.489zm.66 5.363c-.313 1.978-1.882 1.978-3.401 1.978h-.864l.606-3.832c.036-.228.235-.396.466-.396h.396c1.033 0 2.01 0 2.512.589.301.352.393.874.285 1.661zM29.89 7.633h-2.856c-.231 0-.43.168-.466.396l-.12.757-.19-.275c-.587-.852-1.895-1.137-3.202-1.137-2.997 0-5.557 2.27-6.057 5.455-.26 1.59.11 3.11 1.013 4.169.829.972 2.014 1.377 3.426 1.377 2.415 0 3.754-1.552 3.754-1.552l-.121.75c-.046.29.178.554.473.554h2.572c.393 0 .728-.285.79-.673l1.543-9.773c.046-.288-.178-.548-.559-.048zm-3.983 5.278c-.262 1.552-1.49 2.594-3.06 2.594-.786 0-1.415-.252-1.82-.73-.4-.473-.552-1.148-.425-1.898.245-1.538 1.49-2.614 3.037-2.614.768 0 1.393.256 1.806.738.415.487.581 1.165.462 1.91zM45.634 7.633H42.76c-.259 0-.503.128-.648.341l-3.741 5.508-1.586-5.296c-.099-.33-.401-.553-.744-.553h-2.808c-.327 0-.555.321-.448.628l2.987 8.768-2.81 3.964c-.224.316 0 .754.384.754h2.872c.256 0 .498-.126.644-.337l9.024-13.024c.219-.316-.006-.753-.252-.753z" fill={metodoPago === 'paypal' ? 'white' : '#253B80'}/>
                  <path d="M53.512 2.347h-5.804c-.393 0-.728.285-.79.673L44.653 19.047c-.046.29.178.554.473.554h3.057c.275 0 .509-.2.552-.472l.658-4.183c.062-.388.396-.673.79-.673h1.812c3.77 0 5.947-1.823 6.52-5.44.256-1.582.01-2.826-.73-3.697-.812-.96-2.254-1.489-4.273-1.489zm.659 5.363c-.313 1.978-1.882 1.978-3.4 1.978h-.865l.606-3.832c.036-.228.235-.396.466-.396h.397c1.032 0 2.009 0 2.511.589.302.352.394.874.285 1.661zM71.164 7.633H68.31c-.231 0-.43.168-.466.396l-.12.757-.19-.275c-.587-.852-1.895-1.137-3.201-1.137-2.997 0-5.557 2.27-6.057 5.455-.26 1.59.109 3.11 1.013 4.169.828.972 2.013 1.377 3.425 1.377 2.415 0 3.754-1.552 3.754-1.552l-.121.75c-.046.29.178.554.473.554h2.572c.393 0 .728-.285.79-.673l1.543-9.773c.045-.288-.18-.548-.561-.048zm-3.983 5.278c-.262 1.552-1.49 2.594-3.06 2.594-.786 0-1.415-.252-1.82-.73-.4-.473-.552-1.148-.425-1.898.245-1.538 1.49-2.614 3.037-2.614.768 0 1.392.256 1.806.738.415.487.581 1.165.462 1.91zM74.734 2.711l-2.293 14.593c-.046.29.178.554.473.554h2.459c.393 0 .728-.285.79-.673L78.428 2.16c.046-.29-.178-.554-.473-.554h-2.748a.476.476 0 00-.473.405v.7z" fill={metodoPago === 'paypal' ? 'white' : '#179BD7'}/>
                </svg>
              </button>
            </div>
          )}

          {/* ── TRANSFERENCIA: sin temporal → mostrar cuentas y botón iniciar ── */}
          {metodoPago === 'transferencia' && !pedidoTemporal && (
            <>
              {metodosPago.length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-background-subtle">
                    <Landmark className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">Realiza tu transferencia a</p>
                  </div>
                  <div className="divide-y divide-border">
                    {metodosPago.map(mp => (
                      <div key={mp.id} className="px-3 py-2.5 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground">{mp.banco}</p>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{mp.tipo_cuenta}</span>
                        </div>
                        <p className="text-xs text-foreground-muted">Cuenta: <span className="font-mono font-semibold text-foreground">{mp.numero_cuenta}</span></p>
                        <p className="text-xs text-foreground-muted">Titular: <span className="font-semibold text-foreground">{mp.nombre_titular}</span></p>
                        <p className="text-xs text-foreground-muted">Cédula: <span className="font-mono text-foreground">{mp.cedula_titular}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={iniciarTransferencia}
                disabled={iniciandoTransferencia}
                className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30 py-4">
                {iniciandoTransferencia
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando pedido…</>
                  : <><Landmark className="w-4 h-4" /> Ya realicé la transferencia</>
                }
              </button>
            </>
          )}

          {/* ── TRANSFERENCIA: con temporal → timer + comprobante ── */}
          {metodoPago === 'transferencia' && pedidoTemporal && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Tiempo para subir tu comprobante</p>
                </div>
                <ContadorRegresivo
                  fechaFin={pedidoTemporal.expira_en}
                  className="text-2xl font-black text-amber-700 tabular-nums"
                  onExpirado={() => {
                    toast.error('El tiempo expiró. Tu reserva fue liberada. Inicia el proceso nuevamente.', { duration: 8000 })
                    setPedidoTemporal(null)
                    setPaso('carrito')
                  }}
                />
                <p className="text-xs text-amber-700 mt-1.5">
                  Tu reserva se liberará automáticamente si no subes el comprobante a tiempo.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Upload className="w-3.5 h-3.5 text-primary" /> Sube tu comprobante de pago
                </p>
                <p className="text-xs text-foreground-muted">
                  Captura o foto del comprobante de transferencia. Formatos: JPG, PNG, WEBP o PDF (máx. 3 MB).
                </p>
                <label className={cn(
                  'relative flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                  archivoComprobante ? 'border-success bg-success/5' : 'border-border hover:border-primary/60 bg-background-subtle'
                )}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null
                      if (file && file.size > 10 * 1024 * 1024) { toast.error('El archivo es demasiado grande. Máximo 10 MB.'); return }
                      setArchivoComprobante(file)
                    }}
                  />
                  {archivoComprobante ? (
                    <>
                      <CheckCircle2 className="w-7 h-7 text-success" />
                      <p className="text-xs font-semibold text-success text-center px-4 truncate max-w-full">{archivoComprobante.name}</p>
                      <p className="text-[10px] text-foreground-muted">Toca para cambiar</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-foreground-muted/40" />
                      <p className="text-xs text-foreground-muted text-center">Toca aquí para seleccionar<br />el comprobante</p>
                    </>
                  )}
                </label>
              </div>

              <button
                onClick={subirComprobante}
                disabled={!archivoComprobante || subiendoComprobante}
                className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30 py-4">
                {subiendoComprobante
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando comprobante…</>
                  : <><Upload className="w-4 h-4" /> Enviar comprobante</>
                }
              </button>
            </>
          )}

          {/* ── PAYPAL: directo, sin temporal ── */}
          {metodoPago === 'paypal' && paypalActivo && paypalClientId && (
            <div className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                Pagar con PayPal
              </p>
              <p className="text-xs text-foreground-muted">
                Al hacer clic en el botón serás redirigido a PayPal para completar tu pago de forma segura. Tu pedido se confirmará automáticamente al aprobar.
              </p>
              <PayPalBotones
                clientId={paypalClientId}
                currency={obtenerInfoPais(pais).moneda ?? 'USD'}
                total={total}
                datosPedido={buildDatosPedido()}
                onSuccess={handlePayPalSuccess}
                onError={msg => toast.error(msg, { duration: 6000 })}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PANTALLA: Comprobante enviado exitosamente              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {pedidoConfirmado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={cn(
              'border-b px-5 pt-6 pb-5 text-center',
              pedidoConfirmado.formaPago === 'paypal'
                ? 'bg-blue-50 border-blue-100'
                : 'bg-success/10 border-success/20'
            )}>
              <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3',
                pedidoConfirmado.formaPago === 'paypal' ? 'bg-blue-100' : 'bg-success/20'
              )}>
                <CheckCircle2 className={cn(
                  'w-8 h-8',
                  pedidoConfirmado.formaPago === 'paypal' ? 'text-[#0070ba]' : 'text-success'
                )} />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {pedidoConfirmado.formaPago === 'paypal' ? '¡Pago confirmado!' : '¡Comprobante enviado!'}
              </h2>
              <p className="text-sm text-foreground-muted mt-1">
                {pedidoConfirmado.formaPago === 'paypal' ? 'Tu pedido está en procesamiento' : 'Pedido pendiente de validación'}
              </p>
              <div className="mt-3 px-5 py-2.5 bg-card border-2 border-primary/30 rounded-2xl inline-block">
                <p className="text-2xl font-black text-primary tracking-wider">{pedidoConfirmado.numero_orden}</p>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="px-5 py-4">
              <p className="text-sm text-foreground-muted text-center mb-4">
                {pedidoConfirmado.formaPago === 'paypal'
                  ? 'Tu pago fue procesado exitosamente. Recibirás un email de confirmación en breve.'
                  : 'Un administrador revisará tu comprobante y confirmará tu pedido en breve. Te notificaremos por email.'
                }
              </p>

              <a
                href={pedidoConfirmado.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar al equipo de ventas
              </a>

              <Link
                href={`/pedido/${pedidoConfirmado.numero_orden}`}
                className="flex items-center justify-center gap-2 w-full h-11 mt-3 rounded-2xl border border-primary/30 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10 transition-all"
              >
                <Package className="w-4 h-4" />
                Ver estado de mi pedido
              </Link>

              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full h-11 mt-2 rounded-2xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:border-primary/40 transition-all"
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
