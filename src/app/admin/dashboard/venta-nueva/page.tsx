export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { PosVenta } from '@/components/admin/venta-nueva/pos-venta'

export default async function PáginaVentaNueva() {
  const supabase = await crearClienteServidor()

  const [
    { data: productosRaw },
    { data: imagenesRaw },
    { data: variantesRaw },
    { data: clientes },
    { data: config },
    { data: facturacion },
  ] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, slug, tipo_producto, precio, precio_descuento, stock')
      .eq('esta_activo', true)
      .not('tipo_producto', 'eq', 'evento')
      .order('nombre'),
    supabase
      .from('imagenes_producto')
      .select('producto_id, url, orden')
      .order('orden', { ascending: true }),
    supabase
      .from('variantes_producto')
      .select('id, producto_id, nombre, precio_variante, stock_variante, tipo_precio'),
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

  // Indexar imágenes y variantes por producto_id
  const imagenesPorProducto = new Map<string, { url: string; orden: number }[]>()
  for (const img of (imagenesRaw ?? [])) {
    const lista = imagenesPorProducto.get(img.producto_id) ?? []
    lista.push({ url: img.url, orden: img.orden })
    imagenesPorProducto.set(img.producto_id, lista)
  }

  const variantesPorProducto = new Map<string, typeof variantesRaw>()
  for (const v of (variantesRaw ?? [])) {
    const lista = variantesPorProducto.get(v.producto_id) ?? []
    lista.push(v)
    variantesPorProducto.set(v.producto_id, lista)
  }

  const productos = (productosRaw ?? []).map(p => {
    const imgs  = imagenesPorProducto.get(p.id) ?? []
    const imagen_url = imgs.find(i => i.orden === 0)?.url ?? imgs[0]?.url ?? null
    const variantes  = (variantesPorProducto.get(p.id) ?? []).map(v => ({
      id:             v.id,
      nombre:         v.nombre,
      precio_variante: v.precio_variante != null ? Number(v.precio_variante) : null,
      stock_variante:  v.stock_variante  != null ? Number(v.stock_variante)  : null,
      tipo_precio:    v.tipo_precio,
    }))
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
