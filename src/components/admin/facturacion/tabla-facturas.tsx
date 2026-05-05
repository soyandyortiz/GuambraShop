'use client'

import { useState } from 'react'
import { FileText, Download, RefreshCw, XCircle, ChevronDown, Search } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Factura, EstadoFactura } from '@/types'

interface Props {
  facturas: Factura[]
  configActiva: boolean
}

const COLORES_ESTADO: Record<EstadoFactura, string> = {
  borrador:   'bg-gray-100 text-gray-700',
  enviada:    'bg-blue-100 text-blue-700',
  autorizada: 'bg-green-100 text-green-700',
  rechazada:  'bg-red-100 text-red-700',
  anulada:    'bg-gray-100 text-gray-500 line-through',
}

const LABELS_ESTADO: Record<EstadoFactura, string> = {
  borrador:   'Borrador',
  enviada:    'Enviada',
  autorizada: 'Autorizada',
  rechazada:  'Rechazada',
  anulada:    'Anulada',
}

export function TablaFacturas({ facturas, configActiva }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | 'todos'>('todos')

  const filtradas = facturas.filter(f => {
    const matchEstado = filtroEstado === 'todos' || f.estado === filtroEstado
    const matchBusqueda = !busqueda ||
      f.numero_factura?.includes(busqueda) ||
      f.datos_comprador?.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.datos_comprador?.identificacion?.includes(busqueda)
    return matchEstado && matchBusqueda
  })

  if (!configActiva) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <FileText className="w-12 h-12 text-foreground-muted/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground-muted">Configura primero los datos SRI</p>
        <p className="text-xs text-foreground-muted/70 mt-1">Una vez configurado, podrás emitir facturas electrónicas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted/50" />
          <input
            type="text"
            placeholder="Buscar por N° factura, RUC o nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="relative">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoFactura | 'todos')}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(LABELS_ESTADO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <FileText className="w-10 h-10 text-foreground-muted/30 mx-auto mb-3" />
          <p className="text-sm text-foreground-muted">
            {facturas.length === 0 ? 'Aún no hay facturas emitidas' : 'Sin resultados para tu búsqueda'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-subtle">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted">N° Factura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted">Comprador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted">Fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-muted">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-muted">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((factura, i) => (
                  <FilaFactura key={factura.id} factura={factura} esUltima={i === filtradas.length - 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen */}
      {facturas.length > 0 && (
        <p className="text-xs text-foreground-muted text-right">
          {filtradas.length} de {facturas.length} facturas
        </p>
      )}
    </div>
  )
}

function FilaFactura({ factura, esUltima }: { factura: Factura; esUltima: boolean }) {
  const totalStr = factura.totales?.total != null
    ? formatearPrecio(factura.totales.total)
    : '—'

  const fechaStr = factura.fecha_emision
    ? new Date(factura.fecha_emision + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <tr className={cn('hover:bg-background-subtle/50 transition-colors', !esUltima && 'border-b border-border')}>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-foreground">{factura.numero_factura ?? `#${factura.numero_secuencial}`}</span>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground truncate max-w-[180px]">{factura.datos_comprador?.razon_social ?? 'Consumidor Final'}</p>
        <p className="text-xs text-foreground-muted">{factura.datos_comprador?.identificacion ?? '—'}</p>
      </td>
      <td className="px-4 py-3 text-foreground-muted">{fechaStr}</td>
      <td className="px-4 py-3 text-right font-semibold text-foreground">{totalStr}</td>
      <td className="px-4 py-3 text-center">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', COLORES_ESTADO[factura.estado])}>
          {LABELS_ESTADO[factura.estado]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {factura.ride_url && (
            <a
              href={factura.ride_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Descargar RIDE"
              className="p-1.5 rounded-lg hover:bg-primary/10 text-foreground-muted hover:text-primary transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          {factura.estado === 'rechazada' && (
            <button
              title="Reintentar envío"
              className="p-1.5 rounded-lg hover:bg-amber-100 text-foreground-muted hover:text-amber-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {factura.estado === 'autorizada' && (
            <button
              title="Anular factura"
              className="p-1.5 rounded-lg hover:bg-red-100 text-foreground-muted hover:text-red-600 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
