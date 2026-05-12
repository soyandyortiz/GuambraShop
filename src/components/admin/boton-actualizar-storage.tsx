'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function BotonActualizarStorage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  async function actualizar() {
    setCargando(true)
    await fetch('/api/admin/revalidar-storage', { method: 'POST' })
    router.refresh()
    setCargando(false)
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={actualizar}
        disabled={cargando}
        className="flex items-center gap-2 text-xs text-foreground-muted hover:text-foreground border border-border hover:border-foreground/30 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
        {cargando ? 'Actualizando...' : 'Actualizar datos ahora'}
      </button>
    </div>
  )
}
