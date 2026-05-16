'use client'

import { useState, useEffect } from 'react'
import { Trash2, Loader2, CheckCircle2, FileX } from 'lucide-react'
import { toast } from 'sonner'
import { formatearBytes } from '@/lib/storage-uso'

export function BotonLimpiarComprobantes() {
  const [preview, setPreview]     = useState<{ archivos: number; bytes: number } | null>(null)
  const [cargando, setCargando]   = useState(true)
  const [limpiando, setLimpiando] = useState(false)
  const [limpioEn, setLimpioEn]   = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/limpiar-comprobantes')
      .then(r => r.json())
      .then(d => setPreview(d))
      .catch(() => setPreview(null))
      .finally(() => setCargando(false))
  }, [limpioEn])

  async function limpiar() {
    if (!confirm(`¿Eliminar ${preview?.archivos} comprobantes de pago? Esta acción no se puede deshacer.`)) return
    setLimpiando(true)
    try {
      const res  = await fetch('/api/admin/limpiar-comprobantes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.eliminados} comprobantes eliminados correctamente`)
      setLimpioEn(Date.now())
    } catch {
      toast.error('Error al limpiar comprobantes')
    } finally {
      setLimpiando(false)
    }
  }

  if (cargando) return null
  if (!preview || preview.archivos === 0) return null

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <FileX className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-amber-800">
            Comprobantes de pago limpiables
          </h3>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Hay <strong>{preview.archivos} archivos</strong> de comprobantes de pedidos ya
            procesados (completados, cancelados o vencidos) que siguen ocupando espacio.
            {preview.bytes > 0 && (
              <> Eliminarlos liberará aproximadamente <strong>{formatearBytes(preview.bytes)}</strong>.</>
            )}
          </p>
          <p className="text-[11px] text-amber-600 mt-2">
            ⓘ Los comprobantes son solo una copia del justificante de pago. El pedido y su historial
            se conservan intactos en la base de datos.
          </p>
        </div>
      </div>

      <button
        onClick={limpiar}
        disabled={limpiando}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
      >
        {limpiando
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Limpiando...</>
          : <><Trash2 className="w-4 h-4" /> Limpiar {preview.archivos} comprobantes</>
        }
      </button>
    </div>
  )
}
