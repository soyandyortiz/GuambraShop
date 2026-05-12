import { crearClienteAdmin } from './supabase/admin'

export const LIMITE_STORAGE_BYTES = 1_073_741_824 // 1 GB — plan gratuito Supabase

export interface BucketUso {
  id: string
  nombre: string
  icono: string
  bytes: number
  archivos: number
  porcentaje: number
}

export interface StorageUso {
  buckets: BucketUso[]
  totalBytes: number
  limitBytes: number
  porcentaje: number
  nivel: 'ok' | 'advertencia' | 'critico'
}

const META_BUCKET: Record<string, { nombre: string; icono: string }> = {
  imagenes:     { nombre: 'Imágenes de productos', icono: '🖼️' },
  facturacion:  { nombre: 'Facturas PDF/XML',       icono: '📄' },
  comprobantes: { nombre: 'Comprobantes de pago',   icono: '🧾' },
}

export function formatearBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1_024)         return `${bytes} B`
  if (bytes < 1_048_576)     return `${(bytes / 1_024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}

export async function obtenerUsoStorage(): Promise<StorageUso> {
  const admin = crearClienteAdmin()
  const { data, error } = await admin.rpc('obtener_uso_storage')

  if (error || !data) {
    return { buckets: [], totalBytes: 0, limitBytes: LIMITE_STORAGE_BYTES, porcentaje: 0, nivel: 'ok' }
  }

  const rows = data as { bucket_id: string; total_bytes: number; total_archivos: number }[]
  const totalBytes = rows.reduce((s, r) => s + Number(r.total_bytes), 0)

  const buckets: BucketUso[] = rows.map(r => {
    const meta = META_BUCKET[r.bucket_id] ?? { nombre: r.bucket_id, icono: '📁' }
    return {
      id:         r.bucket_id,
      nombre:     meta.nombre,
      icono:      meta.icono,
      bytes:      Number(r.total_bytes),
      archivos:   Number(r.total_archivos),
      porcentaje: totalBytes > 0 ? (Number(r.total_bytes) / totalBytes) * 100 : 0,
    }
  }).sort((a, b) => b.bytes - a.bytes)

  const porcentaje = Math.min(100, (totalBytes / LIMITE_STORAGE_BYTES) * 100)
  const nivel: StorageUso['nivel'] =
    porcentaje >= 90 ? 'critico' :
    porcentaje >= 70 ? 'advertencia' : 'ok'

  return { buckets, totalBytes, limitBytes: LIMITE_STORAGE_BYTES, porcentaje, nivel }
}
