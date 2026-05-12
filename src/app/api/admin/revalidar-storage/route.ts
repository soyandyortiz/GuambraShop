import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

// Sin caché — router.refresh() en el cliente ya es suficiente para obtener datos frescos
export async function POST() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
