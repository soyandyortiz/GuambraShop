import { crearClienteServidor } from '@/lib/supabase/servidor'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
