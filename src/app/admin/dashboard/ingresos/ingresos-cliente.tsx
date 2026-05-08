'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DollarSign, ClipboardList, TrendingUp, Search, ArrowRight, Globe, Receipt, Banknote, ArrowLeftRight, CreditCard, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'

const COLORES_ESTADO: Record<string, string> = {
  pendiente_pago: 'bg-gray-100 text-gray-600',
  procesando:     'bg-emerald-50 text-emerald-700',
  en_espera:      'bg-amber-50 text-amber-700',
  completado:     'bg-blue-50 text-blue-700',
  cancelado:      'bg-red-50 text-red-700',
  reembolsado:    'bg-gray-100 text-gray-500',
  fallido:        'bg-red-100 text-red-800',
}
const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  procesando:     'Procesando',
  en_espera:      'En espera',
  completado:     'Completado',
  cancelado:      'Cancelado',
  reembolsado:    'Reembolsado',
  fallido:        'Fallido',
}

interface Pedido {
  id: string
  numero_orden: string
  nombres: string
  total: number
  estado: string
  creado_en: string
  tipo: string
  simbolo_moneda: string
  forma_pago: string | null
  es_venta_manual: boolean | null
}

interface Props {
  pedidos: Pedido[]
  desde: string
  hasta: string
  simboloMoneda: string
}

