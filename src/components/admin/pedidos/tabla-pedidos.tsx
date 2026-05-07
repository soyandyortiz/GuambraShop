'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import {
  Search, Truck, Store, ChevronDown, ChevronUp,
  Package, Phone, Mail, MapPin, Download, ShoppingBag,
  Calendar, MessageCircle, X, Clock, CheckCircle2,
  RotateCcw, XCircle, Send, ArrowUpDown, FileText, Loader2,
  RefreshCw, AlertCircle, BadgeCheck, ExternalLink, Receipt, Printer, Users,
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatearPrecio } from '@/lib/utils'
import { imprimirTicket, type ConfigTicket } from '@/lib/ticket'
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

interface Props {
  pedidos: Pedido[]
  configTicket: ConfigTicket
}

export function TablaPedidos({ pedidos: pedidosInic, configTicket }: Props) {
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
  const [emitiendoFactura, setEmitiendoFactura] = useState<string | null>(null)
  // Vincular cliente
  const [vinculandoPedidoId, setVinculandoPedidoId]   = useState<string | null>(null)
  const [busqVincular, setBusqVincular]               = useState('')
  const [clientesVincular, setClientesVincular]       = useState<{ id: string; razon_social: string; identificacion: string }[]>([])
  const [pedidoClienteId, setPedidoClienteId]         = useState<Record<string, string | null>>({})
  // pedidoId → { facturaId, estado, numeroFactura, numeroAutorizacion, errorSri }
  type InfoFactura = { facturaId: string; estado: string; numeroFactura?: string; numeroAutorizacion?: string; errorSri?: string }
  const [facturasEmitidas, setFacturasEmitidas] = useState<Record<string, InfoFactura>>({})

  // Carga facturas existentes para pedidos entregados
  function cargarFacturas(ids: string[]) {
    if (ids.length === 0) return
    const supabase = crearClienteSupabase()
    supabase
      .from('facturas')
      .select('id, pedido_id, estado, numero_factura, numero_autorizacion, error_sri')
      .in('pedido_id', ids)
      .neq('estado', 'anulada')
      .then(({ data }) => {
        if (!data) return
        const mapa: Record<string, InfoFactura> = {}
        for (const f of data) {
          if (f.pedido_id) {
            mapa[f.pedido_id] = {
              facturaId:          f.id,
              estado:             f.estado,
              numeroFactura:      f.numero_factura ?? undefined,
              numeroAutorizacion: f.numero_autorizacion ?? undefined,
              errorSri:           f.error_sri ?? undefined,
            }
          }
        }
        setFacturasEmitidas(mapa)
      })
  }

  // Carga inicial — todos los pedidos, no solo entregados
  useEffect(() => {
    const ids = pedidosInic.map(p => p.id)
    cargarFacturas(ids)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidosInic])

  // Auto-polling cada 20 s mientras haya facturas en estado "enviada"
  useEffect(() => {
    const hayEnviadas = Object.values(facturasEmitidas).some(f => f.estado === 'enviada')
    if (!hayEnviadas) return
    const timer = setInterval(() => {
      cargarFacturas(pedidos.map(p => p.id))
    }, 60_000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturasEmitidas, pedidos])

  async function emitirFactura(pedidoId: string) {
    setEmitiendoFactura(pedidoId)
    try {
      const res  = await fetch('/api/facturacion/desde-pedido', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pedidoId }),
      })
      const data = await res.json()

      if (data.ok && data.estado === 'autorizada') {
        toast.success(`Factura ${data.numeroFactura ?? ''} autorizada por el SRI`)
        setFacturasEmitidas(prev => ({
          ...prev,
          [pedidoId]: {
            facturaId:          data.facturaId,
            estado:             'autorizada',
            numeroFactura:      data.numeroFactura,
            numeroAutorizacion: data.numeroAutorizacion,
          },
        }))
      } else if (data.estado === 'enviada') {
        // SRI aún procesando — no es error, mostrar info
        toast.info('El SRI aún no ha procesado la autorización. Se reintentará automáticamente.', { duration: 8000 })
        if (data.facturaId) {
          setFacturasEmitidas(prev => ({ ...prev, [pedidoId]: { ...(prev[pedidoId] ?? {}), facturaId: data.facturaId, estado: 'enviada' } }))
        }
      } else if (data.facturaId) {
        const msg = data.error ?? 'El SRI rechazó el comprobante'
        toast.error(`SRI: ${msg}`, { duration: 10000 })
        setFacturasEmitidas(prev => ({ ...prev, [pedidoId]: { facturaId: data.facturaId, estado: data.estado ?? 'rechazada', errorSri: msg } }))
      } else {
        toast.error(data.error ?? 'Error al emitir la factura', { duration: 8000 })
      }
    } catch {
      toast.error('Error de conexión al emitir la factura')
    } finally {
      setEmitiendoFactura(null)
    }
  }

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

  async function buscarClientesVincular(texto: string) {
    setBusqVincular(texto)
    if (texto.trim().length < 2) { setClientesVincular([]); return }
    const supabase = crearClienteSupabase()
    const { data } = await supabase
      .from('clientes')
      .select('id, razon_social, identificacion')
      .or(`razon_social.ilike.%${texto}%,identificacion.ilike.%${texto}%`)
      .limit(6)
    setClientesVincular(data ?? [])
  }

  async function vincularCliente(pedidoId: string, clienteId: string) {
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('pedidos')
      .update({ cliente_id: clienteId })
      .eq('id', pedidoId)
    if (error) { toast.error('Error al vincular'); return }
    setPedidoClienteId(prev => ({ ...prev, [pedidoId]: clienteId }))
    setPedidos(ps => ps.map(p => p.id === pedidoId ? { ...p, cliente_id: clienteId } : p))
    setVinculandoPedidoId(null)
    setBusqVincular('')
    setClientesVincular([])
    toast.success('Cliente vinculado al pedido')
  }

  async function desvincularCliente(pedidoId: string) {
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('pedidos')
      .update({ cliente_id: null })
      .eq('id', pedidoId)
    if (error) { toast.error('Error al desvincular'); return }
    setPedidoClienteId(prev => ({ ...prev, [pedidoId]: null }))
    setPedidos(ps => ps.map(p => p.id === pedidoId ? { ...p, cliente_id: null } : p))
    toast.success('Cliente desvinculado')
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
                      {/* Badge de factura — visible en cualquier estado del pedido */}
                      {facturasEmitidas[pedido.id] && (() => {
                        const f = facturasEmitidas[pedido.id]
                        const cfg = f.estado === 'autorizada'
                          ? { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Facturado' }
                          : f.estado === 'enviada'
                          ? { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'FAC pendiente' }
                          : { color: 'bg-red-50 text-red-700 border-red-200', label: 'FAC rechazada' }
                        return (
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5', cfg.color)}>
                            <Receipt className="w-2.5 h-2.5" />
                            {cfg.label}
                          </span>
                        )
                      })()}
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
                  <div className="flex items-center gap-2 flex-shrink-0">
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

                    {/* Botones SRI — solo pedidos entregados */}
                    {pedido.estado === 'entregado' && (() => {
                      const emitida = facturasEmitidas[pedido.id]
                      const cargando = emitiendoFactura === pedido.id

                      if (emitida?.estado === 'autorizada') {
                        return (
                          <div className="flex items-center gap-1">
                            <a href={`/api/facturacion/ride?id=${emitida.facturaId}`} target="_blank" rel="noopener noreferrer"
                              title={`Factura ${emitida.numeroFactura} — Descargar RIDE PDF`}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors">
                              <FileText className="w-3 h-3" /> RIDE
                            </a>
                            <a href={`/api/facturacion/xml?id=${emitida.facturaId}`} target="_blank" rel="noopener noreferrer"
                              title="Descargar XML firmado"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 hover:bg-blue-100 transition-colors">
                              <Download className="w-3 h-3" /> XML
                            </a>
                          </div>
                        )
                      }

                      if (emitida?.estado === 'enviada') {
                        return (
                          <button onClick={() => emitirFactura(pedido.id)} disabled={cargando}
                            title="El SRI recibió el comprobante y está procesando la autorización. Haz clic para consultar el estado."
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50">
                            {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            {cargando ? 'Consultando…' : 'Pendiente SRI'}
                          </button>
                        )
                      }

                      if (emitida?.estado === 'rechazada') {
                        return (
                          <button onClick={() => emitirFactura(pedido.id)} disabled={cargando}
                            title={emitida.errorSri ? `Error: ${emitida.errorSri}` : 'Reintentar emisión al SRI'}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                            {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                            {cargando ? 'Reintentando…' : 'Reintentar'}
                          </button>
                        )
                      }

                      return (
                        <button onClick={() => emitirFactura(pedido.id)} disabled={cargando}
                          title="Generar y emitir factura electrónica al SRI"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50">
                          {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                          {cargando ? 'Enviando…' : 'Factura SRI'}
                        </button>
                      )
                    })()}
                  </div>

                  {/* Imprimir ticket — pedidos entregados o ventas manuales */}
                  {(pedido.estado === 'entregado' || pedido.es_venta_manual) && (
                    <button
                      title={`Imprimir ticket ${configTicket.anchoPapel ?? '80'}mm`}
                      onClick={() => imprimirTicket({
                        numero_orden:    pedido.numero_orden,
                        creado_en:       pedido.creado_en,
                        nombres:         pedido.nombres,
                        tipo:            pedido.tipo,
                        forma_pago:      pedido.forma_pago ?? null,
                        items:           (pedido.items as any[]).map(i => ({
                          nombre:   i.nombre,
                          cantidad: i.cantidad,
                          precio:   Number(i.precio),
                          subtotal: Number(i.subtotal),
                        })),
                        subtotal:        pedido.subtotal,
                        descuento_cupon: pedido.descuento_cupon,
                        cupon_codigo:    pedido.cupon_codigo,
                        costo_envio:     pedido.costo_envio,
                        total:           pedido.total,
                        ciudad:          pedido.ciudad,
                        provincia:       pedido.provincia,
                      }, configTicket)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-primary/10 hover:text-primary transition-all flex-shrink-0"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}

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

                    {/* Vincular a cliente */}
                    <div className="flex flex-col gap-2">
                      {pedido.cliente_id ? (
                        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                          <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-xs font-semibold text-foreground flex-1 truncate">Cliente vinculado</span>
                          <button
                            onClick={() => desvincularCliente(pedido.id)}
                            className="text-[11px] text-danger hover:opacity-80 transition-opacity flex-shrink-0"
                          >
                            Desvincular
                          </button>
                        </div>
                      ) : vinculandoPedidoId === pedido.id ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar cliente por nombre o identificación…"
                              value={busqVincular}
                              onChange={e => buscarClientesVincular(e.target.value)}
                              className="w-full h-9 pl-9 pr-3 rounded-xl border border-primary/40 bg-input-bg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          {clientesVincular.length > 0 && (
                            <div className="flex flex-col gap-1 border border-border rounded-xl bg-card p-1">
                              {clientesVincular.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => vincularCliente(pedido.id, c.id)}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background-subtle text-left transition-colors"
                                >
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold text-primary">{c.razon_social.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{c.razon_social}</p>
                                    <p className="text-[10px] font-mono text-foreground-muted">{c.identificacion}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {busqVincular.length >= 2 && clientesVincular.length === 0 && (
                            <p className="text-xs text-foreground-muted text-center py-1">Sin resultados</p>
                          )}
                          <button
                            onClick={() => { setVinculandoPedidoId(null); setBusqVincular(''); setClientesVincular([]) }}
                            className="text-xs text-foreground-muted hover:text-foreground text-center transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setVinculandoPedidoId(pedido.id); setBusqVincular(''); setClientesVincular([]) }}
                          className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-dashed border-border text-foreground-muted text-xs font-medium hover:border-primary/50 hover:text-primary transition-all"
                        >
                          <Users className="w-3.5 h-3.5" /> Vincular a cliente registrado
                        </button>
                      )}
                    </div>

                    {/* Imprimir ticket térmica */}
                    <button
                      onClick={() => imprimirTicket({
                        numero_orden:    pedido.numero_orden,
                        creado_en:       pedido.creado_en,
                        nombres:         pedido.nombres,
                        tipo:            pedido.tipo,
                        forma_pago:      pedido.forma_pago ?? null,
                        items:           (pedido.items as any[]).map(i => ({
                          nombre:    i.nombre,
                          cantidad:  i.cantidad,
                          precio:    Number(i.precio),
                          subtotal:  Number(i.subtotal),
                        })),
                        subtotal:        pedido.subtotal,
                        descuento_cupon: pedido.descuento_cupon,
                        cupon_codigo:    pedido.cupon_codigo,
                        costo_envio:     pedido.costo_envio,
                        total:           pedido.total,
                        ciudad:          pedido.ciudad,
                        provincia:       pedido.provincia,
                      }, configTicket)}
                      className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-border text-foreground-muted text-xs font-semibold hover:border-primary/50 hover:text-primary transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir ticket {configTicket.anchoPapel ?? '80'}mm
                    </button>

                    {/* Datos de facturación que el cliente ingresó en checkout */}
                    {pedido.datos_facturacion && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Receipt className="w-3 h-3" /> Datos de facturación del cliente
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                          <p><span className="text-foreground-muted">Nombre:</span> <span className="font-medium text-foreground">{pedido.datos_facturacion.razon_social}</span></p>
                          <p><span className="text-foreground-muted">ID:</span> <span className="font-medium font-mono text-foreground">{pedido.datos_facturacion.identificacion}</span></p>
                          {pedido.datos_facturacion.email && <p className="col-span-2"><span className="text-foreground-muted">Email:</span> <span className="font-medium text-foreground">{pedido.datos_facturacion.email}</span></p>}
                        </div>
                      </div>
                    )}

                    {/* Panel Factura SRI — visible para cualquier estado del pedido */}
                    {(() => {
                      const emitida = facturasEmitidas[pedido.id]
                      const cargando = emitiendoFactura === pedido.id
                      // Ventas manuales del POS se pueden facturar en cualquier estado
                      const esEntregado = pedido.estado === 'entregado' || pedido.es_venta_manual

                      if (emitida?.estado === 'autorizada') {
                        return (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span className="text-xs font-bold text-emerald-700">Factura autorizada por el SRI</span>
                              </div>
                              <a href="/admin/dashboard/facturacion" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors flex-shrink-0">
                                Ver en Facturación <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                            {emitida.numeroFactura && (
                              <p className="text-[11px] text-foreground-muted mb-0.5">
                                <span className="font-semibold text-foreground">N° Factura:</span> {emitida.numeroFactura}
                              </p>
                            )}
                            {emitida.numeroAutorizacion && (
                              <p className="text-[10px] text-foreground-muted font-mono break-all mb-2">
                                <span className="font-semibold not-italic text-foreground">Autorización:</span> {emitida.numeroAutorizacion}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <a href={`/api/facturacion/ride?id=${emitida.facturaId}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 flex-1 justify-center h-8 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
                                <FileText className="w-3.5 h-3.5" /> Descargar RIDE (PDF)
                              </a>
                              <a href={`/api/facturacion/xml?id=${emitida.facturaId}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 flex-1 justify-center h-8 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                                <Download className="w-3.5 h-3.5" /> Descargar XML
                              </a>
                            </div>
                          </div>
                        )
                      }

                      if (emitida?.estado === 'enviada') {
                        return (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-amber-700">Pendiente de autorización SRI</p>
                                  <p className="text-[10px] text-amber-600 mt-0.5">El SRI recibió el comprobante y lo está procesando. Se actualiza automáticamente.</p>
                                </div>
                              </div>
                              {esEntregado && (
                                <button onClick={() => emitirFactura(pedido.id)} disabled={cargando}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 hover:bg-amber-200 transition-colors disabled:opacity-50 flex-shrink-0">
                                  {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                  Consultar
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      }

                      if (emitida?.estado === 'rechazada') {
                        return (
                          <div className="rounded-xl border border-red-200 bg-red-50/60 px-3 py-3">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-red-700">Rechazado por el SRI</p>
                                {emitida.errorSri && (
                                  <p className="text-[10px] text-red-600 mt-0.5 break-words">{emitida.errorSri}</p>
                                )}
                              </div>
                            </div>
                            {esEntregado && (
                              <button onClick={() => emitirFactura(pedido.id)} disabled={cargando}
                                className="flex items-center gap-1.5 w-full justify-center h-8 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                                {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                {cargando ? 'Reintentando…' : 'Reintentar emisión SRI'}
                              </button>
                            )}
                          </div>
                        )
                      }

                      // Sin factura — solo mostrar botón de emitir si está entregado
                      if (esEntregado) {
                        return (
                          <button onClick={() => emitirFactura(pedido.id)} disabled={cargando}
                            className="flex items-center gap-2 w-full justify-center h-9 rounded-xl bg-primary/10 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50">
                            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            {cargando ? 'Generando y enviando al SRI…' : 'Emitir factura electrónica SRI'}
                          </button>
                        )
                      }

                      return null
                    })()}

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
