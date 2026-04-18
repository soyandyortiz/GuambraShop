'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DollarSign, ClipboardList, TrendingUp, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'

const COLORES_ESTADO: Record<string, string> = {
  confirmado:  'bg-blue-500/10 text-blue-600',
  en_proceso:  'bg-violet-500/10 text-violet-600',
  enviado:     'bg-primary/10 text-primary',
  entregado:   'bg-success/10 text-success',
}
const ETIQUETAS_ESTADO: Record<string, string> = {
  confirmado:  'Confirmado',
  en_proceso:  'En proceso',
  enviado:     'Enviado',
  entregado:   'Entregado',
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

  // Métricas
  const totalIngresos = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const totalPedidos = pedidos.length
  const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0

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
