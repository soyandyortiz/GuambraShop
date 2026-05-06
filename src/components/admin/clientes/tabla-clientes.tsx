'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronDown, Users, ShoppingBag, MapPin, Mail, Phone,
  MessageCircle, ArrowUpDown, Package, Clock, CheckCircle2,
  RotateCcw, Send, XCircle, Pencil, Trash2, UserPlus, FileText,
  Receipt, CreditCard, Globe, Download, Loader2
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { FormularioCliente } from './formulario-cliente'
import type { Cliente, EstadoPedido } from '@/types'

export interface PedidoResumen {
  numero_orden: string
  total: number
  estado: EstadoPedido
  creado_en: string
  tipo: string
}

export interface ClienteConPedidos extends Cliente {
  pedidos: PedidoResumen[]
  total_pedidos: number
  total_gastado: number
  ultimo_pedido_en: string | null
}

interface Props {
  clientes: ClienteConPedidos[]
  simboloMoneda: string
  pais?: string
}

type OrdenSort = 'reciente' | 'pedidos' | 'gastado' | 'nombre'

const ETIQUETAS_TIPO = {
  ruc:              { label: 'RUC',     clase: 'bg-blue-500/10 text-blue-600' },
  cedula:           { label: 'Cédula',  clase: 'bg-purple-500/10 text-purple-600' },
  pasaporte:        { label: 'Pasap.',  clase: 'bg-orange-500/10 text-orange-600' },
  consumidor_final: { label: 'Consumidor',  clase: 'bg-foreground-muted/10 text-foreground-muted' },
}

const COLORES_ESTADO: Record<EstadoPedido, string> = {
  pendiente:  'bg-warning/10 text-warning',
  confirmado: 'bg-blue-500/10 text-blue-600',
  en_proceso: 'bg-orange-500/10 text-orange-600',
  enviado:    'bg-indigo-500/10 text-indigo-600',
  entregado:  'bg-success/10 text-success',
  cancelado:  'bg-danger/10 text-danger',
}

const ICONOS_ESTADO: Record<EstadoPedido, React.ReactNode> = {
  pendiente:  <Clock className="w-2.5 h-2.5" />,
  confirmado: <CheckCircle2 className="w-2.5 h-2.5" />,
  en_proceso: <RotateCcw className="w-2.5 h-2.5" />,
  enviado:    <Send className="w-2.5 h-2.5" />,
  entregado:  <CheckCircle2 className="w-2.5 h-2.5" />,
  cancelado:  <XCircle className="w-2.5 h-2.5" />,
}

const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  en_proceso: 'En proceso',
  enviado:    'Enviado',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
}

