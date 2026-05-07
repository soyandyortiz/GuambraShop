export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { PosVenta } from '@/components/admin/venta-nueva/pos-venta'

export default async function PáginaVentaNueva() {
  const supabase = await crearClienteServidor()

  const [
    { data: productosRaw },
    { data: imagenesRaw },
    { data: variantesRaw },
    { data: pedidosItems },
    { data: clientes },
    { data: config },
    { data: facturacion },
  ] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, slug, tipo_producto, precio, precio_descuento, stock')
      .eq('esta_activo', true)
      .not('tipo_producto', 'eq', 'evento'),
    supabase
      .from('imagenes_producto')
      .select('producto_id, url, orden')
      .order('orden', { ascending: true }),
    supabase
      .from('variantes_producto')
      .select('id, producto_id, nombre, precio_variante, stock_variante, tipo_precio'),
    // Contar ventas por producto (solo pedidos completados/confirmados)
    supabase
      .from('pedidos')
      .select('items')
      .in('estado', ['confirmado', 'en_proceso', 'enviado', 'entregado'])
      .limit(500),
    supabase
      .from('clientes')
      .select('id, tipo_identificacion, identificacion, razon_social, email, telefono')
      .order('razon_social'),
    supabase
      .from('configuracion_tienda')
      .select('nombre_tienda, simbolo_moneda, pais, whatsapp, ticket_ancho_papel, ticket_linea_1, ticket_linea_2, ticket_linea_3, ticket_linea_4, ticket_texto_pie, ticket_pie_2, ticket_mostrar_precio_unit')
      .single(),
    supabase
      .from('configuracion_facturacion')
      .select('activo')
      .maybeSingle(),
  ])

  // Contar cuántas veces se vendió cada producto_id
  const conteoVentas = new Map<string, number>()
  for (const pedido of (pedidosItems ?? [])) {
    const items = (pedido.items ?? []) as { producto_id?: string }[]
    for (const item of items) {
      if (item.producto_id) {
        conteoVentas.set(item.producto_id, (conteoVentas.get(item.producto_id) ?? 0) + 1)
      }
    }
  }

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

  const productos = (productosRaw ?? [])
    .map(p => {
      const imgs = imagenesPorProducto.get(p.id) ?? []
      const imagen_url = imgs.find(i => i.orden === 0)?.url ?? imgs[0]?.url ?? null
      const variantes = (variantesPorProducto.get(p.id) ?? []).map(v => ({
        id:              v.id,
        nombre:          v.nombre,
        precio_variante: v.precio_variante != null ? Number(v.precio_variante) : null,
        stock_variante:  v.stock_variante  != null ? Number(v.stock_variante)  : null,
        tipo_precio:     v.tipo_precio,
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
        ventas:           conteoVentas.get(p.id) ?? 0,
      }
    })
    // Ordenar: más vendidos primero, luego alfabético
    .sort((a, b) => b.ventas - a.ventas || a.nombre.localeCompare(b.nombre))

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
        ticketAnchoPapel={((config as any)?.ticket_ancho_papel ?? '80') as '58' | '80'}
        ticketLinea1={(config as any)?.ticket_linea_1 ?? null}
        ticketLinea2={(config as any)?.ticket_linea_2 ?? null}
        ticketLinea3={(config as any)?.ticket_linea_3 ?? null}
        ticketLinea4={(config as any)?.ticket_linea_4 ?? null}
        ticketPie1={(config as any)?.ticket_texto_pie ?? null}
        ticketPie2={(config as any)?.ticket_pie_2 ?? null}
        ticketMostrarPrecioUnit={(config as any)?.ticket_mostrar_precio_unit !== false}
      />
    </div>
  )
}
