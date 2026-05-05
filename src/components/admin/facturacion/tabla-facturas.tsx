'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Download, XCircle, ChevronDown, Search,
  Send, Loader2, AlertTriangle, ExternalLink, X, BadgeCheck,
} from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Factura, EstadoFactura } from '@/types'

interface Props {
  facturas: Factura[]
  configActiva: boolean
}

const COLORES_ESTADO: Record<EstadoFactura, string> = {
  borrador:   'bg-gray-100 text-gray-600 border-gray-200',
  enviada:    'bg-amber-50 text-amber-700 border-amber-200',
  autorizada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rechazada:  'bg-red-50 text-red-700 border-red-200',
  anulada:    'bg-gray-100 text-gray-400 border-gray-200',
}

const LABELS_ESTADO: Record<EstadoFactura, string> = {
  borrador:   'Borrador',
  enviada:    'Pendiente SRI',
  autorizada: 'Autorizada',
  rechazada:  'Rechazada',
  anulada:    'Anulada',
}

const PORTAL_SRI = {
  pruebas:    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/',
  produccion: 'https://www.sri.gob.ec/web/guest/facturacion-electronica',
}

// ─── Modal de confirmación de anulación ──────────────────────────────────────
function ModalAnulacion({
  factura,
  onConfirmar,
  onCerrar,
  cargando,
}: {
  factura: Factura
  onConfirmar: (motivo: string) => void
  onCerrar: () => void
  cargando: boolean
}) {
  const [motivo, setMotivo] = useState('')
  const eraAutorizada = factura.estado === 'autorizada'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Anular factura</p>
              <p className="text-[11px] text-foreground-muted">{factura.numero_factura ?? `#${factura.numero_secuencial}`}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-background-subtle text-foreground-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Aviso si estaba autorizada */}
          {eraAutorizada && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Esta factura está autorizada por el SRI</p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Anularla en este sistema es solo un registro interno. Para que sea válido tributariamente,
                  debes completar la anulación en el portal oficial del SRI con tu clave de acceso o la de tu contador.
                </p>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Motivo de anulación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Error en datos del comprador, devolución del producto, factura duplicada…"
              rows={3}
              className="w-full rounded-xl border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Info número autorización */}
          {factura.numero_autorizacion && (
            <div className="rounded-xl bg-background-subtle border border-border px-3 py-2">
              <p className="text-[10px] text-foreground-muted font-medium mb-0.5">N° Autorización (para el portal SRI)</p>
              <p className="text-[11px] font-mono text-foreground break-all">{factura.numero_autorizacion}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={() => onConfirmar(motivo)}
            disabled={!motivo.trim() || cargando}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {cargando ? 'Anulando…' : 'Confirmar anulación'}
          </button>
          <button onClick={onCerrar}
            className="w-full h-9 rounded-xl border border-border text-sm text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Banner post-anulación (instrucciones SRI) ────────────────────────────────
function BannerAnulacionSRI({ factura, ambiente, onCerrar }: { factura: Factura; ambiente: string; onCerrar: () => void }) {
  const url = PORTAL_SRI[ambiente as keyof typeof PORTAL_SRI] ?? PORTAL_SRI.produccion
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Anulación registrada — acción requerida en el SRI</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              La factura <span className="font-semibold">{factura.numero_factura}</span> fue marcada como anulada en tu sistema.
              Para que tenga validez tributaria debes ingresar al portal del SRI y anularla con el número de autorización.
            </p>
            {factura.numero_autorizacion && (
              <p className="mt-2 text-[11px] font-mono bg-amber-100 rounded-lg px-2 py-1.5 text-amber-900 break-all">
                {factura.numero_autorizacion}
              </p>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
              Ir al portal del SRI <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <button onClick={onCerrar} className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function TablaFacturas({ facturas: facturasInic, configActiva }: Props) {
  const router = useRouter()
  const [facturas, setFacturas] = useState<Factura[]>(facturasInic)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | 'todos'>('todos')
  const [enviando, setEnviando] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [modalAnular, setModalAnular] = useState<Factura | null>(null)
  // facturaId → { ambiente } para mostrar el banner post-anulación
  const [bannerAnulacion, setBannerAnulacion] = useState<{ factura: Factura; ambiente: string } | null>(null)

  async function emitir(facturaId: string) {
    setEnviando(facturaId)
    try {
      const res = await fetch('/api/facturacion/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaId }),
      })
      const data = await res.json()
      if (data.ok && data.estado === 'autorizada') {
        toast.success(`Factura autorizada por el SRI · N° ${data.numeroAutorizacion?.slice(0, 10)}…`)
      } else if (data.ok) {
        toast.info('Factura enviada al SRI, pendiente de autorización')
      } else {
        const primer = data.mensajes?.[0]
        toast.error(`SRI rechazó: ${primer?.mensaje ?? data.error ?? 'Error desconocido'}`)
      }
      router.refresh()
    } catch {
      toast.error('Error de conexión al enviar al SRI')
    } finally {
      setEnviando(null)
    }
  }

  async function confirmarAnulacion(motivo: string) {
    if (!modalAnular) return
    const facturaId = modalAnular.id
    const facturaParaBanner = { ...modalAnular }
    setAnulando(facturaId)
    try {
      const res = await fetch('/api/facturacion/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaId, motivo }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo anular la factura')
        return
      }
      // Actualizar estado local sin recargar
      setFacturas(prev => prev.map(f => f.id === facturaId
        ? { ...f, estado: 'anulada' as EstadoFactura, motivo_anulacion: motivo }
        : f
      ))
      setModalAnular(null)
      toast.success('Factura anulada en el sistema')

      // Mostrar banner solo si estaba autorizada (necesita acción en SRI)
      if (data.eraAutorizada) {
        setBannerAnulacion({ factura: facturaParaBanner, ambiente: 'produccion' })
      }
    } catch {
      toast.error('Error de conexión al anular')
    } finally {
      setAnulando(null)
    }
  }

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

  // Stats rápidas
  const countAutorizadas = facturas.filter(f => f.estado === 'autorizada').length
  const countPendientes  = facturas.filter(f => f.estado === 'enviada').length
  const countRechazadas  = facturas.filter(f => f.estado === 'rechazada').length

  return (
    <>
      {/* Modal anulación */}
      {modalAnular && (
        <ModalAnulacion
          factura={modalAnular}
          onConfirmar={confirmarAnulacion}
          onCerrar={() => setModalAnular(null)}
          cargando={anulando === modalAnular.id}
        />
      )}

      <div className="space-y-4">
        {/* Banner post-anulación */}
        {bannerAnulacion && (
          <BannerAnulacionSRI
            factura={bannerAnulacion.factura}
            ambiente={bannerAnulacion.ambiente}
            onCerrar={() => setBannerAnulacion(null)}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Autorizadas', val: countAutorizadas, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Pendientes',  val: countPendientes,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
            { label: 'Rechazadas',  val: countRechazadas,  color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl border px-3 py-2.5 text-center', s.bg)}>
              <p className={cn('text-xl font-bold', s.color)}>{s.val}</p>
              <p className="text-[10px] text-foreground-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted/50" />
            <input
              type="text"
              placeholder="Buscar por N° factura, RUC o nombre…"
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
                    <FilaFactura
                      key={factura.id}
                      factura={factura}
                      esUltima={i === filtradas.length - 1}
                      onEmitir={emitir}
                      onAnular={() => setModalAnular(factura)}
                      cargando={enviando === factura.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {facturas.length > 0 && (
          <p className="text-xs text-foreground-muted text-right">
            {filtradas.length} de {facturas.length} facturas
          </p>
        )}
      </div>
    </>
  )
}

// ─── Fila individual ──────────────────────────────────────────────────────────
function FilaFactura({
  factura, esUltima, onEmitir, onAnular, cargando,
}: {
  factura: Factura
  esUltima: boolean
  onEmitir: (id: string) => Promise<void>
  onAnular: () => void
  cargando?: boolean
}) {
  const [mostrarDetalle, setMostrarDetalle] = useState(false)
  const anulada = factura.estado === 'anulada'

  const totalStr = factura.totales?.total != null ? formatearPrecio(factura.totales.total) : '—'
  const fechaStr = factura.fecha_emision
    ? new Date(factura.fecha_emision + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <>
      <tr className={cn(
        'hover:bg-background-subtle/50 transition-colors',
        !esUltima && !mostrarDetalle && 'border-b border-border',
        anulada && 'opacity-60',
      )}>
        <td className="px-4 py-3">
          <span className={cn('font-mono text-xs text-foreground', anulada && 'line-through text-foreground-muted')}>
            {factura.numero_factura ?? `#${factura.numero_secuencial}`}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground truncate max-w-[180px]">
            {factura.datos_comprador?.razon_social ?? 'Consumidor Final'}
          </p>
          <p className="text-xs text-foreground-muted">{factura.datos_comprador?.identificacion ?? '—'}</p>
        </td>
        <td className="px-4 py-3 text-foreground-muted text-xs">{fechaStr}</td>
        <td className="px-4 py-3 text-right font-semibold text-foreground text-xs">{totalStr}</td>
        <td className="px-4 py-3 text-center">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
            COLORES_ESTADO[factura.estado],
          )}>
            {factura.estado === 'autorizada' && <BadgeCheck className="w-2.5 h-2.5" />}
            {LABELS_ESTADO[factura.estado]}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            {/* Enviar al SRI */}
            {(factura.estado === 'borrador' || factura.estado === 'rechazada') && (
              <button onClick={() => onEmitir(factura.id)} disabled={cargando}
                title="Enviar al SRI"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50">
                {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {cargando ? 'Enviando…' : 'Enviar SRI'}
              </button>
            )}

            {/* RIDE PDF */}
            {!anulada && (factura.estado === 'autorizada' || factura.xml_firmado) && (
              <a href={`/api/facturacion/ride?id=${factura.id}`} target="_blank" rel="noopener noreferrer"
                title="Descargar RIDE (PDF)"
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-background-subtle text-foreground-muted hover:text-foreground text-xs font-medium transition-colors">
                <FileText className="w-3 h-3" /> RIDE
              </a>
            )}

            {/* XML firmado */}
            {!anulada && factura.xml_firmado && factura.estado !== 'borrador' && (
              <a href={`/api/facturacion/xml?id=${factura.id}`} download
                title="Descargar XML firmado"
                className="p-1.5 rounded-lg hover:bg-background-subtle text-foreground-muted hover:text-foreground transition-colors">
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Anular — disponible si no está ya anulada */}
            {!anulada && (
              <button onClick={onAnular}
                title="Anular factura"
                className="p-1.5 rounded-lg hover:bg-red-50 text-foreground-muted hover:text-red-600 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Ver detalle (error / motivo anulación) */}
            {(factura.error_sri || factura.motivo_anulacion || factura.numero_autorizacion) && (
              <button onClick={() => setMostrarDetalle(v => !v)}
                title="Ver detalle"
                className={cn('p-1.5 rounded-lg transition-colors',
                  mostrarDetalle
                    ? 'bg-background-subtle text-foreground'
                    : 'hover:bg-background-subtle text-foreground-muted hover:text-foreground'
                )}>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', mostrarDetalle && 'rotate-180')} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Fila de detalle expandible */}
      {mostrarDetalle && (
        <tr className={cn('bg-background-subtle/60', !esUltima && 'border-b border-border')}>
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-col gap-2">
              {factura.numero_autorizacion && (
                <div>
                  <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide mb-0.5">N° Autorización SRI</p>
                  <p className="text-xs font-mono text-foreground break-all">{factura.numero_autorizacion}</p>
                </div>
              )}
              {factura.error_sri && (
                <div>
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-0.5">Error SRI</p>
                  <p className="text-xs text-red-700 font-mono">{factura.error_sri}</p>
                </div>
              )}
              {factura.motivo_anulacion && (
                <div>
                  <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide mb-0.5">Motivo anulación</p>
                  <p className="text-xs text-foreground">{factura.motivo_anulacion}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
