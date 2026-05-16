import Link from 'next/link'
import { AlertTriangle, HardDrive, ArrowRight } from 'lucide-react'
import { obtenerUsoStorage, formatearBytes, LIMITE_STORAGE_BYTES } from '@/lib/storage-uso'

export async function BannerAlmacenamiento() {
  const uso = await obtenerUsoStorage()

  if (uso.nivel === 'ok') return null

  const esCritico = uso.nivel === 'critico'

  return (
    <div className={`mb-6 rounded-2xl border px-4 py-3 flex items-center gap-3 ${
      esCritico
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        esCritico ? 'bg-red-100' : 'bg-amber-100'
      }`}>
        {esCritico
          ? <HardDrive className="w-4 h-4 text-red-600" />
          : <AlertTriangle className="w-4 h-4 text-amber-600" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${esCritico ? 'text-red-700' : 'text-amber-700'}`}>
          {esCritico
            ? `Almacenamiento al ${uso.porcentaje.toFixed(0)}% — Riesgo de bloqueo`
            : `Almacenamiento al ${uso.porcentaje.toFixed(0)}% — Espacio limitado`
          }
        </p>
        <p className={`text-xs mt-0.5 ${esCritico ? 'text-red-600' : 'text-amber-600'}`}>
          {formatearBytes(uso.totalBytes)} usados de {formatearBytes(LIMITE_STORAGE_BYTES)} disponibles en el plan gratuito.
          {uso.porcentaje >= 100
            ? ' La subida de imágenes está bloqueada. Elimina archivos en la sección Almacenamiento para continuar.'
            : esCritico
              ? ' La tienda podría dejar de aceptar nuevas imágenes. Elimina archivos para liberar espacio.'
              : ' Considera actualizar a Supabase Pro para escalar sin límites.'
          }
        </p>
      </div>

      <Link
        href="/admin/dashboard/almacenamiento"
        className={`flex items-center gap-1 text-xs font-bold flex-shrink-0 ${
          esCritico ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'
        } transition-colors`}
      >
        Ver detalle
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
