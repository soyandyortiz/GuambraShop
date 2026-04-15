'use client'

import { useState, useTransition } from 'react'
import {
  Search, Truck, Store, ChevronDown, ChevronUp,
  Package, Phone, Mail, MapPin, Download, ShoppingBag
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatearPrecio } from '@/lib/utils'
import type { Pedido, EstadoPedido, ItemPedido } from '@/types'

const ESTADOS: Record<EstadoPedido, { etiqueta: string; color: string }> = {
  pendiente:   { etiqueta: 'Pendiente',   color: 'bg-warning/15 text-warning border-warning/30' },
  confirmado:  { etiqueta: 'Confirmado',  color: 'bg-blue-500/15 text-blue-600 border-blue-300' },
  en_proceso:  { etiqueta: 'En proceso',  color: 'bg-orange-500/15 text-orange-600 border-orange-300' },
  enviado:     { etiqueta: 'Enviado',     color: 'bg-indigo-500/15 text-indigo-600 border-indigo-300' },
  entregado:   { etiqueta: 'Entregado',   color: 'bg-success/15 text-success border-success/30' },
  cancelado:   { etiqueta: 'Cancelado',   color: 'bg-danger/15 text-danger border-danger/30' },
}

type Filtro = 'todos' | 'delivery' | 'local'

interface Props { pedidos: Pedido[] }

