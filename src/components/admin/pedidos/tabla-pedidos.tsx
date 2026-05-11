'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import {
  Search, Truck, Store, ChevronDown, ChevronUp,
  Package, Phone, Mail, MapPin, Download, ShoppingBag,
  Calendar, MessageCircle, X, Clock, CheckCircle2,
  RotateCcw, XCircle, Send, ArrowUpDown, FileText, Loader2,
  RefreshCw, AlertCircle, BadgeCheck, ExternalLink, Receipt, Printer, Users, Pause, MoreHorizontal, Eye, Trash2, Check, Upload,
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatearPrecio } from '@/lib/utils'
import { imprimirTicket, type ConfigTicket } from '@/lib/ticket'
import type { Pedido, EstadoPedido } from '@/types'

const ESTADOS: Record<EstadoPedido, { etiqueta: string; color: string; icono: React.ReactNode }> = {
  pendiente_pago:        { etiqueta: 'Pendiente de pago',    color: 'bg-gray-100 text-gray-600 border-gray-200',     icono: <Clock className="w-3 h-3" /> },
  pendiente_validacion:  { etiqueta: 'Validando comprobante', color: 'bg-amber-50 text-amber-700 border-amber-200',  icono: <Upload className="w-3 h-3" /> },
  procesando:            { etiqueta: 'Procesando',           color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icono: <RotateCcw className="w-3 h-3" /> },
  en_espera:      { etiqueta: 'En espera',         color: 'bg-amber-50 text-amber-700 border-amber-200', icono: <Pause className="w-3 h-3" /> },
  completado:     { etiqueta: 'Completado',        color: 'bg-blue-50 text-blue-700 border-blue-200', icono: <CheckCircle2 className="w-3 h-3" /> },
  cancelado:      { etiqueta: 'Cancelado',         color: 'bg-red-50 text-red-700 border-red-200', icono: <XCircle className="w-3 h-3" /> },
  reembolsado:    { etiqueta: 'Reembolsado',       color: 'bg-gray-100 text-gray-500 border-gray-200', icono: <RotateCcw className="w-3 h-3" /> },
  fallido:        { etiqueta: 'Fallido',           color: 'bg-red-100 text-red-800 border-red-200', icono: <AlertCircle className="w-3 h-3" /> },
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
  const [modalPedido, setModalPedido] = useState<Pedido | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [emitiendoFactura, setEmitiendoFactura] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  
  // pedidoId → { facturaId, estado, numeroFactura, numeroAutorizacion, errorSri }
  type InfoFactura = { facturaId: string; estado: string; numeroFactura?: string; numeroAutorizacion?: string; errorSri?: string }
  const [facturasEmitidas, setFacturasEmitidas] = useState<Record<string, InfoFactura>>({})

  // Carga facturas existentes
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

  useEffect(() => {
    const ids = pedidosInic.map(p => p.id)
    cargarFacturas(ids)
  }, [pedidosInic])

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
        toast.info('El SRI aún no ha procesado la autorización.')
        if (data.facturaId) {
          setFacturasEmitidas(prev => ({ ...prev, [pedidoId]: { ...(prev[pedidoId] ?? {}), facturaId: data.facturaId, estado: 'enviada' } }))
        }
      } else if (data.facturaId) {
        const msg = data.error ?? 'El SRI rechazó el comprobante'
        toast.error(`SRI: ${msg}`)
        setFacturasEmitidas(prev => ({ ...prev, [pedidoId]: { facturaId: data.facturaId, estado: data.estado ?? 'rechazada', errorSri: msg } }))
      } else {
        toast.error(data.error ?? 'Error al emitir la factura')
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
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
      if (filtroFecha !== 'todos') {
        const f = new Date(p.creado_en)
        if (filtroFecha === 'hoy'    && f < inicioHoy)    return false
        if (filtroFecha === 'semana' && f < inicioSemana) return false
        if (filtroFecha === 'mes'    && f < inicioMes)    return false
      }
      const texto = busqueda.toLowerCase()
      if (texto) {
        return (
          p.numero_orden.toLowerCase().includes(texto) ||
          p.nombres.toLowerCase().includes(texto) ||
          p.email.toLowerCase().includes(texto) ||
          p.whatsapp.includes(texto)
        )
      }
      return true
    })

    result = [...result].sort((a, b) => {
      switch (ordenSort) {
        case 'reciente': return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        case 'antiguo':  return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
        case 'mayor':    return b.total - a.total
        case 'menor':    return a.total - b.total
        default: return 0
      }
    })
    return result
  }, [pedidos, filtroTipo, filtroEstado, filtroFecha, busqueda, ordenSort])

  // Stats para las pestañas
  const counts = useMemo(() => {
    return {
      todos: pedidos.length,
      pendiente_validacion: pedidos.filter(p => p.estado === 'pendiente_validacion').length,
      procesando: pedidos.filter(p => p.estado === 'procesando').length,
      en_espera: pedidos.filter(p => p.estado === 'en_espera').length,
      completado: pedidos.filter(p => p.estado === 'completado').length,
      cancelado: pedidos.filter(p => p.estado === 'cancelado').length,
    }
  }, [pedidos])

  async function cambiarEstado(id: string, nuevoEstado: EstadoPedido) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    let error = null
    if (nuevoEstado === 'procesando') {
      const { error: rpcError } = await supabase.rpc('confirmar_pedido', { p_pedido_id: id })
      error = rpcError
      if (!error) {
        const pedido = pedidos.find(p => p.id === id)
        if (pedido?.comprobante_url) {
          await supabase.rpc('marcar_comprobante_para_eliminar', { p_pedido_id: id })
        }
      }
    } else {
      const { error: updateError } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
      error = updateError
    }
    setActualizando(null)
    if (error) { toast.error('Error al actualizar el estado'); return }
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    toast.success('Estado actualizado')
    startTransition(() => router.refresh())
  }

  async function ejecutarAccionMasiva(accion: 'completado' | 'cancelado' | 'eliminar') {
    if (seleccionados.length === 0) return
    if (accion === 'eliminar' && !confirm(`¿Estás seguro de eliminar ${seleccionados.length} pedidos?`)) return

    const supabase = crearClienteSupabase()
    let error = null

    if (accion === 'eliminar') {
      const { error: delErr } = await supabase.from('pedidos').delete().in('id', seleccionados)
      error = delErr
      if (!error) setPedidos(ps => ps.filter(p => !seleccionados.includes(p.id)))
    } else {
      const { error: updErr } = await supabase.from('pedidos').update({ estado: accion }).in('id', seleccionados)
      error = updErr
      if (!error) setPedidos(ps => ps.map(p => seleccionados.includes(p.id) ? { ...p, estado: accion } : p))
    }

    if (error) toast.error('Error al ejecutar acción masiva')
    else {
      toast.success('Acción ejecutada con éxito')
      setSeleccionados([])
      startTransition(() => router.refresh())
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function seleccionarTodos() {
    if (seleccionados.length === filtrados.length) setSeleccionados([])
    else setSeleccionados(filtrados.map(p => p.id))
  }

  function limpiarFiltros() {
    setBusqueda(''); setFiltroTipo('todos'); setFiltroEstado('todos'); setFiltroFecha('todos')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ══ PESTAÑAS DE ESTADO (Estilo WooCommerce) ══ */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs border-b border-border pb-1">
        {[
          { id: 'todos',                label: 'Todos',               count: counts.todos },
          { id: 'pendiente_validacion', label: 'Por validar',         count: counts.pendiente_validacion },
          { id: 'procesando',           label: 'Procesando',          count: counts.procesando },
          { id: 'en_espera',            label: 'En espera',           count: counts.en_espera },
          { id: 'completado',           label: 'Completados',         count: counts.completado },
          { id: 'cancelado',            label: 'Cancelados',          count: counts.cancelado },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroEstado(tab.id as FiltroEstado)}
            className={cn(
              'pb-2 px-1 transition-all relative font-medium',
              filtroEstado === tab.id ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {tab.label} <span className="opacity-50">({tab.count})</span>
            {filtroEstado === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* ══ BARRA DE ACCIONES Y FILTROS ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Acciones en lote */}
          <select
            className="h-9 pl-3 pr-8 rounded-lg bg-card border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            onChange={(e) => ejecutarAccionMasiva(e.target.value as any)}
            value=""
          >
            <option value="" disabled>Acciones en lote</option>
            <option value="completado">Marcar como completado</option>
            <option value="cancelado">Marcar como cancelado</option>
            <option value="eliminar" className="text-danger">Eliminar pedidos</option>
          </select>

          {/* Filtro Fecha */}
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value as FiltroFecha)}
            className="h-9 px-3 rounded-lg bg-card border border-border text-xs font-medium focus:outline-none appearance-none cursor-pointer"
          >
            <option value="todos">Todas las fechas</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Últimos 7 días</option>
            <option value="mes">Este mes</option>
          </select>

          {/* Filtro Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
            className="h-9 px-3 rounded-lg bg-card border border-border text-xs font-medium focus:outline-none appearance-none cursor-pointer"
          >
            <option value="todos">Todos los tipos</option>
            <option value="delivery">Envío a domicilio</option>
            <option value="local">Retiro en local</option>
          </select>

          <button onClick={limpiarFiltros} className="text-xs font-bold text-primary hover:underline px-2">Limpiar filtros</button>
        </div>

        {/* Búsqueda */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar pedidos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* ══ TABLA DINÁMICA (Desktop) ══ */}
      <div className="bg-card rounded-xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={seleccionados.length === filtrados.length && filtrados.length > 0}
                    onChange={seleccionarTodos}
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                </th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-foreground-muted">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">No se encontraron pedidos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map(pedido => {
                  const est = ESTADOS[pedido.estado] || ESTADOS.procesando
                  const fac = facturasEmitidas[pedido.id]
                  return (
                    <tr key={pedido.id} className={cn(
                      'hover:bg-background-subtle/30 transition-colors group',
                      pedido.estado === 'pendiente_validacion' && 'bg-amber-50/40'
                    )}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(pedido.id)}
                          onChange={() => toggleSeleccion(pedido.id)}
                          className="rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <Link href={`/admin/dashboard/pedidos/${pedido.id}`} className="text-sm font-bold text-primary hover:underline">
                            #{pedido.numero_orden.split('-')[1] || pedido.numero_orden} {pedido.nombres}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1">
                            {pedido.tipo === 'delivery' ? <Truck className="w-3 h-3 text-orange-500" /> : <Store className="w-3 h-3 text-emerald-500" />}
                            <span className="text-[10px] font-medium text-foreground-muted">{pedido.tipo === 'delivery' ? 'Envío' : 'Local'}</span>
                            {fac && (
                              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-lg border ml-2',
                                fac.estado === 'autorizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                              )}>
                                FAC {fac.estado === 'autorizada' ? 'OK' : 'PND'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-foreground-muted">
                        <p>{new Date(pedido.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="opacity-50 mt-0.5">{new Date(pedido.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative group/status w-fit">
                          <select
                            value={pedido.estado}
                            onChange={(e) => cambiarEstado(pedido.id, e.target.value as EstadoPedido)}
                            disabled={actualizando === pedido.id}
                            className={cn(
                              'appearance-none h-8 pl-3 pr-8 rounded-lg border text-[11px] font-bold transition-all cursor-pointer focus:outline-none',
                              est.color
                            )}
                          >
                            {Object.entries(ESTADOS).map(([val, { etiqueta }]) => (
                              <option key={val} value={val}>{etiqueta}</option>
                            ))}
                          </select>
                          {actualizando === pedido.id ? (
                             <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin opacity-50" />
                          ) : (
                             <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 group-hover/status:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-foreground">{formatearPrecio(pedido.total, pedido.simbolo_moneda)}</p>
                        <p className="text-[10px] text-foreground-muted mt-0.5">{pedido.items.length} ítem{(pedido.items as any[]).length !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button
                             title="Imprimir ticket"
                             onClick={() => imprimirTicket({
                               numero_orden: pedido.numero_orden,
                               creado_en: pedido.creado_en,
                               nombres: pedido.nombres,
                               tipo: pedido.tipo,
                               forma_pago: pedido.forma_pago ?? null,
                               items: (pedido.items as any[]).map(i => ({
                                 nombre: i.nombre,
                                 cantidad: i.cantidad,
                                 precio: Number(i.precio),
                                 subtotal: Number(i.subtotal),
                               })),
                               subtotal: pedido.subtotal,
                               descuento_cupon: pedido.descuento_cupon,
                               cupon_codigo: pedido.cupon_codigo,
                               costo_envio: pedido.costo_envio,
                               total: pedido.total,
                               ciudad: pedido.ciudad,
                               provincia: pedido.provincia,
                             }, configTicket)}
                             className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                           >
                             <Printer className="w-3.5 h-3.5" />
                           </button>

                           {/* Botón Factura SRI si está completado */}
                           {pedido.estado === 'completado' && !fac && (
                             <button
                               onClick={() => emitirFactura(pedido.id)}
                               disabled={emitiendoFactura === pedido.id}
                               className="h-8 px-2 rounded-lg bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1"
                             >
                               {emitiendoFactura === pedido.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                               SRI
                             </button>
                           )}

                           {fac?.estado === 'autorizada' && (
                              <a href={`/api/facturacion/ride?id=${fac.facturaId}`} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </a>
                           )}

                           <Link href={`/admin/dashboard/pedidos/${pedido.id}`}
                             className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                           >
                             <Eye className="w-3.5 h-3.5" />
                           </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <p className="text-[11px] font-medium text-foreground-muted">
          Mostrando {filtrados.length} de {pedidos.length} pedidos
        </p>
        <div className="flex items-center gap-2">
          <button disabled className="h-8 px-3 rounded-lg border border-border text-[11px] font-bold opacity-30 cursor-not-allowed transition-all">Anterior</button>
          <button disabled className="h-8 px-3 rounded-lg border border-border text-[11px] font-bold opacity-30 cursor-not-allowed transition-all">Siguiente</button>
        </div>
      </div>
    </div>
  )
}

// ── Componente Link Dummy si no se importa ───────────────────────
function Link({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
  return <a href={href} className={className}>{children}</a>
}
