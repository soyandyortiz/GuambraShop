'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronDown, Users, ShoppingBag, MapPin, Mail, Phone,
  MessageCircle, ArrowUpDown, Package, Clock, CheckCircle2,
  RotateCcw, Send, XCircle, Pencil, Trash2, UserPlus, FileText,
  Receipt, CreditCard, Globe, Eye, ExternalLink,
  ShieldCheck, UserCheck, TrendingUp, Calendar
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
  ruc:              { label: 'RUC',     clase: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  cedula:           { label: 'Cédula',  clase: 'bg-purple-50 text-purple-700 border-purple-100' },
  pasaporte:        { label: 'Pasap.',  clase: 'bg-amber-50 text-amber-700 border-amber-100' },
  consumidor_final: { label: 'Consumidor',  clase: 'bg-gray-50 text-gray-600 border-gray-100' },
}

const COLORES_ESTADO: Record<EstadoPedido, string> = {
  pendiente_pago:       'bg-gray-100 text-gray-600',
  pendiente_validacion: 'bg-amber-50 text-amber-700',
  procesando:           'bg-emerald-50 text-emerald-700',
  en_espera:            'bg-amber-50 text-amber-700',
  completado:           'bg-blue-50 text-blue-700',
  cancelado:            'bg-red-50 text-red-700',
  reembolsado:          'bg-gray-100 text-gray-500',
  fallido:              'bg-red-100 text-red-800',
}

const ICONOS_ESTADO: Record<EstadoPedido, React.ReactNode> = {
  pendiente_pago:       <Clock className="w-2.5 h-2.5" />,
  pendiente_validacion: <Clock className="w-2.5 h-2.5" />,
  procesando:           <RotateCcw className="w-2.5 h-2.5" />,
  en_espera:            <RotateCcw className="w-2.5 h-2.5" />,
  completado:           <CheckCircle2 className="w-2.5 h-2.5" />,
  cancelado:            <XCircle className="w-2.5 h-2.5" />,
  reembolsado:          <RotateCcw className="w-2.5 h-2.5" />,
  fallido:              <XCircle className="w-2.5 h-2.5" />,
}

const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  pendiente_pago:       'Pendiente',
  pendiente_validacion: 'Validando',
  procesando:           'Procesando',
  en_espera:            'Espera',
  completado:           'Completado',
  cancelado:            'Cancelado',
  reembolsado:          'Reembolsado',
  fallido:              'Fallido',
}

