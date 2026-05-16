export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { CarritoCliente } from './carrito-cliente'

export default async function PáginaCarrito() {
  const supabase = await crearClienteServidor()

  const [{ data: config }, { data: metodosPago }] = await Promise.all([
    supabase.from('configuracion_tienda').select('whatsapp, nombre_tienda, simbolo_moneda, pais, paypal_activo, paypal_client_id, payphone_activo').single(),
    supabase.from('metodos_pago').select('id, banco, tipo_cuenta, numero_cuenta, cedula_titular, nombre_titular').eq('esta_activo', true).order('orden'),
  ])

  return (
    <CarritoCliente
      whatsapp={config?.whatsapp ?? ''}
      nombreTienda={config?.nombre_tienda ?? 'Tienda'}
      simboloMoneda={config?.simbolo_moneda ?? '$'}
      pais={config?.pais ?? 'EC'}
      metodosPago={(metodosPago as any) ?? []}
      paypalActivo={!!(config as any)?.paypal_activo}
      paypalClientId={(config as any)?.paypal_client_id ?? ''}
      payphoneActivo={!!(config as any)?.payphone_activo}
    />
  )
}
