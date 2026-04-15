import { crearClienteServidor } from '@/lib/supabase/servidor'
import { CarritoCliente } from './carrito-cliente'

export default async function PáginaCarrito() {
  const supabase = await crearClienteServidor()

  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('whatsapp, nombre_tienda, simbolo_moneda')
    .single()

  return (
    <CarritoCliente
      whatsapp={config?.whatsapp ?? ''}
      nombreTienda={config?.nombre_tienda ?? 'Tienda'}
      simboloMoneda={config?.simbolo_moneda ?? '$'}
    />
  )
}
