export interface ItemCarrito {
  nombre: string
  variante?: string
  talla?: string
  cantidad: number
  precio: number
  slug: string
  tipo_producto?: string
  cita?: { fecha: string; hora_inicio: string; empleado_nombre?: string }
  extras?: { id: string; nombre: string; precio: number }[]
}

export interface OpcionEnvio {
  tipo: 'tienda' | 'envio'
  provincia?: string
  ciudad?: string
  direccion?: string
  detallesDireccion?: string
}

export interface DatosMensaje {
  numeroPedido?: string
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
  const { numeroPedido, nombreTienda, items, cupon, envio, siteUrl, simboloMoneda = '$' } = datos

  const fmt = (n: number) => `${simboloMoneda}${n.toFixed(2)}`

  const soloServicios = items.every(i => i.tipo_producto === 'servicio')

  // Líneas de ítems — formato varía por tipo
  const lineasItems = items
    .map((item, i) => {
      const subtotal = item.precio * item.cantidad
      const extras: string[] = []
      if (item.variante) extras.push(`Variante: ${item.variante}`)
      if (item.talla)    extras.push(`Talla: ${item.talla}`)
      if (item.extras?.length) extras.push(...item.extras.map(e => `+${e.nombre} (${fmt(e.precio)})`))

      if (item.tipo_producto === 'servicio' && item.cita) {
        const fechaStr = new Date(item.cita.fecha + 'T00:00:00').toLocaleDateString('es-EC', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
        const horaStr = item.cita.hora_inicio.slice(0, 5)
        const lineaEmpleado = item.cita?.empleado_nombre
          ? `\n   - Atencion: *${item.cita.empleado_nombre}*`
          : ''
        return (
          `*${i + 1}. ${item.nombre}*` +
          (extras.length ? `\n   _${extras.join(' | ')}_` : '') +
          `\n   - Fecha: *${fechaStr}*` +
          `\n   - Hora:  *${horaStr}*` +
          lineaEmpleado +
          `\n   - Precio: *${fmt(subtotal)}*`
        )
      }

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

  // Envío / atención — servicios solo muestran local
  let lineaEnvio = ''
  if (soloServicios) {
    lineaEnvio = `Atencion: *Local fisico*\n`
  } else if (envio.tipo === 'tienda') {
    lineaEnvio = `Entrega: *Retiro en tienda* (sin costo de envio)\n`
  } else {
    const destino = [envio.ciudad, envio.provincia].filter(Boolean).join(', ')
    lineaEnvio =
      `Entrega: *Envio a domicilio*\n` +
      (destino ? `   Destino: ${destino}\n` : '') +
      (envio.direccion ? `   Direccion: ${envio.direccion}\n` : '') +
      (envio.detallesDireccion ? `   Detalles: ${envio.detallesDireccion}\n` : '')
  }

  // Total
  const descuento = cupon?.descuento ?? 0
  const total = subtotalBase - descuento

  // URLs de ítems — label diferenciado por tipo
  const footerLabel = soloServicios ? `*Servicio(s):*` : `*Productos:*`
  const urlsItems = items
    .map((item) => `- ${siteUrl}/producto/${item.slug}`)
    .join('\n')

  // Encabezado y sección diferenciados por tipo
  const tituloPedido = soloServicios
    ? `*Cita agendada - ${nombreTienda}*`
    : `*Nuevo pedido - ${nombreTienda}*`
  const tituloDetalle = soloServicios
    ? `*DETALLE DE LA CITA:*`
    : `*DETALLE DEL PEDIDO:*`

  const mensaje =
    `${tituloPedido}\n` +
    (numeroPedido ? `*N\u00ba de orden: ${numeroPedido}*\n` : '') +
    `\n${tituloDetalle}\n\n` +
    `${lineasItems}\n\n` +
    `${SEP}\n` +
    `${lineaCupon}` +
    `${lineaEnvio}` +
    `${SEP}\n` +
    `*TOTAL: ${fmt(total)}*\n\n` +
    `${footerLabel}\n${urlsItems}`

  return encodeURIComponent(mensaje)
}

export function normalizarTelefono(telefono: string): string {
  // Eliminar todo excepto dígitos
  let tel = telefono.replace(/\D/g, '')
  // Número local Ecuador: 09XXXXXXXX (10 dígitos) → 5939XXXXXXXX
  if (tel.length === 10 && tel.startsWith('0')) {
    tel = '593' + tel.slice(1)
  }
  return tel
}

export function generarEnlaceWhatsApp(telefono: string, mensajeCodificado: string): string {
  const tel = normalizarTelefono(telefono)
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
  const tel = normalizarTelefono(telefono)
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensajePersonalizado)}`
}

export interface DatosSolicitudEvento {
  numeroSolicitud: string
  productoNombre: string
  nombreCliente: string
  whatsapp: string
  email: string
  fechaEvento?: string | null
  horaEvento?: string | null
  ciudad?: string | null
  tipoEvento?: string | null
  presupuesto?: number | null
  notas?: string | null
  simboloMoneda?: string
}

export function generarMensajeSolicitudEvento(datos: DatosSolicitudEvento): string {
  const { numeroSolicitud, productoNombre, nombreCliente, email, fechaEvento, horaEvento, ciudad, tipoEvento, presupuesto, notas, simboloMoneda = '$' } = datos
  const fmt = (n: number) => `${simboloMoneda}${n.toFixed(2)}`

  const lineasEvento: string[] = []
  if (tipoEvento)   lineasEvento.push(`- Tipo de evento: ${tipoEvento}`)
  if (fechaEvento)  lineasEvento.push(`- Fecha: ${new Date(fechaEvento + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
  if (horaEvento)   lineasEvento.push(`- Hora aproximada: ${horaEvento.slice(0, 5)}`)
  if (ciudad)       lineasEvento.push(`- Ciudad: ${ciudad}`)
  if (presupuesto)  lineasEvento.push(`- Presupuesto aprox.: ${fmt(presupuesto)}`)
  if (notas)        lineasEvento.push(`- Notas: ${notas}`)

  const mensaje =
    `*Solicitud de evento ${numeroSolicitud}*\n\n` +
    `Hola, me interesa el servicio *${productoNombre}*.\n\n` +
    `*Mis datos:*\n` +
    `- Nombre: ${nombreCliente}\n` +
    `- Email: ${email}\n\n` +
    (lineasEvento.length > 0 ? `*Detalles del evento:*\n${lineasEvento.join('\n')}\n\n` : '') +
    `Quedo atento/a a su respuesta.`

  return encodeURIComponent(mensaje)
}

export function generarMensajeRecuperacionContrasena(urlTienda: string): string {
  const mensaje =
    `Hola GuambraWeb, necesito recuperar mi acceso a mi tienda online.\n\n` +
    `Tienda: ${urlTienda}`
  return encodeURIComponent(mensaje)
}
