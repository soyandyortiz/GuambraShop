export interface ItemCarrito {
  nombre: string
  variante?: string
  talla?: string
  cantidad: number
  precio: number
  slug: string
}

export interface OpcionEnvio {
  tipo: 'tienda' | 'envio'
  provincia?: string
  ciudad?: string
  empresaEnvio?: string
  tiempoEntrega?: string
  costoEnvio?: number
}

export interface DatosMensaje {
  nombreTienda: string
  items: ItemCarrito[]
  cupon?: { codigo: string; descuento: number }
  envio: OpcionEnvio
  siteUrl: string
  simboloMoneda?: string
}

// Separador: solo guiones ASCII, siempre seguros
const SEP = '-'.repeat(30)

export function generarMensajeWhatsApp(datos: DatosMensaje): string {
  const { nombreTienda, items, cupon, envio, siteUrl, simboloMoneda = '$' } = datos

  const fmt = (n: number) => `${simboloMoneda}${n.toFixed(2)}`

  // Líneas de productos
  const lineasProductos = items
    .map((item, i) => {
      const subtotal = item.precio * item.cantidad
      const extras: string[] = []
      if (item.variante) extras.push(`Variante: ${item.variante}`)
      if (item.talla)    extras.push(`Talla: ${item.talla}`)

      return (
        `*${i + 1}. ${item.nombre}*` +
        (extras.length ? `\n   _${extras.join(' | ')}_` : '') +
        `\n   Cant: ${item.cantidad}  |  ${fmt(item.precio)} c/u  |  Subtotal: *${fmt(subtotal)}*`
      )
    })
    .join('\n\n')

  const subtotalBase = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  // Cupón
  const lineaCupon = cupon
    ? `Cupon *${cupon.codigo}*: _-${fmt(cupon.descuento)}_\n`
    : ''

  // Envío — ciudad puede ser null/undefined en la DB
  let lineaEnvio = ''
  let costoEnvio = 0
  if (envio.tipo === 'tienda') {
    lineaEnvio = `Entrega: *Retiro en tienda* (sin costo de envio)\n`
  } else {
    costoEnvio = envio.costoEnvio ?? 0
    const destino = [envio.ciudad, envio.provincia].filter(Boolean).join(', ')
    lineaEnvio =
      `Entrega: *Envio a* ${destino}\n` +
      `   Empresa: ${envio.empresaEnvio}  |  Tiempo: ${envio.tiempoEntrega}\n` +
      `   Costo: *+${fmt(costoEnvio)}*\n`
  }

  // Total
  const descuento = cupon?.descuento ?? 0
  const total = subtotalBase - descuento + costoEnvio

  // URLs de productos
  const urlsProductos = items
    .map((item) => `- ${siteUrl}/producto/${item.slug}`)
    .join('\n')

  const mensaje =
    `*Nuevo pedido - ${nombreTienda}*\n\n` +
    `*DETALLE DEL PEDIDO:*\n\n` +
    `${lineasProductos}\n\n` +
    `${SEP}\n` +
    `${lineaCupon}` +
    `${lineaEnvio}` +
    `${SEP}\n` +
    `*TOTAL: ${fmt(total)}*\n\n` +
    `*Productos:*\n${urlsProductos}`

  return encodeURIComponent(mensaje)
}

export function generarEnlaceWhatsApp(telefono: string, mensajeCodificado: string): string {
  const tel = telefono.replace(/\D/g, '')
  return `https://wa.me/${tel}?text=${mensajeCodificado}`
}

export function generarMensajePromocion(
  nombrePromocion: string,
  descripcion: string,
  precio: number,
  simboloMoneda = '$'
): string {
  const fmt = (n: number) => `${simboloMoneda}${n.toFixed(2)}`
  const mensaje =
    `*${nombrePromocion}*\n\n` +
    `${descripcion}\n\n` +
    `Precio especial: *${fmt(precio)}*\n\n` +
    `Quiero aprovechar esta promocion!`
  return encodeURIComponent(mensaje)
}

export function generarEnlacePromocion(telefono: string, mensajePersonalizado: string): string {
  const tel = telefono.replace(/\D/g, '')
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensajePersonalizado)}`
}

export function generarMensajeRecuperacionContrasena(urlTienda: string): string {
  const mensaje =
    `Hola GuambraWeb, necesito recuperar mi acceso a mi tienda online.\n\n` +
    `Tienda: ${urlTienda}`
  return encodeURIComponent(mensaje)
}