export function TablaPedidos({ pedidos: pedidosInic }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosInic)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)

  const filtrados = pedidos.filter(p => {
    const coincideFiltro = filtro === 'todos' || p.tipo === filtro
    const texto = busqueda.toLowerCase()
    const coincideBusqueda =
      !texto ||
      p.numero_orden.toLowerCase().includes(texto) ||
      p.nombres.toLowerCase().includes(texto) ||
      p.email.toLowerCase().includes(texto) ||
      p.whatsapp.includes(texto)
    return coincideFiltro && coincideBusqueda
  })

  const totalDelivery = pedidos.filter(p => p.tipo === 'delivery').length
  const totalLocal    = pedidos.filter(p => p.tipo === 'local').length
  const totalHoy      = pedidos.filter(p => {
    const hoy = new Date().toDateString()
    return new Date(p.creado_en).toDateString() === hoy
  }).length

  async function cambiarEstado(id: string, nuevoEstado: EstadoPedido) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', id)
    setActualizando(null)

    if (error) { toast.error('Error al actualizar el estado'); return }
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    toast.success('Estado actualizado')
    startTransition(() => router.refresh())
  }

  function exportarCSV() {
    const filas = filtrados.map(p => [
      p.numero_orden,
      p.tipo === 'delivery' ? 'DELIVERY' : 'LOCAL',
      p.nombres,
      p.email,
      p.whatsapp,
      p.tipo === 'delivery' ? `${p.ciudad ?? ''} ${p.provincia ?? ''}`.trim() : 'Local físico',
      `${p.simbolo_moneda}${p.total.toFixed(2)}`,
      ESTADOS[p.estado].etiqueta,
      new Date(p.creado_en).toLocaleDateString('es-EC'),
    ].join(','))
    const csv = ['N° Orden,Tipo,Nombres,Email,WhatsApp,Destino,Total,Estado,Fecha', ...filas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filtrados.length} pedidos exportados`)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total pedidos', val: pedidos.length, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Hoy',           val: totalHoy,       color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Delivery',      val: totalDelivery,  color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Local físico',  val: totalLocal,     color: 'text-success', bg: 'bg-success/10' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-card-border p-3 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.val}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Filtro tipo */}
        <div className="flex rounded-xl border border-border overflow-hidden flex-shrink-0">
          {(['todos', 'delivery', 'local'] as Filtro[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn(
                'px-3 py-2 text-xs font-semibold capitalize transition-all',
                filtro === f
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground-muted hover:text-foreground hover:bg-background-subtle'
              )}>
              {f === 'todos' ? 'Todos' : f === 'delivery' ? 'Delivery' : 'Local'}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar por orden, nombre, email…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button onClick={exportarCSV}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-foreground-muted text-sm font-medium hover:text-foreground hover:border-primary/40 transition-all flex-shrink-0">
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>

      {/* Lista de pedidos */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin pedidos</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda || filtro !== 'todos'
              ? 'Ningún resultado para ese filtro'
              : 'Los pedidos de clientes aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map(pedido => {
            const estado = ESTADOS[pedido.estado]
            const abierto = expandido === pedido.id

            return (
              <div key={pedido.id}
                className="rounded-2xl bg-card border border-card-border overflow-hidden transition-all">

                {/* Fila principal */}
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Tipo icono */}
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    pedido.tipo === 'delivery' ? 'bg-orange-500/10' : 'bg-success/10'
                  )}>
                    {pedido.tipo === 'delivery'
                      ? <Truck className="w-4 h-4 text-orange-500" />
                      : <Store className="w-4 h-4 text-success" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{pedido.numero_orden}</span>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide',
                        pedido.tipo === 'delivery'
                          ? 'bg-orange-500/10 text-orange-600 border-orange-300'
                          : 'bg-success/10 text-success border-success/30'
                      )}>
                        {pedido.tipo === 'delivery' ? 'Delivery' : 'Local'}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted truncate">{pedido.nombres}</p>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">
                      {formatearPrecio(pedido.total, pedido.simbolo_moneda)}
                    </p>
                    <p className="text-[10px] text-foreground-muted">
                      {new Date(pedido.creado_en).toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'short'
                      })}
                    </p>
                  </div>

                  {/* Estado */}
                  <div className="flex-shrink-0 relative">
                    {actualizando === pedido.id ? (
                      <div className="w-28 h-8 rounded-lg bg-background-subtle flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={pedido.estado}
                          onChange={e => cambiarEstado(pedido.id, e.target.value as EstadoPedido)}
                          className={cn(
                            'text-[11px] font-bold px-2 pr-6 py-1.5 rounded-lg border appearance-none cursor-pointer focus:outline-none',
                            estado.color
                          )}
                        >
                          {Object.entries(ESTADOS).map(([val, { etiqueta }]) => (
                            <option key={val} value={val}>{etiqueta}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Expand */}
                  <button
                    onClick={() => setExpandido(abierto ? null : pedido.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-background-subtle transition-all flex-shrink-0">
                    {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Detalle expandido */}
                {abierto && (
                  <div className="border-t border-border px-4 py-4 flex flex-col gap-4 bg-background-subtle/40">

                    {/* Contacto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{pedido.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{pedido.whatsapp}</span>
                      </div>
                      {pedido.tipo === 'delivery' && (
                        <div className="flex items-start gap-2 text-sm text-foreground-muted sm:col-span-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>
                            {pedido.direccion}
                            {pedido.detalles_direccion && ` — ${pedido.detalles_direccion}`}
                            <span className="font-medium text-foreground"> · {pedido.ciudad}, {pedido.provincia}</span>
                            {pedido.nombre_zona && (
                              <span className="text-xs"> ({pedido.empresa_envio}{pedido.tiempo_entrega ? ` · ${pedido.tiempo_entrega}` : ''})</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Productos
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {(pedido.items as ItemPedido[]).map((item, i) => (
                          <div key={i} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2 border border-border">
                            <div className="w-8 h-8 rounded-lg bg-background-subtle border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.imagen_url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                                : <Package className="w-3.5 h-3.5 text-foreground-muted/40" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{item.nombre}</p>
                              {(item.variante || item.talla) && (
                                <p className="text-[10px] text-foreground-muted">
                                  {[item.variante, item.talla && `Talla: ${item.talla}`].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-bold text-foreground">x{item.cantidad}</p>
                              <p className="text-[10px] text-foreground-muted">{pedido.simbolo_moneda}{item.subtotal.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resumen financiero */}
                    <div className="bg-card rounded-xl border border-border px-3 py-2 flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-foreground-muted">
                        <span>Subtotal</span>
                        <span>{pedido.simbolo_moneda}{pedido.subtotal.toFixed(2)}</span>
                      </div>
                      {pedido.descuento_cupon > 0 && (
                        <div className="flex justify-between text-xs text-success">
                          <span>Cupón {pedido.cupon_codigo}</span>
                          <span>-{pedido.simbolo_moneda}{pedido.descuento_cupon.toFixed(2)}</span>
                        </div>
                      )}
                      {pedido.costo_envio > 0 && (
                        <div className="flex justify-between text-xs text-foreground-muted">
                          <span>Envío</span>
                          <span>+{pedido.simbolo_moneda}{pedido.costo_envio.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-1 mt-0.5">
                        <span>Total</span>
                        <span className="text-primary">{formatearPrecio(pedido.total, pedido.simbolo_moneda)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-foreground-muted text-center">
        {filtrados.length} de {pedidos.length} pedidos
      </p>
    </div>
  )
}