export function TablaClientes({ clientes, simboloMoneda, pais = 'EC' }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busqueda, setBusqueda]           = useState('')
  const [orden, setOrden]                 = useState<OrdenSort>('reciente')
  const [expandido, setExpandido]         = useState<string | null>(null)
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [clienteEditar, setClienteEditar] = useState<Cliente | undefined>()
  const [importando, setImportando]       = useState(false)

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    let result = clientes.filter(c => {
      if (!texto) return true
      return (
        c.razon_social.toLowerCase().includes(texto) ||
        c.identificacion.includes(texto) ||
        (c.email ?? '').toLowerCase().includes(texto) ||
        (c.telefono ?? '').includes(texto) ||
        (c.ciudad ?? '').toLowerCase().includes(texto)
      )
    })
    return [...result].sort((a, b) => {
      switch (orden) {
        case 'reciente': {
          const ta = a.ultimo_pedido_en ? new Date(a.ultimo_pedido_en).getTime() : new Date(a.creado_en).getTime()
          const tb = b.ultimo_pedido_en ? new Date(b.ultimo_pedido_en).getTime() : new Date(b.creado_en).getTime()
          return tb - ta
        }
        case 'pedidos':  return b.total_pedidos - a.total_pedidos
        case 'gastado':  return b.total_gastado - a.total_gastado
        case 'nombre':   return a.razon_social.localeCompare(b.razon_social)
      }
    })
  }, [clientes, busqueda, orden])

  async function importarDesdePedidos() {
    if (!confirm('Se crearán clientes a partir de los pedidos existentes y se vincularán automáticamente. ¿Continuar?')) return
    setImportando(true)
    try {
      const res  = await fetch('/api/admin/importar-clientes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al importar'); return }
      toast.success(
        `Importación completa — ${data.creados} cliente${data.creados !== 1 ? 's' : ''} creado${data.creados !== 1 ? 's' : ''}, ${data.vinculados} pedido${data.vinculados !== 1 ? 's' : ''} vinculado${data.vinculados !== 1 ? 's' : ''}` +
        (data.omitidos > 0 ? `, ${data.omitidos} omitidos` : ''),
        { duration: 6000 }
      )
      startTransition(() => router.refresh())
    } catch {
      toast.error('Error de conexión')
    } finally {
      setImportando(false)
    }
  }

  function abrirNuevo() {
    setClienteEditar(undefined)
    setModalAbierto(true)
  }

  function abrirEditar(cliente: Cliente) {
    setClienteEditar(cliente)
    setModalAbierto(true)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el cliente "${nombre}"? Esta acción no se puede deshacer.`)) return
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar'); return }
    toast.success('Cliente eliminado')
    startTransition(() => router.refresh())
  }

  function abrirWhatsApp(telefono: string) {
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Barra de acciones */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC/cédula, email o ciudad…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
          <select
            value={orden}
            onChange={e => setOrden(e.target.value as OrdenSort)}
            className="h-10 pl-8 pr-8 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="reciente">Más recientes</option>
            <option value="pedidos">Más pedidos</option>
            <option value="gastado">Más gastado</option>
            <option value="nombre">Nombre A–Z</option>
          </select>
        </div>
        <button
          onClick={importarDesdePedidos}
          disabled={importando}
          className="h-10 px-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm font-semibold flex items-center gap-2 hover:border-primary/50 hover:text-primary transition-all flex-shrink-0 disabled:opacity-50"
          title="Crear clientes a partir de pedidos existentes"
        >
          {importando
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">{importando ? 'Importando…' : 'Importar pedidos'}</span>
        </button>
        <button
          onClick={abrirNuevo}
          className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo cliente</span>
        </button>
      </div>

      {/* Contador */}
      <p className="text-xs text-foreground-muted">
        {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
        {busqueda && ` · búsqueda: "${busqueda}"`}
      </p>

      {/* Vacío */}
      {filtrados.length === 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Users className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin clientes</p>
          <p className="text-xs text-foreground-muted mt-1 mb-4">
            {busqueda ? 'No se encontraron resultados' : 'Crea el primer cliente para facturación y ventas'}
          </p>
          {!busqueda && (
            <button
              onClick={abrirNuevo}
              className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Nuevo cliente
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {filtrados.map(cliente => {
          const abierto = expandido === cliente.id
          const etiqueta = ETIQUETAS_TIPO[cliente.tipo_identificacion]

          return (
            <div key={cliente.id} className="rounded-2xl bg-card border border-card-border overflow-hidden">

              {/* Fila principal */}
              <button
                onClick={() => setExpandido(prev => prev === cliente.id ? null : cliente.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-background-subtle/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {cliente.razon_social.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{cliente.razon_social}</p>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', etiqueta.clase)}>
                      {etiqueta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-mono text-foreground-muted">{cliente.identificacion}</span>
                    {cliente.email && (
                      <span className="text-[11px] text-foreground-muted truncate">{cliente.email}</span>
                    )}
                    {cliente.ciudad && (
                      <span className="text-[11px] text-foreground-muted flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{cliente.ciudad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Métricas desktop */}
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs font-bold text-foreground">{cliente.total_pedidos}</p>
                    <p className="text-[10px] text-foreground-muted">pedido{cliente.total_pedidos !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">{formatearPrecio(cliente.total_gastado, simboloMoneda)}</p>
                    <p className="text-[10px] text-foreground-muted">gastado</p>
                  </div>
                </div>

                {/* Métricas móvil */}
                <div className="flex sm:hidden items-center gap-2 flex-shrink-0">
                  {cliente.total_pedidos > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-foreground-muted">
                      <ShoppingBag className="w-3 h-3" />{cliente.total_pedidos}
                    </div>
                  )}
                </div>

                <ChevronDown className={cn(
                  'w-4 h-4 text-foreground-muted flex-shrink-0 transition-transform',
                  abierto && 'rotate-180'
                )} />
              </button>

              {/* Panel expandido */}
              {abierto && (
                <div className="border-t border-border bg-background-subtle/30 p-4 flex flex-col gap-4">

                  {/* Datos de contacto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cliente.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                        <span className="text-xs text-foreground-muted truncate">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                        <span className="text-xs text-foreground-muted">{cliente.telefono}</span>
                      </div>
                    )}
                    {cliente.direccion && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                        <span className="text-xs text-foreground-muted truncate">{cliente.direccion}</span>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  {cliente.notas && (
                    <p className="text-xs text-foreground-muted bg-background-subtle rounded-xl px-3 py-2 italic">
                      {cliente.notas}
                    </p>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 flex-wrap">
                    {cliente.telefono && (
                      <button
                        onClick={() => abrirWhatsApp(cliente.telefono!)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#1a9e4b] text-xs font-semibold hover:bg-[#25D366]/20 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                    )}
                    <button
                      onClick={() => abrirEditar(cliente)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-input-border text-xs text-foreground-muted hover:border-primary/50 hover:text-primary transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => eliminar(cliente.id, cliente.razon_social)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-danger/30 text-xs text-danger hover:bg-danger/5 transition-all ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>

                  {/* Historial de pedidos */}
                  {cliente.pedidos.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Pedidos vinculados ({cliente.pedidos.length})
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {cliente.pedidos.map(p => (
                          <div
                            key={p.numero_orden}
                            className="flex items-center gap-3 bg-card rounded-xl px-3 py-2 border border-border"
                          >
                            <span className="text-xs font-mono font-bold text-foreground">#{p.numero_orden}</span>
                            <span className={cn(
                              'flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              COLORES_ESTADO[p.estado]
                            )}>
                              {ICONOS_ESTADO[p.estado]}{ETIQUETAS_ESTADO[p.estado]}
                            </span>
                            <span className="ml-auto text-xs font-bold text-primary">
                              {formatearPrecio(p.total, simboloMoneda)}
                            </span>
                            <span className="text-[10px] text-foreground-muted flex-shrink-0">
                              {new Date(p.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal formulario */}
      <FormularioCliente
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        cliente={clienteEditar}
        pais={pais}
      />
    </div>
  )
}
