'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Search, Truck, Store, ChevronDown, ChevronUp,
  Package, Phone, Mail, MapPin, Download, ShoppingBag,
  Calendar, MessageCircle, X, Filter, Clock, CheckCircle2,
  AlertCircle, RotateCcw, XCircle, Send, ArrowUpDown
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatearPrecio } from '@/lib/utils'
import type { Pedido, EstadoPedido, ItemPedido } from '@/types'

const ESTADOS: Record<EstadoPedido, { etiqueta: string; color: string; icono: React.ReactNode }> = {
  pendiente:   { etiqueta: 'Pendiente',   color: 'bg-warning/15 text-warning border-warning/30',         icono: <Clock className="w-3 h-3" /> },
  confirmado:  { etiqueta: 'Confirmado',  color: 'bg-blue-500/15 text-blue-600 border-blue-300',         icono: <CheckCircle2 className="w-3 h-3" /> },
  en_proceso:  { etiqueta: 'En proceso',  color: 'bg-orange-500/15 text-orange-600 border-orange-300',   icono: <RotateCcw className="w-3 h-3" /> },
  enviado:     { etiqueta: 'Enviado',     color: 'bg-indigo-500/15 text-indigo-600 border-indigo-300',   icono: <Send className="w-3 h-3" /> },
  entregado:   { etiqueta: 'Entregado',   color: 'bg-success/15 text-success border-success/30',         icono: <CheckCircle2 className="w-3 h-3" /> },
  cancelado:   { etiqueta: 'Cancelado',   color: 'bg-danger/15 text-danger border-danger/30',            icono: <XCircle className="w-3 h-3" /> },
}

type FiltroTipo   = 'todos' | 'delivery' | 'local'
type FiltroEstado = EstadoPedido | 'todos'
type FiltroFecha  = 'todos' | 'hoy' | 'semana' | 'mes'
type OrdenSort    = 'reciente' | 'antiguo' | 'mayor' | 'menor'

interface Props { pedidos: Pedido[] }

