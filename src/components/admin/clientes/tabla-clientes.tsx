'use client'

import { useState, useMemo } from 'react'
import {
  Search, ChevronDown, ChevronUp, MessageCircle,
  Users, ShoppingBag, MapPin, Mail, Phone, ArrowUpDown,
  Package, Clock, CheckCircle2, RotateCcw, Send, XCircle
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import type { EstadoPedido } from '@/types'

export interface PedidoResumen {
  numero_orden: string
  total: number
  estado: EstadoPedido
  creado_en: string
  tipo: string
}

export interface ClienteAgregado {
  nombre: string
  email: string
  whatsapp: string
  ciudad: string | null
  provincia: string | null
  total_pedidos: number
  total_gastado: number
  ultimo_pedido: string
  pedidos: PedidoResumen[]
}

interface Props {
  clientes: ClienteAgregado[]
  simboloMoneda: string
}

type OrdenSort = 'reciente' | 'pedidos' | 'gastado' | 'nombre'

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

export function TablaClientes({ clientes, simboloMoneda }: Props) {
  const [busqueda, setBusqueda]     = useState('')
  const [orden, setOrden]           = useState<OrdenSort>('reciente')
  const [expandido, setExpandido]   = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    let result = clientes.filter(c => {
      if (!texto) return true
      return (
        c.nombre.toLowerCase().includes(texto) ||
        c.email.toLowerCase().includes(texto) ||
        c.whatsapp.includes(texto) ||
        (c.ciudad ?? '').toLowerCase().includes(texto)
      )
    })

    result = [...result].sort((a, b) => {
      switch (orden) {
        case 'reciente': return new Date(b.ultimo_pedido).getTime() - new Date(a.ultimo_pedido).getTime()
        case 'pedidos':  return b.total_pedidos - a.total_pedidos
        case 'gastado':  return b.total_gastado - a.total_gastado
        case 'nombre':   return a.nombre.localeCompare(b.nombre)
      }
    })

    return result
  }, [clientes, busqueda, orden])

  function toggleExpandir(email: string) {
    setExpandido(prev => prev === email ? null : email)
  }

  function abrirWhatsApp(whatsapp: string) {
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Barra superior */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, whatsapp o ciudad…"
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
      </div>

      {/* Contador */}
      <p className="text-xs text-foreground-muted">
        {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
        {busqueda && ` · búsqueda: "${busqueda}"`}
      </p>

      {/* Lista vacía */}
      {filtrados.length === 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Users className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin clientes</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda ? 'No se encontraron resultados' : 'Aparecerán aquí al recibir el primer pedido'}
          </p>
        </div>
      )}

      {/* Tarjetas de clientes */}
      <div className="flex flex-col gap-2">
        {filtrados.map(cliente => {
          const abierto = expandido === cliente.email
          return (
            <div key={cliente.email} className="rounded-2xl bg-card border border-card-border overflow-hidden">

              {/* Fila principal */}
              <button
                onClick={() => toggleExpandir(cliente.email)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-background-subtle/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{cliente.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-foreground-muted truncate">{cliente.email}</span>
                    {cliente.ciudad && (
                      <span className="text-[11px] text-foreground-muted flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {cliente.ciudad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Métricas */}
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs font-bold text-foreground">{cliente.total_pedidos}</p>
                    <p className="text-[10px] text-foreground-muted">pedido{cliente.total_pedidos !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">{formatearPrecio(cliente.total_gastado, simboloMoneda)}</p>
                    <p className="text-[10px] text-foreground-muted">gastado</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">
                      {new Date(cliente.ultimo_pedido).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-foreground-muted">último</p>
                  </div>
                </div>

                {/* Métricas móvil */}
                <div className="flex sm:hidden items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-foreground-muted">
                    <ShoppingBag className="w-3 h-3" />
                    {cliente.total_pedidos}
                  </div>
                  <span className="text-xs font-bold text-primary">{formatearPrecio(cliente.total_gastado, simboloMoneda)}</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-foreground-muted">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                      <span className="truncate text-xs">{cliente.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground-muted">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                      <span className="text-xs">{cliente.whatsapp}</span>
                    </div>
                    {(cliente.ciudad || cliente.provincia) && (
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                        <span className="text-xs">{[cliente.ciudad, cliente.provincia].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Botón WhatsApp */}
                  <button
                    onClick={() => abrirWhatsApp(cliente.whatsapp)}
                    className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#1a9e4b] text-xs font-semibold hover:bg-[#25D366]/20 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Contactar por WhatsApp
                  </button>

                  {/* Historial de pedidos */}
                  <div>
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Pedidos ({cliente.pedidos.length})
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
                            {ICONOS_ESTADO[p.estado]}
                            {ETIQUETAS_ESTADO[p.estado]}
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

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
