export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { PosVenta } from '@/components/admin/venta-nueva/pos-venta'

export default async function PáginaVentaNueva() {
  const supabase = await crearClienteServidor()

  const [
    { data: productosRaw },
    { data: clientes },
    { data: config },
    { data: facturacion },
  ] = await Promise.all([
    supabase
      .from('productos')
      .select(`
        id, nombre, slug, tipo_producto, precio, precio_descuento, stock, esta_activo,
        imagenes_producto(url, orden),
        variantes_producto(id, nombre, precio_variante, stock_variante, tipo_precio)
      `)
      .eq('esta_activo', true)
      .not('tipo_producto', 'eq', 'evento')
      .order('nombre'),
    supabase
      .from('clientes')
      .select('id, tipo_identificacion, identificacion, razon_social, email, telefono')
      .order('razon_social'),
    supabase
      .from('configuracion_tienda')
      .select('nombre_tienda, simbolo_moneda, pais, whatsapp')
      .single(),
    supabase
      .from('configuracion_facturacion')
      .select('activo')
      .maybeSingle(),
  ])

  const productos = (productosRaw ?? []).map(p => {
    const imgs = (p.imagenes_producto ?? []) as { url: string; orden: number }[]
    const imagen_url = imgs.find(i => i.orden === 0)?.url ?? imgs[0]?.url ?? null
    const variantes = (p.variantes_producto ?? []) as {
      id: string; nombre: string; precio_variante: number | null;
      stock_variante: number | null; tipo_precio: string | null
    }[]
    return {
      id:               p.id,
      nombre:           p.nombre,
      slug:             p.slug,
      tipo_producto:    p.tipo_producto,
      precio:           Number(p.precio),
      precio_descuento: p.precio_descuento ? Number(p.precio_descuento) : null,
      stock:            p.stock ?? null,
      imagen_url,
      variantes,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nueva Venta</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Venta presencial — selecciona cliente, agrega productos y registra el pago
        </p>
      </div>
      <PosVenta
        productos={productos}
        clientes={(clientes ?? []) as any}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
        pais={config?.pais ?? 'EC'}
        nombreTienda={config?.nombre_tienda ?? 'Mi Tienda'}
        whatsappTienda={config?.whatsapp ?? null}
        facturacionActiva={facturacion?.activo === true}
      />
    </div>
  )
}
