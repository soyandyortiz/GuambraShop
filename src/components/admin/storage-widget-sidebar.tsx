import Link from 'next/link'
import { HardDrive } from 'lucide-react'
import { obtenerUsoStorage, formatearBytes, LIMITE_STORAGE_BYTES } from '@/lib/storage-uso'

export async function StorageWidgetSidebar() {
  const uso = await obtenerUsoStorage()

  const colorBarra =
    uso.nivel === 'critico'    ? 'bg-red-500' :
    uso.nivel === 'advertencia'? 'bg-amber-500' :
    'bg-emerald-500'

  const colorTexto =
    uso.nivel === 'critico'    ? 'text-red-600' :
    uso.nivel === 'advertencia'? 'text-amber-600' :
    'text-foreground-muted'

  return (
    <Link
      href="/admin/dashboard/almacenamiento"
      className="mx-2 mb-2 px-3 py-2.5 rounded-xl border border-border hover:bg-background-subtle transition-colors group block"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-foreground-muted" />
          <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
            Almacenamiento
          </span>
        </div>
        <span className={`text-[10px] font-black ${colorTexto}`}>
          {uso.porcentaje.toFixed(0)}%
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorBarra}`}
          style={{ width: `${uso.porcentaje}%` }}
        />
      </div>

      <p className="text-[9px] text-foreground-muted mt-1.5 font-medium">
        {formatearBytes(uso.totalBytes)} / {formatearBytes(LIMITE_STORAGE_BYTES)}
        {uso.nivel !== 'ok' && (
          <span className={`ml-1 font-bold ${colorTexto}`}>
            {uso.nivel === 'critico' ? '· ¡Crítico!' : '· Revisar'}
          </span>
        )}
      </p>
    </Link>
  )
}
