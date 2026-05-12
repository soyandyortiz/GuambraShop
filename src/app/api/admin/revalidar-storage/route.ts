import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  revalidateTag('storage-uso')
  return NextResponse.json({ ok: true })
}