export function TablaPedidos({ pedidos: pedidosInic }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pedidos, setPedidos]         = useState<Pedido[]>(pedidosInic)
  const [busqueda, setBusqueda]       = useState('')
  const [filtroTipo, setFiltroTipo]   = useState<FiltroTipo>('todos')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todos')
  const [ordenSort, setOrdenSort]     = useState<OrdenSort>('reciente')
  const [expandido, setExpandido]     = useState<string | null>(null)
  const [modalPedido, setModalPedido] = useState<Pedido | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)

  // Filtrado y ordenamiento
  const filtrados = useMemo(() => {
    const ahora = new Date()
    const inicioHoy    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const inicioSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
    const inicioMes    = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    let result = pedidos.filter(p => {
      // Filtro tipo
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
      // Filtro estado
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
      // Filtro fecha
      if (filtroFecha !== 'todos') {
        const f = new Date(p.creado_en)
        if (filtroFecha === 'hoy'    && f < inicioHoy)    return false
        if (filtroFecha === 'semana' && f < inicioSemana) return false
        if (filtroFecha === 'mes'    && f < inicioMes)    return false
      }
      // Búsqueda
      const texto = busqueda.toLowerCase()
      if (texto) {
        const coincide =
          p.numero_orden.toLowerCase().includes(texto) ||
          p.nombres.toLowerCase().includes(texto) ||
          p.email.toLowerCase().includes(texto) ||
          p.whatsapp.includes(texto)
        if (!coincide) return false
      }
      return true
    })

    // Ordenar
    result = [...result].sort((a, b) => {
      switch (ordenSort) {
        case 'reciente': return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        case 'antiguo':  return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
        case 'mayor':    return b.total - a.total
        case 'menor':    return a.total - b.total
      }
    })
    return result
  }, [pedidos, filtroTipo, filtroEstado, filtroFecha, busqueda, ordenSort])

  // Stats
  const totalHoy      = pedidos.filter(p => new Date(p.creado_en).toDateString() === new Date().toDateString()).length
  const totalPendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const totalDelivery = pedidos.filter(p => p.tipo === 'delivery').length
  const totalLocal    = pedidos.filter(p => p.tipo === 'local').length

  const hayFiltros = filtroTipo !== 'todos' || filtroEstado !== 'todos' || filtroFecha !== 'todos' || busqueda

  async function cambiarEstado(id: string, nuevoEstado: EstadoPedido) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    let error = null
    if (nuevoEstado === 'confirmado') {
      const { error: rpcError } = await supabase.rpc('confirmar_pedido', { p_pedido_id: id })
      error = rpcError
    } else {
      const { error: updateError } = await supabase
        .from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
      error = updateError
    }
    setActualizando(null)
    if (error) { toast.error('Error al actualizar el estado'); return }
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    if (modalPedido?.id === id) setModalPedido(prev => prev ? { ...prev, estado: nuevoEstado } : null)
    toast.success('Estado actualizado')
    startTransition(() => router.refresh())
  }

  function exportarCSV() {
    // Escapa un valor para CSV: encierra en comillas si contiene coma, comilla o salto de línea
    const esc = (v: string | number | null | undefined): string => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const encabezado = [
      'N° Orden', 'Fecha', 'Hora', 'Estado', 'Tipo',
      'Nombres', 'Email', 'WhatsApp',
      'Ciudad', 'Provincia', 'Dirección',
      'Productos', 'Cantidad total',
      'Subtotal', 'Cupón', 'Descuento cupón', 'Costo envío', 'Total',
      'Moneda',
    ]

    const filas = filtrados.map(p => {
      const fecha  = new Date(p.creado_en)
      const items  = p.items as any[]
      const productosTexto = items
        .map(i => {
          const extras = [i.variante || i.nombre_variante, i.talla ? `T:${i.talla}` : null].filter(Boolean).join(' ')
          return `${i.nombre}${extras ? ` (${extras})` : ''} x${i.cantidad}`
        })
        .join(' | ')
      const cantidadTotal = items.reduce((s: number, i: any) => s + i.cantidad, 0)

      return [
        esc(p.numero_orden),
        esc(fecha.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })),
        esc(fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })),
        esc(ESTADOS[p.estado].etiqueta),
        esc(p.tipo === 'delivery' ? 'Delivery' : 'Local'),
        esc(p.nombres),
        esc(p.email),
        esc(p.whatsapp),
        esc(p.ciudad),
        esc(p.provincia),
        esc(p.tipo === 'delivery' ? [p.direccion, p.detalles_direccion].filter(Boolean).join(' — ') : 'Retiro en tienda'),
        esc(productosTexto),
        esc(cantidadTotal),
        esc(p.subtotal.toFixed(2)),
        esc(p.cupon_codigo),
        esc(p.descuento_cupon > 0 ? p.descuento_cupon.toFixed(2) : ''),
        esc(p.costo_envio > 0 ? p.costo_envio.toFixed(2) : ''),
        esc(p.total.toFixed(2)),
        esc(p.simbolo_moneda),
      ].join(',')
    })

    const csv = [encabezado.join(','), ...filas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filtrados.length} pedido${filtrados.length !== 1 ? 's' : ''} exportado${filtrados.length !== 1 ? 's' : ''}`)
  }

  function abrirWhatsApp(pedido: Pedido) {
    const num = pedido.whatsapp.replace(/\D/g, '')
    const msg = `Hola ${pedido.nombres.split(' ')[0]}, te escribimos sobre tu pedido ${pedido.numero_orden}.`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function limpiarFiltros() {
    setBusqueda(''); setFiltroTipo('todos'); setFiltroEstado('todos'); setFiltroFecha('todos')
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total pedidos', val: pedidos.length,     color: 'text-primary',      bg: 'bg-primary/10',      action: () => { limpiarFiltros() } },
          { label: 'Pendientes',    val: totalPendientes,    color: 'text-warning',      bg: 'bg-warning/10',      action: () => { limpiarFiltros(); setFiltroEstado('pendiente') } },
          { label: 'Delivery',      val: totalDelivery,      color: 'text-orange-500',   bg: 'bg-orange-500/10',   action: () => { limpiarFiltros(); setFiltroTipo('delivery') } },
          { label: 'Hoy',           val: totalHoy,           color: 'text-blue-500',     bg: 'bg-blue-500/10',     action: () => { limpiarFiltros(); setFiltroFecha('hoy') } },
        ].map(s => (
          <button key={s.label} onClick={s.action}
            className="rounded-xl bg-card border border-card-border p-3 text-center hover:border-border-strong transition-all active:scale-[0.97] cursor-pointer">
            <p className={cn('text-xl font-bold', s.color)}>{s.val}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Búsqueda + CSV */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input type="text" placeholder="Buscar orden, nombre, email, teléfono…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button onClick={exportarCSV}
          className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border text-foreground-muted text-sm font-medium hover:text-foreground hover:border-primary/40 transition-all flex-shrink-0">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">CSV</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        {/* Tipo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide w-14 flex-shrink-0">Tipo</span>
          <div className="flex rounded-xl border border-border overflow-hidden flex-shrink-0">
            {(['todos', 'delivery', 'local'] as FiltroTipo[]).map(f => (
              <button key={f} onClick={() => setFiltroTipo(f)}
                className={cn('px-3 py-2 text-xs font-semibold capitalize transition-all',
                  filtroTipo === f ? 'bg-primary text-white' : 'bg-card text-foreground-muted hover:text-foreground hover:bg-background-subtle'
                )}>
                {f === 'todos' ? 'Todos' : f === 'delivery' ? 'Delivery' : 'Local'}
              </button>
            ))}
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide w-14 flex-shrink-0">Estado</span>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFiltroEstado('todos')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                filtroEstado === 'todos' ? 'bg-foreground text-background border-foreground' : 'bg-card text-foreground-muted border-border hover:border-border-strong'
              )}>
              Todos
            </button>
            {(Object.keys(ESTADOS) as EstadoPedido[]).map(est => (
              <button key={est} onClick={() => setFiltroEstado(est)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1',
                  filtroEstado === est ? ESTADOS[est].color : 'bg-card text-foreground-muted border-border hover:border-border-strong'
                )}>
                {ESTADOS[est].icono}
                {ESTADOS[est].etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha + Orden */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide w-14 flex-shrink-0">Fecha</span>
          <div className="flex rounded-xl border border-border overflow-hidden flex-shrink-0">
            {([['todos', 'Todos'], ['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']] as [FiltroFecha, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFiltroFecha(f)}
                className={cn('px-3 py-2 text-xs font-semibold transition-all',
                  filtroFecha === f ? 'bg-primary text-white' : 'bg-card text-foreground-muted hover:text-foreground hover:bg-background-subtle'
                )}>
                {label}
              </button>
            ))}
          </div>
          {/* Sort */}
          <div className="ml-auto flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-foreground-muted" />
            <select value={ordenSort} onChange={e => setOrdenSort(e.target.value as OrdenSort)}
              className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              <option value="reciente">Más reciente</option>
              <option value="antiguo">Más antiguo</option>
              <option value="mayor">Mayor total</option>
              <option value="menor">Menor total</option>
            </select>
          </div>
        </div>

        {/* Limpiar filtros */}
        {hayFiltros && (
          <button onClick={limpiarFiltros}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-primary transition-colors self-start">
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin pedidos</p>
          <p className="text-xs text-foreground-muted mt-1">
            {hayFiltros ? 'Ningún resultado para esos filtros' : 'Los pedidos de clientes aparecerán aquí'}
          </p>
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="mt-3 text-xs text-primary hover:underline">
              Limpiar filtros
            </button>
          )}
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
                <div className="px-3 py-3 flex items-center gap-2.5">
                  {/* Tipo icono */}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    pedido.tipo === 'delivery' ? 'bg-orange-500/10' : 'bg-success/10')}>
                    {pedido.tipo === 'delivery'
                      ? <Truck className="w-4 h-4 text-orange-500" />
                      : <Store className="w-4 h-4 text-success" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{pedido.numero_orden}</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5', estado.color)}>
                        {estado.icono}
                        {estado.etiqueta}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted truncate">{pedido.nombres}</p>
                  </div>

                  {/* Total + fecha */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">{formatearPrecio(pedido.total, pedido.simbolo_moneda)}</p>
                    <p className="text-[10px] text-foreground-muted">
                      {new Date(pedido.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  {/* Cambiar estado */}
                  <div className="flex-shrink-0">
                    {actualizando === pedido.id ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select value={pedido.estado}
                          onChange={e => cambiarEstado(pedido.id, e.target.value as EstadoPedido)}
                          className={cn('text-[11px] font-bold pl-2 pr-5 py-1.5 rounded-lg border appearance-none cursor-pointer focus:outline-none', estado.color)}>
                          {Object.entries(ESTADOS).map(([val, { etiqueta }]) => (
                            <option key={val} value={val}>{etiqueta}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Expand */}
                  <button onClick={() => setExpandido(abierto ? null : pedido.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-background-subtle transition-all flex-shrink-0">
                    {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Detalle expandido */}
                {abierto && (
                  <div className="border-t border-border px-4 py-4 flex flex-col gap-4 bg-background-subtle/40">

                    {/* Contacto + botones */}
                    <div className="flex flex-col gap-2">
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
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Acción rápida WhatsApp */}
                      <button onClick={() => abrirWhatsApp(pedido)}
                        className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#1a9e4b] text-xs font-semibold hover:bg-[#25D366]/20 transition-all">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Contactar por WhatsApp
                      </button>
                    </div>

                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Productos y Servicios
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {(pedido.items as any[]).map((item, i) => (
                          <div key={i} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2 border border-border">
                            <div className="w-8 h-8 rounded-lg bg-background-subtle border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.imagen_url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                                : item.tipo_producto === 'servicio'
                                  ? <Calendar className="w-4 h-4 text-foreground-muted/40" />
                                  : <Package className="w-3.5 h-3.5 text-foreground-muted/40" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-semibold text-foreground truncate">{item.nombre}</p>
                                {item.tipo_producto === 'servicio' && (
                                  <span className="text-[9px] bg-blue-500/10 text-blue-600 px-1.5 py-[1px] rounded uppercase font-bold tracking-wide">
                                    Servicio
                                  </span>
                                )}
                              </div>
                              {(item.variante || item.nombre_variante || item.talla) && (
                                <p className="text-[10px] text-foreground-muted mt-[1px]">
                                  {[item.variante || item.nombre_variante, item.talla && `Talla: ${item.talla}`].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              {item.cita && (
                                <p className="text-[10px] text-foreground-muted mt-1 font-medium bg-background-subtle w-fit px-1.5 py-0.5 rounded">
                                  📅 {new Date(`${item.cita.fecha}T00:00:00`).toLocaleDateString('es-EC')} · ⏰ {item.cita.hora_inicio.slice(0, 5)}
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
        {hayFiltros && <> · <button onClick={limpiarFiltros} className="text-primary hover:underline">limpiar filtros</button></>}
      </p>
    </div>
  )
}
