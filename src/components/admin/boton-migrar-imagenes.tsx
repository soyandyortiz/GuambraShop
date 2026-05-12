'use client'

import { useState } from 'react'
import { Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

type Estado = 'idle' | 'contando' | 'procesando' | 'listo' | 'error'

interface Progreso {
  procesadas: number
  total: number
  errores: { path: string; error: string }[]
}

const LOTE = 10 // imágenes por request

export function BotonMigrarImagenes() {
  const [estado, setEstado]     = useState<Estado>('idle')
  const [progreso, setProgreso] = useState<Progreso>({ procesadas: 0, total: 0, errores: [] })
  const [mensaje, setMensaje]   = useState('')

  async function iniciarMigracion() {
    setEstado('contando')
    setMensaje('Analizando imágenes...')
    setProgreso({ procesadas: 0, total: 0, errores: [] })

    // 1. Obtener lista de imágenes pendientes
    const res = await fetch('/api/admin/migrar-imagenes')
    const { pendientes, archivos } = await res.json() as {
      total: number
      pendientes: number
      archivos: { path: string }[]
    }

    if (pendientes === 0) {
      setEstado('listo')
      setMensaje('Todas las imágenes ya están en formato WebP optimizado.')
      return
    }

    setEstado('procesando')
    setProgreso(p => ({ ...p, total: pendientes }))

    // 2. Procesar en lotes
    const paths = archivos.map((a: { path: string }) => a.path)
    const erroresAcumulados: { path: string; error: string }[] = []

    for (let i = 0; i < paths.length; i += LOTE) {
      const lote = paths.slice(i, i + LOTE)
      setMensaje(`Convirtiendo imágenes ${i + 1}–${Math.min(i + LOTE, paths.length)} de ${pendientes}...`)

      const r = await fetch('/api/admin/migrar-imagenes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paths: lote }),
      })
      const { ok, errores } = await r.json() as { ok: number; errores: { path: string; error: string }[] }

      erroresAcumulados.push(...errores)
      setProgreso(p => ({
        procesadas: p.procesadas + ok,
        total:      p.total,
        errores:    [...p.errores, ...errores],
      }))
    }

    setEstado('listo')
    setMensaje(
      erroresAcumulados.length > 0
        ? `Listo con ${erroresAcumulados.length} error(es). Recarga la página para ver el nuevo uso.`
        : 'Todas las imágenes fueron optimizadas. Recarga la página para ver el ahorro.'
    )
  }

  const porcentaje = progreso.total > 0
    ? Math.round((progreso.procesadas / progreso.total) * 100)
    : 0

  return (
    <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Optimizar imágenes existentes
          </h3>
          <p className="text-xs text-foreground-muted mt-1">
            Convierte todas las fotos antiguas (JPG/PNG) a WebP comprimido.
            Libera espacio sin cambiar ningún producto visualmente.
          </p>
        </div>
        {estado === 'idle' && (
          <button
            onClick={iniciarMigracion}
            className="flex-shrink-0 h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Optimizar ahora
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      {estado === 'procesando' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-foreground-muted mb-1.5">
            <span>{progreso.procesadas} de {progreso.total} imágenes</span>
            <span className="font-bold">{porcentaje}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-background-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}

      {/* Estado */}
      {estado !== 'idle' && (
        <div className={`flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2 ${
          estado === 'listo' && progreso.errores.length === 0
            ? 'bg-emerald-50 text-emerald-700'
            : estado === 'listo' && progreso.errores.length > 0
            ? 'bg-amber-50 text-amber-700'
            : estado === 'error'
            ? 'bg-red-50 text-red-700'
            : 'bg-background-subtle text-foreground-muted'
        }`}>
          {estado === 'procesando' || estado === 'contando'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : estado === 'listo' && progreso.errores.length === 0
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <AlertTriangle className="w-3.5 h-3.5" />
          }
          {mensaje}
        </div>
      )}
    </div>
  )
}
