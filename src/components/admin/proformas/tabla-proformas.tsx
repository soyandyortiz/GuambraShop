'use client'

import { useState } from 'react'
import { formatearPrecio } from '@/lib/utils'
import { FileDown, Mail, MailCheck, Clock, AlertCircle, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import type { Proforma } from '@/types'

interface Props {
  proformas: Proforma[]
  simboloMoneda: string
}

function estadoVigencia(p: Proforma) {
  if (!p.vence_en) return 'sin-limite'
  const ahora = new Date()
  const vence = new Date(p.vence_en)
  if (ahora > vence) return 'vencida'
  const horas = (vence.getTime() - ahora.getTime()) / (1000 * 60 * 60)
  if (horas < 24) return 'proxima'
  return 'vigente'
}

function BadgeVigencia({ proforma }: { proforma: Proforma }) {
  const estado = estadoVigencia(proforma)
  if (estado === 'sin-limite') return null
  if (estado === 'vencida')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-danger/10 text-danger">
        <AlertCircle className="w-3 h-3" /> Vencida
      </span>
    )
  if (estado === 'proxima')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/10 text-warning">
        <Clock className="w-3 h-3" /> Por vencer
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success">
      <Clock className="w-3 h-3" /> Vigente
    </span>
  )
}

export function TablaProformas({ proformas, simboloMoneda }: Props) {
  const [descargando, setDescargando] = useState<string | null>(null)

  async function descargarPDF(proforma: Proforma) {
    setDescargando(proforma.id)
    try {
      const res = await fetch(`/api/proformas/pdf?id=${proforma.id}`)
      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Proforma-${proforma.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo descargar el PDF')
    } finally {
      setDescargando(null)
    }
  }

  if (proformas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-foreground-muted">
        <ScrollText className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-medium">No hay proformas aún</p>
        <p className="text-sm mt-1">Crea la primera desde el botón &quot;Nueva Proforma&quot;</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background-subtle">
              <th className="text-left px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide">Número</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide hidden md:table-cell">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide hidden lg:table-cell">Vigencia</th>
              <th className="text-right px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide">Total</th>
              <th className="text-center px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide">Email</th>
              <th className="text-center px-4 py-3 font-semibold text-foreground-muted text-xs uppercase tracking-wide">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {proformas.map(p => (
              <tr key={p.id} className="hover:bg-background-subtle transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-primary text-xs">{p.numero}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground truncate max-w-[180px]">{p.cliente_nombre}</p>
                  <p className="text-xs text-foreground-muted truncate max-w-[180px]">{p.cliente_email}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-foreground-muted text-xs">
                  {new Date(p.creado_en).toLocaleDateString('es-EC', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-col gap-1">
                    {p.vence_en ? (
                      <span className="text-xs text-foreground-muted">
                        {new Date(p.vence_en).toLocaleDateString('es-EC', {
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-foreground-muted">Sin límite</span>
                    )}
                    <BadgeVigencia proforma={p} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {formatearPrecio(p.total, simboloMoneda)}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.email_enviado ? (
                    <span title={`Enviado el ${p.email_enviado_en ? new Date(p.email_enviado_en).toLocaleDateString('es-EC') : '-'}`}>
                      <MailCheck className="w-4 h-4 text-success mx-auto" />
                    </span>
                  ) : (
                    <Mail className="w-4 h-4 text-foreground-muted/40 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => descargarPDF(p)}
                    disabled={descargando === p.id}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-foreground-muted hover:text-primary transition-colors disabled:opacity-50"
                    title="Descargar PDF"
                  >
                    {descargando === p.id
                      ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                      : <FileDown className="w-4 h-4" />
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
