'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Download, XCircle, ChevronDown, Search,
  Send, Loader2, AlertTriangle, ExternalLink, X, BadgeCheck, Mail,
  RefreshCw, ReceiptText, Clock,
} from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { traducirMensajesSRI } from '@/lib/sri/errores-sri'
import type { Factura, EstadoFactura } from '@/types'

interface Props {
  facturas: Factura[]
  configActiva: boolean
  ruc?: string
  ambiente?: 'pruebas' | 'produccion'
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

// ─── Modal para ingresar email si el comprador no lo tiene ───────────────────
function ModalEmail({
  factura,
  onEnviar,
  onCerrar,
  cargando,
}: {
  factura: Factura
  onEnviar: (email: string) => void
  onCerrar: () => void
  cargando: boolean
}) {
  const [email, setEmail] = useState('')
  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Enviar RIDE por email</p>
              <p className="text-[11px] text-foreground-muted">{factura.numero_factura ?? `#${factura.numero_secuencial}`}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-background-subtle text-foreground-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-foreground-muted mb-3">
            El comprador no tiene email registrado. Ingresa uno para enviar el RIDE.
          </p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cliente@ejemplo.com"
            className="w-full rounded-xl border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={e => { if (e.key === 'Enter' && valido) onEnviar(email) }}
          />
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={() => onEnviar(email)}
            disabled={!valido || cargando}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {cargando ? 'Enviando…' : 'Enviar RIDE'}
          </button>
          <button onClick={onCerrar} className="w-full h-9 rounded-xl border border-border text-sm text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cálculo del plazo para Nota de Crédito ──────────────────────────────────
// El SRI exige emitir la NC antes de la declaración mensual del IVA.
// El día de vencimiento depende del último dígito del RUC del emisor.
function calcularPlazoNC(fechaEmision: string, ruc: string): { fechaLimite: Date; diasRestantes: number } {
  const ultimo = parseInt(ruc.slice(-1))
  // último dígito 0→28, 1→10, 2→12, …, 9→26
  const dia = ultimo === 0 ? 28 : ultimo * 2 + 8

  const f = new Date(fechaEmision + 'T12:00:00')
  const mes = f.getMonth() + 1          // mes siguiente
  const anio = mes === 12 ? f.getFullYear() + 1 : f.getFullYear()
  const mesReal = mes % 12              // 0..11

  const fechaLimite = new Date(anio, mesReal, dia)
  const hoy = new Date()
  const diasRestantes = Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return { fechaLimite, diasRestantes }
}

// ─── Modal para emitir Nota de Crédito ───────────────────────────────────────
function ModalNotaCredito({
  factura, ruc, onConfirmar, onCerrar, cargando,
}: {
  factura: Factura
  ruc: string
  onConfirmar: (motivo: string) => void
  onCerrar: () => void
  cargando: boolean
}) {
  const [motivo, setMotivo] = useState('')
  const { fechaLimite, diasRestantes } = calcularPlazoNC(factura.fecha_emision, ruc)
  const vencido   = diasRestantes < 0
  const urgente   = diasRestantes >= 0 && diasRestantes <= 3
  const mesNombre = fechaLimite.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ReceiptText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Nota de Crédito Electrónica</p>
              <p className="text-[11px] text-foreground-muted">{factura.numero_factura ?? `#${factura.numero_secuencial}`} · ${factura.totales?.total?.toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-background-subtle text-foreground-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Plazo */}
          <div className={cn(
            'rounded-xl border px-3 py-3',
            vencido  ? 'bg-red-50 border-red-200' :
            urgente  ? 'bg-amber-50 border-amber-200' :
                       'bg-blue-50 border-blue-200'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={cn('w-3.5 h-3.5 flex-shrink-0', vencido ? 'text-red-600' : urgente ? 'text-amber-600' : 'text-blue-600')} />
              <p className={cn('text-xs font-bold', vencido ? 'text-red-800' : urgente ? 'text-amber-800' : 'text-blue-800')}>
                {vencido
                  ? `Plazo vencido hace ${Math.abs(diasRestantes)} días`
                  : diasRestantes === 0
                  ? 'Vence hoy'
                  : `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restantes`}
              </p>
            </div>
            <p className={cn('text-[11px] leading-relaxed', vencido ? 'text-red-700' : urgente ? 'text-amber-700' : 'text-blue-700')}>
              {vencido
                ? `El plazo venció el ${mesNombre}. Consulta con tu contador si aún es posible emitirla.`
                : `Emite antes del ${mesNombre} (declaración mensual IVA según tu RUC).`}
            </p>
          </div>

          {/* Info de qué hace la NC */}
          <div className="rounded-xl bg-background-subtle border border-border px-3 py-3 flex flex-col gap-1">
            <p className="text-xs font-semibold text-foreground">¿Qué hace la Nota de Crédito?</p>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Cancela contablemente la factura original ante el SRI. La factura sigue autorizada en los registros del SRI, pero la NC la anula para efectos tributarios. El monto a reversar es <span className="font-semibold text-foreground">{formatearPrecio(factura.totales?.total ?? 0)}</span>.
            </p>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Motivo de la Nota de Crédito <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Error en datos del comprador, devolución del producto, factura duplicada…"
              rows={3}
              className="w-full rounded-xl border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-[10px] text-foreground-muted mt-1">
              Este texto aparece en el comprobante electrónico enviado al SRI.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={() => onConfirmar(motivo)}
            disabled={!motivo.trim() || cargando}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ReceiptText className="w-4 h-4" />}
            {cargando ? 'Emitiendo al SRI…' : 'Emitir Nota de Crédito'}
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

// ─── Componente principal ─────────────────────────────────────────────────────
export function TablaFacturas({ facturas: facturasInic, configActiva, ruc = '', ambiente = 'produccion' }: Props) {
  const router = useRouter()
  const [facturas, setFacturas] = useState<Factura[]>(facturasInic)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | 'todos'>('todos')
  const [enviando, setEnviando] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [consultando, setConsultando] = useState<string | null>(null)
  const [emitiendoNC, setEmitiendoNC] = useState<string | null>(null)
  const [modalAnular, setModalAnular] = useState<Factura | null>(null)
  const [modalNC, setModalNC] = useState<Factura | null>(null)
  const [modalEmail, setModalEmail] = useState<Factura | null>(null)
  const [enviandoEmail, setEnviandoEmail] = useState<string | null>(null)
  const [bannerAnulacion, setBannerAnulacion] = useState<{ factura: Factura; ambiente: string } | null>(null)

  // Auto-consulta al cargar la página: resuelve facturas en estado "enviada"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pendientes = facturasInic.filter(f => f.estado === 'enviada')
    if (pendientes.length === 0) return
    let cancelado = false
    ;(async () => {
      for (const f of pendientes) {
        if (cancelado) break
        setConsultando(f.id)
        try {
          const res = await fetch('/api/facturacion/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facturaId: f.id }),
          })
          const data = await res.json()
          if (!cancelado) {
            if (data.estado === 'autorizada') {
              toast.success(`¡Autorizada! N° ${data.numeroAutorizacion?.slice(0, 10)}…`)
              router.refresh()
            } else if (data.estado === 'rechazada') {
              const msg = data.mensajes?.length > 0
                ? traducirMensajesSRI(data.mensajes)
                : (data.error ?? 'Error desconocido')
              toast.error(`SRI rechazó: ${msg}`)
              router.refresh()
            }
          }
        } catch { /* error de red silencioso en auto-consulta */ }
        finally { if (!cancelado) setConsultando(null) }
        if (!cancelado && pendientes.indexOf(f) < pendientes.length - 1) {
          await new Promise(r => setTimeout(r, 800))
        }
      }
    })()
    return () => { cancelado = true }
  }, []) // solo al montar — intencional

  // Mapa facturaId → ncId para detectar cuáles tienen NC emitida
  const ncPorFactura = Object.fromEntries(
    facturas
      .filter(f => f.tipo === 'nota_credito' && f.factura_origen_id && f.estado !== 'rechazada')
      .map(f => [f.factura_origen_id!, f.id])
  )

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
        const msg = data.mensajes?.length > 0
          ? traducirMensajesSRI(data.mensajes)
          : (data.error ?? 'Error desconocido')
        toast.error(`SRI rechazó: ${msg}`)
      }
      router.refresh()
    } catch {
      toast.error('Error de conexión al enviar al SRI')
    } finally {
      setEnviando(null)
    }
  }

  async function consultarSRI(facturaId: string) {
    setConsultando(facturaId)
    try {
      const res = await fetch('/api/facturacion/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al consultar el SRI'); return }

      if (data.estado === 'autorizada') {
        toast.success(`¡Autorizada por el SRI! N° ${data.numeroAutorizacion?.slice(0,10)}…`)
        router.refresh()
      } else if (data.estado === 'rechazada') {
        const msg = data.mensajes?.length > 0
          ? traducirMensajesSRI(data.mensajes)
          : (data.error ?? 'Error desconocido')
        toast.error(`SRI rechazó: ${msg}`)
        router.refresh()
      } else {
        toast.info('El SRI aún no ha procesado el comprobante. Intenta más tarde.')
      }
    } catch {
      toast.error('Error de conexión al consultar el SRI')
    } finally {
      setConsultando(null)
    }
  }

  async function confirmarNC(motivo: string) {
    if (!modalNC) return
    const facturaOrigenId = modalNC.id
    setEmitiendoNC(facturaOrigenId)
    try {
      const res = await fetch('/api/facturacion/nota-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaOrigenId, motivo }),
      })
      const data = await res.json()
      setModalNC(null)
      if (data.ok && data.estado === 'autorizada') {
        toast.success(`Nota de Crédito autorizada por el SRI · ${data.numeroNC}`)
        router.refresh()
      } else if (data.ok) {
        toast.info('Nota de Crédito enviada al SRI, pendiente de autorización')
        router.refresh()
      } else {
        const msg = data.mensajes?.length > 0
          ? traducirMensajesSRI(data.mensajes)
          : (data.error ?? 'Error desconocido')
        toast.error(`SRI rechazó la NC: ${msg}`)
        router.refresh()
      }
    } catch {
      toast.error('Error de conexión al emitir la Nota de Crédito')
    } finally {
      setEmitiendoNC(null)
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
        setBannerAnulacion({ factura: facturaParaBanner, ambiente })
      }
    } catch {
      toast.error('Error de conexión al anular')
    } finally {
      setAnulando(null)
    }
  }

  function exportarCSV() {
    const esc = (v: string | number | null | undefined): string => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const encabezado = [
      'N° Factura', 'Fecha emisión', 'Estado',
      'Comprador', 'Identificación', 'Email comprador',
      'Base 0%', 'Base IVA', 'IVA', 'Descuento', 'Total',
      'N° Autorización SRI', 'Motivo anulación',
    ]

    const filas = filtradas.map(f => [
      esc(f.numero_factura ?? f.numero_secuencial),
      esc(f.fecha_emision),
      esc(LABELS_ESTADO[f.estado]),
      esc(f.datos_comprador?.razon_social),
      esc(f.datos_comprador?.identificacion),
      esc(f.datos_comprador?.email),
      esc(f.totales?.subtotal_0?.toFixed(2)),
      esc(f.totales?.subtotal_iva?.toFixed(2)),
      esc(f.totales?.total_iva?.toFixed(2)),
      esc(f.totales?.descuento?.toFixed(2)),
      esc(f.totales?.total?.toFixed(2)),
      esc(f.numero_autorizacion),
      esc(f.motivo_anulacion),
    ].join(','))

    const csv = [encabezado.join(','), ...filas].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `facturas_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filtradas.length} factura${filtradas.length !== 1 ? 's' : ''} exportada${filtradas.length !== 1 ? 's' : ''}`)
  }

  async function sendRide(facturaId: string, emailDestino?: string) {
    setEnviandoEmail(facturaId)
    try {
      const res = await fetch('/api/email/enviar-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaId, emailDestino }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`RIDE enviado a ${data.enviado_a}`)
        setModalEmail(null)
        // Actualizar historial en estado local sin recargar
        setFacturas(prev => prev.map(f => f.id === facturaId
          ? { ...f, email_enviado_en: new Date().toISOString(), email_enviado_a: data.enviado_a }
          : f
        ))
      } else {
        toast.error(data.error ?? 'No se pudo enviar el email')
      }
    } catch {
      toast.error('Error de conexión al enviar el email')
    } finally {
      setEnviandoEmail(null)
    }
  }

  function iniciarEnvioEmail(factura: Factura) {
    if (factura.datos_comprador?.email) {
      sendRide(factura.id)
    } else {
      setModalEmail(factura)
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

      {/* Modal Nota de Crédito */}
      {modalNC && (
        <ModalNotaCredito
          factura={modalNC}
          ruc={ruc}
          onConfirmar={confirmarNC}
          onCerrar={() => setModalNC(null)}
          cargando={emitiendoNC === modalNC.id}
        />
      )}

      {/* Modal email sin destinatario */}
      {modalEmail && (
        <ModalEmail
          factura={modalEmail}
          onEnviar={email => sendRide(modalEmail.id, email)}
          onCerrar={() => setModalEmail(null)}
          cargando={enviandoEmail === modalEmail.id}
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
          <button
            onClick={exportarCSV}
            disabled={filtradas.length === 0}
            title="Exportar facturas visibles a CSV"
            className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border text-foreground-muted text-sm font-medium hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40 flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
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
                      onConsultar={consultarSRI}
                      onNotaCredito={() => setModalNC(factura)}
                      onEnviarEmail={() => iniciarEnvioEmail(factura)}
                      cargando={enviando === factura.id}
                      consultando={consultando === factura.id}
                      enviandoEmail={enviandoEmail === factura.id}
                      tieneNC={!!ncPorFactura[factura.id]}
                      sinRuc={!ruc}
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
  factura, esUltima, onEmitir, onAnular, onConsultar, onNotaCredito, onEnviarEmail,
  cargando, consultando, enviandoEmail, tieneNC, sinRuc,
}: {
  factura: Factura
  esUltima: boolean
  onEmitir: (id: string) => Promise<void>
  onAnular: () => void
  onConsultar: (id: string) => Promise<void>
  onNotaCredito: () => void
  onEnviarEmail: () => void
  cargando?: boolean
  consultando?: boolean
  enviandoEmail?: boolean
  tieneNC?: boolean
  sinRuc?: boolean
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
          <div className="flex items-center gap-1.5">
            {factura.tipo === 'nota_credito' && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">NC</span>
            )}
            <span className={cn('font-mono text-xs text-foreground', anulada && 'line-through text-foreground-muted')}>
              {factura.numero_factura ?? `#${factura.numero_secuencial}`}
            </span>
          </div>
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
            {/* Enviar al SRI (solo facturas, no NC que ya se emiten directamente) */}
            {factura.tipo !== 'nota_credito' && (factura.estado === 'borrador' || factura.estado === 'rechazada') && (
              <button onClick={() => onEmitir(factura.id)} disabled={cargando}
                title="Enviar al SRI"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50">
                {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {cargando ? 'Enviando…' : 'Enviar SRI'}
              </button>
            )}

            {/* Consultar autorización SRI para facturas en estado "enviada" */}
            {factura.estado === 'enviada' && (
              <button onClick={() => onConsultar(factura.id)} disabled={consultando}
                title="Consultar estado en el SRI"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium transition-colors disabled:opacity-50">
                {consultando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {consultando ? 'Consultando…' : 'Consultar SRI'}
              </button>
            )}

            {/* Nota de Crédito — solo para facturas autorizadas sin NC previa */}
            {!anulada && factura.tipo !== 'nota_credito' && factura.estado === 'autorizada' && !tieneNC && !sinRuc && (
              <button onClick={onNotaCredito}
                title="Emitir Nota de Crédito"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors">
                <ReceiptText className="w-3 h-3" />
                <span className="hidden sm:inline">NC</span>
              </button>
            )}

            {/* Badge NC emitida */}
            {tieneNC && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                <ReceiptText className="w-2.5 h-2.5" />
                NC emitida
              </span>
            )}

            {/* RIDE PDF */}
            {!anulada && (factura.estado === 'autorizada' || factura.xml_firmado) && (
              <a href={`/api/facturacion/ride?id=${factura.id}`} target="_blank" rel="noopener noreferrer"
                title="Descargar RIDE (PDF)"
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-background-subtle text-foreground-muted hover:text-foreground text-xs font-medium transition-colors">
                <FileText className="w-3 h-3" /> RIDE
              </a>
            )}

            {/* Enviar RIDE por email — solo facturas autorizadas (no NC) */}
            {!anulada && factura.tipo !== 'nota_credito' && factura.estado === 'autorizada' && (
              <button onClick={onEnviarEmail} disabled={enviandoEmail}
                title="Enviar RIDE por email"
                className="p-1.5 rounded-lg hover:bg-blue-50 text-foreground-muted hover:text-blue-600 transition-colors disabled:opacity-50">
                {enviandoEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* XML firmado */}
            {!anulada && factura.xml_firmado && factura.estado !== 'borrador' && (
              <a href={`/api/facturacion/xml?id=${factura.id}`} download
                title="Descargar XML firmado"
                className="p-1.5 rounded-lg hover:bg-background-subtle text-foreground-muted hover:text-foreground transition-colors">
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Anular — solo si no está anulada y no tiene NC activa */}
            {!anulada && !tieneNC && (
              <button onClick={onAnular}
                title={factura.estado === 'autorizada' ? 'Para facturas autorizadas usa Nota de Crédito (NC)' : 'Anular'}
                className="p-1.5 rounded-lg hover:bg-red-50 text-foreground-muted hover:text-red-600 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Ver detalle */}
            {(factura.error_sri || factura.motivo_anulacion || factura.numero_autorizacion || factura.email_enviado_en) && (
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
              {/* Historial de envío por email */}
              {factura.email_enviado_en ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">RIDE enviado por email</p>
                      <p className="text-xs text-blue-600">
                        {factura.email_enviado_a} &middot;{' '}
                        {new Date(factura.email_enviado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {!anulada && (
                    <button
                      onClick={onEnviarEmail}
                      disabled={enviandoEmail}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-[11px] font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {enviandoEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Reenviar
                    </button>
                  )}
                </div>
              ) : factura.estado === 'autorizada' && !anulada ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-background-subtle border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
                    <p className="text-xs text-foreground-muted">RIDE no enviado por email aún</p>
                  </div>
                  <button
                    onClick={onEnviarEmail}
                    disabled={enviandoEmail}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {enviandoEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                    Enviar
                  </button>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
