'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, Truck,
  Store, ChevronRight, Loader2, MessageCircle, Package
} from 'lucide-react'
import { usarCarrito } from '@/hooks/usar-carrito'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn, formatearPrecio } from '@/lib/utils'
import { toast } from 'sonner'
import { generarMensajeWhatsApp, generarEnlaceWhatsApp } from '@/lib/whatsapp'

interface ZonaEnvio {
  id: string; provincia: string; ciudad: string | null
  empresa_envio: string; precio: number; tiempo_entrega: string | null
}

interface Props {
  zonas: ZonaEnvio[]
  whatsapp: string
  nombreTienda: string
  simboloMoneda: string
}

interface Cupon {
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima: number | null
}

export function CarritoCliente({ zonas, whatsapp, nombreTienda, simboloMoneda }: Props) {
  const { items, quitar, actualizarCantidad, limpiar, subtotal, hidratado } = usarCarrito()

  const [codigoCupon, setCodigoCupon] = useState('')
  const [cupon, setCupon] = useState<Cupon | null>(null)
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [tipoEnvio, setTipoEnvio] = useState<'tienda' | 'envio' | null>(null)
  const [zonaId, setZonaId] = useState<string | null>(null)
  const [paso, setPaso] = useState<'carrito' | 'envio'>('carrito')

  const zona = zonas.find(z => z.id === zonaId)
  const costoEnvio = tipoEnvio === 'envio' && zona ? zona.precio : 0
  const descuentoCupon = cupon
    ? cupon.tipo_descuento === 'porcentaje'
      ? (subtotal * cupon.valor_descuento) / 100
      : cupon.valor_descuento
    : 0
  const total = subtotal - descuentoCupon + costoEnvio

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

  function pedirPorWhatsApp() {
    if (!tipoEnvio) { toast.error('Selecciona el método de entrega'); return }
    if (tipoEnvio === 'envio' && !zonaId) { toast.error('Selecciona una zona de envío'); return }

    const msg = generarMensajeWhatsApp({
      nombreTienda,
      items: items.map(i => ({
        nombre: i.nombre,
        variante: i.nombre_variante,
        cantidad: i.cantidad,
        precio: i.precio,
        slug: i.slug,
      })),
      cupon: cupon ? { codigo: cupon.codigo, descuento: descuentoCupon } : undefined,
      envio: tipoEnvio === 'tienda'
        ? { tipo: 'tienda' }
        : {
            tipo: 'envio',
            provincia: zona?.provincia,
            ciudad: zona?.ciudad || undefined,
            empresaEnvio: zona?.empresa_envio,
            tiempoEntrega: zona?.tiempo_entrega ?? undefined,
            costoEnvio: zona?.precio,
          },
      siteUrl: window.location.origin,
      simboloMoneda,
    })

    // Incrementar uso del cupón
    if (cupon) {
      const supabase = crearClienteSupabase()
      supabase.from('cupones')
        .update({ usos_actuales: supabase.rpc as unknown as number })
        .eq('codigo', cupon.codigo)
        .then(() => {})
    }

    window.open(generarEnlaceWhatsApp(whatsapp, msg), '_blank')
    limpiar()
    setCupon(null)
  }

  if (!hidratado) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">
          Mi carrito <span className="text-primary">({items.length})</span>
        </h1>
        <button onClick={() => { if (confirm('¿Vaciar carrito?')) limpiar() }}
          className="text-xs text-foreground-muted hover:text-danger transition-colors">
          Vaciar
        </button>
      </div>

      {/* Paso 1: Items del carrito */}
      {paso === 'carrito' && (
        <div className="flex flex-col gap-3">
          {/* Lista de items */}
          {items.map(item => (
            <div key={`${item.producto_id}|${item.variante_id ?? ''}|${item.talla ?? ''}`}
              className="flex gap-3 bg-card border border-card-border rounded-2xl p-3">
              {/* Imagen */}
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

              {/* Info */}
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

                {/* Cantidad + eliminar */}
                <div className="flex items-center justify-between mt-2">
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
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Envío</span>
              <span className="font-medium text-foreground-muted">Se calcula en el siguiente paso</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-bold text-foreground">Total estimado</span>
              <span className="font-bold text-primary text-lg">{formatearPrecio(subtotal - descuentoCupon, simboloMoneda)}</span>
            </div>
          </div>

          <button onClick={() => setPaso('envio')}
            className="w-full h-13 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/30 py-4">
            Elegir entrega <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Paso 2: Método de entrega */}
      {paso === 'envio' && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setPaso('carrito')}
            className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-1">
            ← Volver al carrito
          </button>

          <h2 className="text-base font-bold text-foreground">¿Cómo quieres recibir tu pedido?</h2>

          {/* Retiro en tienda */}
          <button onClick={() => { setTipoEnvio('tienda'); setZonaId(null) }}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
              tipoEnvio === 'tienda' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              tipoEnvio === 'tienda' ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted')}>
              <Store className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Retiro en tienda</p>
              <p className="text-xs text-foreground-muted">Sin costo adicional</p>
            </div>
            <span className="text-sm font-bold text-success">Gratis</span>
          </button>

          {/* Envío a domicilio */}
          <div className={cn(
            'rounded-2xl border-2 overflow-hidden transition-all',
            tipoEnvio === 'envio' ? 'border-primary' : 'border-border'
          )}>
            <button onClick={() => setTipoEnvio('envio')}
              className={cn(
                'flex items-center gap-4 p-4 text-left w-full transition-all',
                tipoEnvio === 'envio' ? 'bg-primary/5' : 'bg-card hover:bg-background-subtle'
              )}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                tipoEnvio === 'envio' ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted')}>
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Envío a domicilio</p>
                <p className="text-xs text-foreground-muted">Selecciona tu ciudad</p>
              </div>
            </button>

            {tipoEnvio === 'envio' && (
              <div className="border-t border-border max-h-52 overflow-y-auto">
                {zonas.length === 0 ? (
                  <p className="text-sm text-foreground-muted text-center py-4">Sin zonas de envío disponibles</p>
                ) : (
                  zonas.map(z => (
                    <button key={z.id} onClick={() => setZonaId(z.id)}
                      className={cn(
                        'flex items-center justify-between w-full px-4 py-3 text-left border-b border-border last:border-0 transition-all',
                        zonaId === z.id ? 'bg-primary/10' : 'hover:bg-background-subtle'
                      )}>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {z.ciudad ? `${z.ciudad}, ${z.provincia}` : z.provincia}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {z.empresa_envio}{z.tiempo_entrega ? ` · ${z.tiempo_entrega}` : ''}
                        </p>
                      </div>
                      <p className={cn('text-sm font-bold flex-shrink-0 ml-3', zonaId === z.id ? 'text-primary' : 'text-foreground')}>
                        {formatearPrecio(z.precio, simboloMoneda)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Resumen final */}
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
              {costoEnvio > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">Envío</span>
                  <span className="font-medium">+{formatearPrecio(costoEnvio, simboloMoneda)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between mt-1">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-primary text-lg">{formatearPrecio(total, simboloMoneda)}</span>
              </div>
            </div>
          )}

          <button
            onClick={pedirPorWhatsApp}
            disabled={!tipoEnvio || (tipoEnvio === 'envio' && !zonaId)}
            className="w-full h-13 rounded-2xl bg-[#25D366] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#22c55e] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm py-4">
            <MessageCircle className="w-5 h-5" />
            Pedir por WhatsApp
          </button>
        </div>
      )}
    </div>
  )
}
