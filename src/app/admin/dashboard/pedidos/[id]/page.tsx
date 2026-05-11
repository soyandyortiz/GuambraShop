export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Package, Truck, Store, Clock, Upload,
  RotateCcw, CheckCircle2, XCircle, Pause, AlertCircle,
  User, Mail, Phone, MapPin, FileText, Download, Image as ImageIcon,
  AlertTriangle, Calendar, Landmark,
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { AccionesComprobante } from '@/components/admin/pedidos/acciones-comprobante'
import type { EstadoPedido } from '@/types'

const ESTADOS: Record<EstadoPedido, { etiqueta: string; color: string }> = {
  pendiente_pago:       { etiqueta: 'Pendiente de pago',     color: 'bg-gray-100 text-gray-600' },
  pendiente_validacion: { etiqueta: 'Validando comprobante', color: 'bg-amber-100 text-amber-700' },
  procesando:           { etiqueta: 'Procesando',            color: 'bg-emerald-100 text-emerald-700' },
  en_espera:            { etiqueta: 'En espera',             color: 'bg-amber-100 text-amber-700' },
  completado:           { etiqueta: 'Completado',            color: 'bg-blue-100 text-blue-700' },
  cancelado:            { etiqueta: 'Cancelado',             color: 'bg-red-100 text-red-700' },
  reembolsado:          { etiqueta: 'Reembolsado',           color: 'bg-gray-100 text-gray-500' },
  fallido:              { etiqueta: 'Fallido',               color: 'bg-red-100 text-red-800' },
}

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function PáginaPedidoDetalle({ params }: { params: { id: string } }) {
  const supabase = await crearClienteServidor()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('*, datos_facturacion, comprobante_url, comprobante_eliminar_en')
    .eq('id', params.id)
    .single()

  if (!pedido) notFound()

  // Generar URL firmada del comprobante (1 hora de validez)
  let comprobanteSignedUrl: string | null = null
  if (pedido.comprobante_url) {
    const admin = crearAdmin()
    const { data: signed } = await admin.storage
      .from('comprobantes')
      .createSignedUrl(pedido.comprobante_url, 3600)
    comprobanteSignedUrl = signed?.signedUrl ?? null
  }

  const esImagen = pedido.comprobante_url
    ? /\.(jpg|jpeg|png|webp)$/i.test(pedido.comprobante_url)
    : false

  const estadoInfo = ESTADOS[pedido.estado as EstadoPedido] ?? ESTADOS.procesando
  const items = (pedido.items ?? []) as any[]

  const horasParaEliminar = pedido.comprobante_eliminar_en
    ? Math.max(0, Math.ceil((new Date(pedido.comprobante_eliminar_en).getTime() - Date.now()) / 3600000))
    : null

  return (
    <div className="flex flex-col gap-5 max-w-3xl">

      {/* ── Volver + Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard/pedidos"
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-foreground">Pedido #{pedido.numero_orden}</h1>
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', estadoInfo.color)}>
              {estadoInfo.etiqueta}
            </span>
            {pedido.es_venta_manual && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">POS</span>
            )}
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            {new Date(pedido.creado_en).toLocaleString('es-EC', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {pedido.tipo === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}
          </p>
        </div>
      </div>

      {/* ── Banner: acciones para pendiente_validacion ── */}
      {pedido.estado === 'pendiente_validacion' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Comprobante de pago pendiente de validación</p>
              <p className="text-xs text-amber-700">Revisa el comprobante abajo y confirma o rechaza el pago.</p>
            </div>
          </div>
          <AccionesComprobante pedidoId={pedido.id} tieneComprobante={!!pedido.comprobante_url} />
        </div>
      )}

      {/* ── Comprobante de pago ── */}
      {pedido.comprobante_url && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-subtle">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Comprobante de pago</p>
            </div>
            {comprobanteSignedUrl && (
              <a
                href={comprobanteSignedUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </a>
            )}
          </div>

          {/* Advertencia de expiración */}
          {pedido.comprobante_eliminar_en && horasParaEliminar !== null && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-100">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700">
                {horasParaEliminar <= 0
                  ? 'Este comprobante está siendo eliminado por el cron job.'
                  : `Este comprobante será eliminado automáticamente en ${horasParaEliminar} hora${horasParaEliminar !== 1 ? 's' : ''} · ${new Date(pedido.comprobante_eliminar_en).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                }
              </p>
            </div>
          )}

          <div className="p-4">
            {comprobanteSignedUrl ? (
              esImagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comprobanteSignedUrl}
                  alt="Comprobante de pago"
                  className="max-w-full max-h-[500px] object-contain rounded-lg border border-border mx-auto block"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 bg-background-subtle rounded-lg border border-border">
                  <FileText className="w-12 h-12 text-foreground-muted/40" />
                  <p className="text-sm text-foreground-muted">Archivo PDF</p>
                  <a
                    href={comprobanteSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Abrir / Descargar PDF
                  </a>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-foreground-muted">
                <ImageIcon className="w-10 h-10 opacity-20" />
                <p className="text-sm">No se pudo cargar el comprobante</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Productos ── */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-background-subtle">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Productos ({items.length})
          </p>
        </div>
        <div className="divide-y divide-border">
          {items.map((item: any, i: number) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-background-subtle border border-border flex-shrink-0">
                {item.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-foreground-muted/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.nombre}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {item.variante && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">{item.variante}</span>
                  )}
                  {item.talla && (
                    <span className="text-[10px] bg-background-subtle text-foreground-muted px-1.5 py-0.5 rounded-md">Talla: {item.talla}</span>
                  )}
                  {item.cita && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {item.cita.fecha} {item.cita.hora_inicio?.slice(0,5)}
                    </span>
                  )}
                  {item.alquiler && (
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md">
                      {item.alquiler.fecha_inicio} → {item.alquiler.fecha_fin} · {item.alquiler.dias}d
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-foreground-muted">×{item.cantidad}</p>
                <p className="text-sm font-bold text-foreground">
                  {formatearPrecio(Number(item.subtotal), pedido.simbolo_moneda)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="px-4 py-3 bg-background-subtle border-t border-border flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-foreground-muted">Subtotal</span>
            <span className="font-medium">{formatearPrecio(pedido.subtotal, pedido.simbolo_moneda)}</span>
          </div>
          {pedido.descuento_cupon > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-success">Cupón {pedido.cupon_codigo ? `(${pedido.cupon_codigo})` : ''}</span>
              <span className="font-medium text-success">-{formatearPrecio(pedido.descuento_cupon, pedido.simbolo_moneda)}</span>
            </div>
          )}
          {pedido.costo_envio > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Envío</span>
              <span className="font-medium">{formatearPrecio(pedido.costo_envio, pedido.simbolo_moneda)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 border-t border-border mt-0.5">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-bold text-primary text-lg">{formatearPrecio(pedido.total, pedido.simbolo_moneda)}</span>
          </div>
        </div>
      </div>

      {/* ── Cliente + Entrega ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-2.5">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Cliente
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">{pedido.nombres}</p>
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Mail className="w-3 h-3" />
              <span>{pedido.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Phone className="w-3 h-3" />
              <a href={`https://wa.me/${pedido.whatsapp.replace(/\D/g,'')}`}
                target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {pedido.whatsapp}
              </a>
            </div>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-2.5">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            {pedido.tipo === 'delivery' ? <Truck className="w-3.5 h-3.5 text-primary" /> : <Store className="w-3.5 h-3.5 text-primary" />}
            {pedido.tipo === 'delivery' ? 'Dirección de entrega' : 'Retiro en local'}
          </p>
          {pedido.tipo === 'delivery' ? (
            <div className="flex flex-col gap-1 text-xs text-foreground-muted">
              {pedido.ciudad && <p className="text-sm font-semibold text-foreground">{pedido.ciudad}{pedido.provincia ? `, ${pedido.provincia}` : ''}</p>}
              {pedido.direccion && <p>{pedido.direccion}</p>}
              {pedido.detalles_direccion && <p className="opacity-70">{pedido.detalles_direccion}</p>}
            </div>
          ) : (
            <p className="text-xs text-foreground-muted">El cliente retira en el local físico</p>
          )}
        </div>
      </div>

      {/* ── Facturación ── */}
      {pedido.datos_facturacion && (
        <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Datos de facturación
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-foreground-muted">Razón social:</span>{' '}
              <span className="font-semibold text-foreground">{pedido.datos_facturacion.razon_social}</span>
            </div>
            <div>
              <span className="text-foreground-muted">Identificación:</span>{' '}
              <span className="font-mono text-foreground">{pedido.datos_facturacion.identificacion}</span>
            </div>
            {pedido.datos_facturacion.email && (
              <div>
                <span className="text-foreground-muted">Email:</span>{' '}
                <span className="text-foreground">{pedido.datos_facturacion.email}</span>
              </div>
            )}
            {pedido.datos_facturacion.telefono && (
              <div>
                <span className="text-foreground-muted">Teléfono:</span>{' '}
                <span className="text-foreground">{pedido.datos_facturacion.telefono}</span>
              </div>
            )}
            {pedido.datos_facturacion.direccion && (
              <div className="col-span-2">
                <span className="text-foreground-muted">Dirección:</span>{' '}
                <span className="text-foreground">{pedido.datos_facturacion.direccion}</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
