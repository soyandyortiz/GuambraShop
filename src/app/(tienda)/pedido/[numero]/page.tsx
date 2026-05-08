import { crearClienteServidor } from '@/lib/supabase/servidor'
import {
  CheckCircle2, Clock, RotateCcw, Send, Package,
  MapPin, Phone, Truck, Store, XCircle, MessageCircle, ArrowLeft, Calendar, Search
} from 'lucide-react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'

type EstadoPedido = 'pendiente_pago' | 'procesando' | 'en_espera' | 'completado' | 'cancelado' | 'reembolsado' | 'fallido'

const PASOS = [
  { estado: 'pendiente_pago' as EstadoPedido, etiqueta: 'Recibido',   icono: Clock },
  { estado: 'procesando'     as EstadoPedido, etiqueta: 'Preparando', icono: Package },
  { estado: 'completado'     as EstadoPedido, etiqueta: 'Entregado',  icono: CheckCircle2 },
]

const INDICE_ESTADO: Record<EstadoPedido, number> = {
  pendiente_pago: 0,
  en_espera:      0,
  procesando:     1,
  completado:     2,
  cancelado:     -1,
  reembolsado:   -1,
  fallido:       -1,
}

export default async function PáginaSeguimientoPedido({
  params,
}: {
  params: Promise<{ numero: string }>
}) {
  const { numero } = await params
  const supabase = await crearClienteServidor()

  const [{ data: pedido }, { data: config }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('numero_orden, tipo, nombres, whatsapp, ciudad, provincia, direccion, detalles_direccion, items, simbolo_moneda, subtotal, descuento_cupon, cupon_codigo, costo_envio, total, estado, creado_en')
      .eq('numero_orden', numero.toUpperCase())
      .maybeSingle(),
    supabase
      .from('configuracion_tienda')
      .select('nombre_tienda, whatsapp')
      .single(),
  ])

  const urlWA = config?.whatsapp
    ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero consultar sobre mi pedido ${numero.toUpperCase()}.`)}`
    : null

  // Pedido no encontrado — UI amigable en lugar de 404
  if (!pedido) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-background-subtle border border-border flex items-center justify-center">
          <Search className="w-8 h-8 text-foreground-muted/40" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Pedido no encontrado</h1>
          <p className="text-sm text-foreground-muted mt-1">
            No encontramos el pedido <span className="font-mono font-bold">{numero.toUpperCase()}</span>.
            Verifica el número e intenta de nuevo.
          </p>
        </div>
        <Link href="/pedido"
          className="flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all">
          <Search className="w-4 h-4" />
          Buscar otro pedido
        </Link>
        {urlWA && (
          <a href={urlWA} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            Consultar por WhatsApp
          </a>
        )}
      </div>
    )
  }

  const estado       = pedido.estado as EstadoPedido
  const cancelado    = estado === 'cancelado'
  const indiceActual = INDICE_ESTADO[estado]

  const urlWAConsulta = config?.whatsapp
    ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero consultar sobre mi pedido ${pedido.numero_orden}.`)}`
    : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

      {/* Volver */}
      <Link href="/" className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-primary transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Volver a la tienda
      </Link>

      {/* Encabezado */}
      <div className="rounded-2xl bg-card border border-card-border p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-foreground-muted">Número de orden</p>
            <p className="text-2xl font-black text-primary tracking-wider mt-0.5">{pedido.numero_orden}</p>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border',
            cancelado
              ? 'bg-danger/10 text-danger border-danger/30'
              : indiceActual === 2
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-primary/10 text-primary border-primary/20'
          )}>
            {cancelado
              ? <XCircle className="w-3.5 h-3.5" />
              : <CheckCircle2 className="w-3.5 h-3.5" />}
            {cancelado ? 'Cancelado' : (PASOS[indiceActual]?.etiqueta ?? estado)}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          {pedido.tipo === 'delivery'
            ? <Truck className="w-4 h-4 text-orange-500 flex-shrink-0" />
            : <Store className="w-4 h-4 text-success flex-shrink-0" />}
          <span>
            {pedido.tipo === 'delivery'
              ? `Delivery${pedido.ciudad ? ` → ${pedido.ciudad}` : ''}`
              : 'Retiro en tienda'}
          </span>
        </div>

        <p className="text-xs text-foreground-muted">
          Pedido el {new Date(pedido.creado_en).toLocaleDateString('es-EC', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* Barra de progreso */}
      {!cancelado ? (
        <div className="rounded-2xl bg-card border border-card-border p-5">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-4">Estado del pedido</p>
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-700"
              style={{ width: indiceActual === 0 ? '0%' : `${(indiceActual / (PASOS.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {PASOS.map((paso, idx) => {
                const Icono     = paso.icono
                const completado = idx <= indiceActual
                const actual     = idx === indiceActual
                return (
                  <div key={paso.estado} className="flex flex-col items-center gap-1.5" style={{ width: `${100 / PASOS.length}%` }}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10',
                      completado ? 'bg-primary border-primary text-white' : 'bg-card border-border text-foreground-muted'
                    )}>
                      <Icono className="w-4 h-4" />
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold text-center leading-tight',
                      actual ? 'text-primary' : completado ? 'text-foreground' : 'text-foreground-muted'
                    )}>
                      {paso.etiqueta}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-danger/5 border border-danger/20 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-danger">Pedido cancelado</p>
            <p className="text-xs text-foreground-muted mt-0.5">Si tienes dudas, contáctanos por WhatsApp.</p>
          </div>
        </div>
      )}

      {/* Info cliente + dirección */}
      <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">Datos del pedido</p>
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{pedido.whatsapp}</span>
        </div>
        {pedido.tipo === 'delivery' && pedido.direccion && (
          <div className="flex items-start gap-2 text-sm text-foreground-muted">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {pedido.direccion}
              {pedido.detalles_direccion && ` — ${pedido.detalles_direccion}`}
              <span className="text-foreground font-medium"> · {pedido.ciudad}, {pedido.provincia}</span>
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Productos y servicios
        </p>
        <div className="flex flex-col gap-2">
          {(pedido.items as any[]).map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-background-subtle border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.imagen_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                  : item.tipo_producto === 'servicio'
                    ? <Calendar className="w-4 h-4 text-foreground-muted/50" />
                    : <Package className="w-4 h-4 text-foreground-muted/50" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.nombre}</p>
                {(item.variante || item.nombre_variante || item.talla) && (
                  <p className="text-xs text-foreground-muted">
                    {[item.variante || item.nombre_variante, item.talla && `Talla: ${item.talla}`].filter(Boolean).join(' · ')}
                  </p>
                )}
                {item.cita && (
                  <p className="text-xs text-primary mt-0.5">
                    📅 {new Date(`${item.cita.fecha}T00:00:00`).toLocaleDateString('es-EC')} · {item.cita.hora_inicio?.slice(0, 5)}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">x{item.cantidad}</p>
                <p className="text-xs text-foreground-muted">{pedido.simbolo_moneda}{item.subtotal?.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1.5">
        <div className="flex justify-between text-sm text-foreground-muted">
          <span>Subtotal</span>
          <span>{pedido.simbolo_moneda}{pedido.subtotal.toFixed(2)}</span>
        </div>
        {pedido.descuento_cupon > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>Cupón {pedido.cupon_codigo}</span>
            <span>-{pedido.simbolo_moneda}{pedido.descuento_cupon.toFixed(2)}</span>
          </div>
        )}
        {pedido.costo_envio > 0 && (
          <div className="flex justify-between text-sm text-foreground-muted">
            <span>Envío</span>
            <span>+{pedido.simbolo_moneda}{pedido.costo_envio.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2 mt-0.5">
          <span>Total</span>
          <span className="text-primary">{formatearPrecio(pedido.total, pedido.simbolo_moneda)}</span>
        </div>
      </div>

      {/* Botón WhatsApp */}
      {urlWAConsulta && (
        <a href={urlWAConsulta} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#22c55e] transition-all shadow-sm">
          <MessageCircle className="w-4 h-4" />
          Consultar por WhatsApp
        </a>
      )}

    </div>
  )
}
