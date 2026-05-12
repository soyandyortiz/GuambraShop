import { createClient } from '@supabase/supabase-js'

// Cliente con service_role — solo usar en servidor (API routes, Server Components)
export function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