export function TablaClientes({ clientes, simboloMoneda, pais = 'EC' }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busqueda, setBusqueda]           = useState('')
  const [orden, setOrden]                 = useState<OrdenSort>('reciente')
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [clienteEditar, setClienteEditar] = useState<Cliente | undefined>()
  const [detallesId, setDetallesId]       = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    const result = clientes.filter(c => {
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

  function abrirNuevo() {
    setClienteEditar(undefined)
    setModalAbierto(true)
  }

  function abrirEditar(cliente: Cliente) {
    setClienteEditar(cliente)
    setModalAbierto(true)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar definitivamente el cliente "${nombre}"?`)) return
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast.error('No se pudo eliminar'); return }
    toast.success('Cliente eliminado')
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ══ BARRA DE HERRAMIENTAS ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, identificación, email o ciudad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative w-44 hidden md:block">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
            <select
              value={orden}
              onChange={e => setOrden(e.target.value as OrdenSort)}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-input-border bg-background-subtle text-xs font-bold focus:outline-none appearance-none cursor-pointer"
            >
              <option value="reciente">Recientes</option>
              <option value="pedidos">Más Pedidos</option>
              <option value="gastado">Más Gasto</option>
              <option value="nombre">Nombre A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={abrirNuevo}
            className="h-10 px-6 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* ══ TABLA DE CLIENTES ══ */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Cliente / Identificación</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4 text-center">Actividad</th>
                <th className="px-6 py-4 text-right">Total Gastado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Users className="w-12 h-12" />
                      <p className="text-sm font-bold">No se encontraron clientes</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map(cliente => {
                  const etiqueta = ETIQUETAS_TIPO[cliente.tipo_identificacion]
                  const esVIP = cliente.total_gastado > 500 || cliente.total_pedidos > 5

                  return (
                    <tr key={cliente.id} className="group transition-colors hover:bg-background-subtle/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2",
                            esVIP ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                          )}>
                            {esVIP ? <ShieldCheck className="w-5 h-5" /> : cliente.razon_social.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{cliente.razon_social}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-md border', etiqueta.clase)}>
                                {etiqueta.label}
                              </span>
                              <span className="text-[10px] font-mono text-foreground-muted">{cliente.identificacion}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {cliente.email && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                              <Mail className="w-3 h-3" /> {cliente.email}
                            </div>
                          )}
                          {cliente.telefono && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <Phone className="w-3 h-3 text-emerald-500" /> {cliente.telefono}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                          <MapPin className="w-3.5 h-3.5 opacity-50" />
                          <span>{cliente.ciudad ?? 'N/A'}{cliente.provincia ? `, ${cliente.provincia}` : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black text-foreground">{cliente.total_pedidos}</span>
                          <span className="text-[9px] font-bold text-foreground-muted uppercase tracking-tighter">Pedidos</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-primary">{formatearPrecio(cliente.total_gastado, simboloMoneda)}</p>
                        {cliente.ultimo_pedido_en && (
                          <p className="text-[9px] text-foreground-muted mt-0.5 uppercase">
                            Último: {new Date(cliente.ultimo_pedido_en).toLocaleDateString('es-EC')}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDetallesId(cliente.id)}
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => abrirEditar(cliente)}
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-foreground/40 transition-all shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => eliminar(cliente.id, cliente.razon_social)}
                            className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ══ MODAL DE DETALLES DEL CLIENTE ══ */}
      {detallesId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {clientes.filter(c => c.id === detallesId).map(cliente => (
              <div key={cliente.id} className="flex flex-col">
                <div className="px-6 py-5 border-b border-border bg-background-subtle/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">
                      {cliente.razon_social.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{cliente.razon_social}</h3>
                      <p className="text-xs text-foreground-muted uppercase tracking-widest font-bold">
                        {cliente.tipo_identificacion}: {cliente.identificacion}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDetallesId(null)}
                    className="p-2 hover:bg-background rounded-xl transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-foreground-muted" />
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
                  {/* Info Personal */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Correo Electrónico</p>
                        <p className="text-sm font-semibold">{cliente.email ?? 'No registrado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Teléfono / WhatsApp</p>
                        <p className="text-sm font-semibold">{cliente.telefono ?? 'No registrado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-foreground-muted uppercase">Dirección</p>
                        <p className="text-sm font-semibold leading-tight">
                          {cliente.direccion ?? 'Sin dirección'}, {cliente.ciudad ?? ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="bg-background-subtle/50 rounded-2xl p-5 border border-border flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-foreground-muted uppercase tracking-wider">Total Compras</p>
                        <p className="text-2xl font-black text-primary">{formatearPrecio(cliente.total_gastado, simboloMoneda)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-foreground-muted uppercase tracking-wider">Nº Pedidos</p>
                        <p className="text-2xl font-black text-foreground">{cliente.total_pedidos}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground-muted">CLIENTE DESDE:</span>
                      <span className="text-xs font-bold">{new Date(cliente.creado_en).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Últimos Pedidos */}
                  <div className="md:col-span-2 space-y-3">
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5" /> Historial Reciente
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cliente.pedidos.slice(0, 4).map(p => (
                        <div key={p.numero_orden} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-black">ORDEN #{p.numero_orden}</span>
                            <span className="text-[10px] text-foreground-muted">{new Date(p.creado_en).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-primary block">{formatearPrecio(p.total, simboloMoneda)}</span>
                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border", COLORES_ESTADO[p.estado])}>
                              {ETIQUETAS_ESTADO[p.estado]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 bg-background-subtle/50 border-t border-border flex gap-3">
                  {cliente.telefono && (
                    <button
                      onClick={() => window.open(`https://wa.me/${cliente.telefono?.replace(/\D/g, '')}`, '_blank')}
                      className="flex-1 h-11 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#22c55e] transition-all shadow-md shadow-[#25D366]/20"
                    >
                      <MessageCircle className="w-5 h-5" /> Contactar WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => { setDetallesId(null); abrirEditar(cliente); }}
                    className="h-11 px-6 rounded-xl border border-input-border bg-card text-sm font-bold text-foreground hover:bg-background transition-all"
                  >
                    Editar Perfil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
