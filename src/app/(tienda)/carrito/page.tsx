import { crearClienteServidor } from '@/lib/supabase/servidor'
import { CarritoCliente } from './carrito-cliente'

export default async function PáginaCarrito() {
  const supabase = await crearClienteServidor()

  const [{ data: zonas }, { data: config }] = await Promise.all([
    supabase.from('zonas_envio')
      .select('id, provincia, ciudad, empresa_envio, precio, tiempo_entrega')
      .eq('esta_activa', true)
      .order('orden'),
    supabase.from('configuracion_tienda')
      .select('whatsapp, nombre_tienda, simbolo_moneda, direcciones_negocio(etiqueta, direccion, ciudad)')
      .single(),
  ])

  return (
    <CarritoCliente
      zonas={zonas ?? []}
      whatsapp={config?.whatsapp ?? ''}
      nombreTienda={config?.nombre_tienda ?? 'Tienda'}
      simboloMoneda={config?.simbolo_moneda ?? '$'}
    />
  )
}
