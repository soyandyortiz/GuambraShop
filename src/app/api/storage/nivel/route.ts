import { NextResponse } from 'next/server'
import { obtenerUsoStorage, LIMITE_STORAGE_BYTES } from '@/lib/storage-uso'

export async function GET() {
  const uso = await obtenerUsoStorage()
  return NextResponse.json({
    porcentaje: uso.porcentaje,
    nivel: uso.nivel,
    lleno: uso.totalBytes >= LIMITE_STORAGE_BYTES,
  })
}