export function IngresosCliente({ pedidos, desde, hasta, simboloMoneda }: Props) {
  const router = useRouter()
  const [fechaDesde, setFechaDesde] = useState(desde)
  const [fechaHasta, setFechaHasta] = useState(hasta)

  function aplicarFiltro() {
    router.push(`/admin/dashboard/ingresos?desde=${fechaDesde}&hasta=${fechaHasta}`)
  }

  // Métricas generales
  const totalIngresos = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const totalPedidos = pedidos.length
  const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0

  // Desglose por canal
  const porCanal = pedidos.reduce<Record<'online' | 'pos', { monto: number; cant: number }>>(
    (acc, p) => {
      const canal: 'online' | 'pos' = p.es_venta_manual ? 'pos' : 'online'
      acc[canal].monto += Number(p.total ?? 0)
      acc[canal].cant  += 1
      return acc
    },
    { online: { monto: 0, cant: 0 }, pos: { monto: 0, cant: 0 } }
  )

  // Desglose por forma de pago (solo ventas manuales/POS con forma_pago definida)
  const ETIQUETAS_PAGO: Record<string, string> = {
    efectivo:     'Efectivo',
    transferencia:'Transferencia',
    tarjeta:      'Tarjeta',
    otro:         'Otro',
  }
  const porPago = pedidos.reduce<Record<string, { monto: number; cant: number }>>((acc, p) => {
    const key = p.forma_pago ?? 'sin_dato'
    if (!acc[key]) acc[key] = { monto: 0, cant: 0 }
    acc[key].monto += Number(p.total ?? 0)
    acc[key].cant  += 1
    return acc
  }, {})

  const hayFormasPago = pedidos.some(p => p.forma_pago)

  // Agrupar por día para el gráfico
  const porDia: Record<string, number> = {}
  pedidos.forEach(p => {
    const dia = p.creado_en.slice(0, 10)
    porDia[dia] = (porDia[dia] || 0) + Number(p.total ?? 0)
  })

  // Generar todos los días del rango
  const diasRango: string[] = []
  const start = new Date(desde + 'T00:00:00')
  const end = new Date(hasta + 'T00:00:00')
  const diffDias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  // Solo mostrar gráfico si el rango es <= 31 días
  const mostrarGrafico = diffDias <= 31
  if (mostrarGrafico) {
    for (let i = 0; i < diffDias; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      diasRango.push(d.toISOString().slice(0, 10))
    }
  }

  const maxDia = Math.max(...diasRango.map(d => porDia[d] ?? 0), 1)

  return (
    <div className="flex flex-col gap-5">

      {/* Filtro de fechas */}
      <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-foreground-muted">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-foreground-muted">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={aplicarFiltro}
          className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all flex-shrink-0"
        >
          <Search className="w-4 h-4" />
          Filtrar
        </button>

        {/* Accesos rápidos */}
        <div className="w-full flex gap-2 flex-wrap">
          {[
            { label: 'Hoy',       fn: () => { const h = new Date().toISOString().slice(0,10); setFechaDesde(h); setFechaHasta(h) } },
            { label: 'Esta semana', fn: () => {
                const now = new Date()
                const lun = new Date(now); lun.setDate(now.getDate() - now.getDay() + 1)
                setFechaDesde(lun.toISOString().slice(0,10)); setFechaHasta(now.toISOString().slice(0,10))
            }},
            { label: 'Este mes',  fn: () => {
                const now = new Date()
                setFechaDesde(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10))
                setFechaHasta(new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10))
            }},
            { label: 'Mes pasado', fn: () => {
                const now = new Date()
                const ini = new Date(now.getFullYear(), now.getMonth()-1, 1)
                const fin = new Date(now.getFullYear(), now.getMonth(), 0)
                setFechaDesde(ini.toISOString().slice(0,10)); setFechaHasta(fin.toISOString().slice(0,10))
            }},
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={() => { fn(); setTimeout(aplicarFiltro, 0) }}
              className="text-xs px-3 py-1 rounded-lg border border-border text-foreground-muted hover:border-primary hover:text-primary transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <p className="text-xl font-bold text-foreground leading-tight">{formatearPrecio(totalIngresos, simboloMoneda)}</p>
          <p className="text-[11px] text-foreground-muted">Total ingresos</p>
        </div>

        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ClipboardList className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalPedidos}</p>
          <p className="text-[11px] text-foreground-muted">Pedidos confirmados</p>
        </div>

        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-xl font-bold text-foreground leading-tight">{formatearPrecio(ticketPromedio, simboloMoneda)}</p>
          <p className="text-[11px] text-foreground-muted">Ticket promedio</p>
        </div>
      </div>

      {/* Desglose por canal */}
      {totalPedidos > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">Canal de venta</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background-subtle border border-border">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Tienda online</p>
                <p className="text-[11px] text-foreground-muted">{porCanal.online.cant} pedido{porCanal.online.cant !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-foreground">{formatearPrecio(porCanal.online.monto, simboloMoneda)}</p>
                {totalIngresos > 0 && (
                  <p className="text-[10px] text-foreground-muted">{Math.round(porCanal.online.monto / totalIngresos * 100)}%</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background-subtle border border-border">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Venta manual (POS)</p>
                <p className="text-[11px] text-foreground-muted">{porCanal.pos.cant} pedido{porCanal.pos.cant !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-foreground">{formatearPrecio(porCanal.pos.monto, simboloMoneda)}</p>
                {totalIngresos > 0 && (
                  <p className="text-[10px] text-foreground-muted">{Math.round(porCanal.pos.monto / totalIngresos * 100)}%</p>
                )}
              </div>
            </div>
          </div>
          {/* Barra proporcional */}
          {totalIngresos > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              <div className="bg-blue-500 rounded-l-full transition-all" style={{ width: `${porCanal.online.monto / totalIngresos * 100}%` }} />
              <div className="bg-orange-400 flex-1 rounded-r-full transition-all" />
            </div>
          )}
        </div>
      )}

      {/* Desglose por forma de pago */}
      {hayFormasPago && (
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">Forma de pago</p>
          <div className="flex flex-col gap-2">
            {(['efectivo', 'transferencia', 'tarjeta', 'otro', 'sin_dato'] as const)
              .filter(k => porPago[k]?.cant > 0)
              .map(key => {
                const item = porPago[key]
                const pct = totalIngresos > 0 ? item.monto / totalIngresos * 100 : 0
                const iconos: Record<string, React.ReactNode> = {
                  efectivo:     <Banknote className="w-3.5 h-3.5 text-success" />,
                  transferencia:<ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />,
                  tarjeta:      <CreditCard className="w-3.5 h-3.5 text-violet-500" />,
                  otro:         <MoreHorizontal className="w-3.5 h-3.5 text-foreground-muted" />,
                  sin_dato:     <Globe className="w-3.5 h-3.5 text-blue-400" />,
                }
                const label = key === 'sin_dato' ? 'Online (sin forma de pago)' : (ETIQUETAS_PAGO[key] ?? key)
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-background-subtle flex items-center justify-center flex-shrink-0">
                      {iconos[key]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground-muted">{item.cant} pedido{item.cant !== 1 ? 's' : ''}</span>
                          <span className="text-xs font-semibold text-foreground">{formatearPrecio(item.monto, simboloMoneda)}</span>
                          <span className="text-[10px] text-foreground-muted w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', {
                            'bg-success':     key === 'efectivo',
                            'bg-blue-500':    key === 'transferencia' || key === 'sin_dato',
                            'bg-violet-500':  key === 'tarjeta',
                            'bg-foreground-muted': key === 'otro',
                          })}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Gráfico diario (solo si <= 31 días) */}
      {mostrarGrafico && diasRango.length > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <p className="text-sm font-semibold text-foreground mb-4">Ingresos por día</p>
          <div className="flex items-end gap-1 h-32 overflow-x-auto">
            {diasRango.map(dia => {
              const valor = porDia[dia] ?? 0
              const pct = (valor / maxDia) * 100
              const label = new Date(dia + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
              return (
                <div key={dia} className="flex-1 min-w-[24px] max-w-[40px] flex flex-col items-center gap-1 h-full justify-end group relative">
                  {valor > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {formatearPrecio(valor, simboloMoneda)}
                    </div>
                  )}
                  <div className="w-full rounded-t-md bg-primary/10 flex items-end overflow-hidden" style={{ height: '96px' }}>
                    <div
                      className="w-full rounded-t-md bg-primary transition-all duration-300"
                      style={{ height: `${pct}%`, minHeight: valor > 0 ? '3px' : '0' }}
                    />
                  </div>
                  <span className="text-[9px] text-foreground-muted text-center leading-tight rotate-0 hidden sm:block">{label.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla de pedidos */}
      {pedidos.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-8 text-center text-foreground-muted text-sm">
          No hay ingresos en el período seleccionado
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Detalle de pedidos</p>
            <Link
              href="/admin/dashboard/pedidos"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ir a pedidos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {pedidos.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground font-mono">#{p.numero_orden}</span>
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      COLORES_ESTADO[p.estado] ?? 'bg-card text-foreground-muted'
                    )}>
                      {ETIQUETAS_ESTADO[p.estado] ?? p.estado}
                    </span>
                    {p.es_venta_manual && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 flex items-center gap-0.5">
                        <Receipt className="w-2.5 h-2.5" />POS
                      </span>
                    )}
                    {p.forma_pago && (
                      <span className="text-[10px] text-foreground-muted px-1.5 py-0.5 rounded-full bg-background-subtle capitalize">
                        {ETIQUETAS_PAGO[p.forma_pago] ?? p.forma_pago}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5 truncate">{p.nombres}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatearPrecio(Number(p.total), simboloMoneda)}</p>
                  <p className="text-[10px] text-foreground-muted">
                    {new Date(p.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Totalizador al pie */}
          <div className="px-4 py-3 border-t border-border bg-background-subtle flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{totalPedidos} pedido{totalPedidos !== 1 ? 's' : ''}</p>
            <p className="text-sm font-bold text-success">{formatearPrecio(totalIngresos, simboloMoneda)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
