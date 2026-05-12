import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { obtenerUsoStorage } from '@/lib/storage-uso'

export async function GET() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const uso = await obtenerUsoStorage()
  return NextResponse.json(uso)
}
