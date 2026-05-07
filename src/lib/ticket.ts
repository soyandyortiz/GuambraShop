// Generador de tickets para impresoras térmicas
// Abre una nueva ventana con el HTML del ticket y lanza el diálogo de impresión

export interface ConfigTicket {
  nombreTienda: string
  simboloMoneda: string
  anchoPapel?: '58' | '80'
  // Líneas libres del encabezado (debajo del nombre de la tienda)
  linea1?: string | null
  linea2?: string | null
  linea3?: string | null
  linea4?: string | null
  // Pie del ticket
  pie1?: string | null
  pie2?: string | null
  // Opciones de columnas
  mostrarPrecioUnit?: boolean
  // Campos legacy (compatibilidad con código anterior)
  whatsapp?: string | null
  ruc?: string | null
  direccion?: string | null
  textoPie?: string | null
}

export interface ItemTicket {
  nombre: string
  cantidad: number
  precio: number
  subtotal: number
}

export interface DatosTicket {
  numero_orden: string
  creado_en: string
  nombres: string
  tipo: string
  forma_pago?: string | null
  items: ItemTicket[]
  subtotal: number
  descuento_cupon: number
  cupon_codigo?: string | null
  costo_envio: number
  total: number
  ciudad?: string | null
  provincia?: string | null
}

const FORMA_PAGO: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  tarjeta:       'Tarjeta',
  otro:          'Otro',
}

export function imprimirTicket(datos: DatosTicket, config: ConfigTicket) {
  const ancho          = config.anchoPapel ?? '80'
  const anchoContenido = ancho === '58' ? '52mm' : '74mm'
  const mostrarPU      = config.mostrarPrecioUnit !== false

  // Líneas del encabezado — usa campos nuevos, con fallback legacy
  const lineasEncabezado: string[] = [
    config.linea1 ?? (config.ruc        ? `RUC: ${config.ruc}`           : null),
    config.linea2 ?? (config.whatsapp   ? `Tel: ${config.whatsapp}`      : null),
    config.linea3 ?? (config.direccion  ? config.direccion               : null),
    config.linea4 ?? null,
  ].filter((l): l is string => !!l?.trim())

  // Pie — usa campos nuevos, con fallback legacy
  const pie1 = config.pie1 ?? config.textoPie ?? '¡Gracias por su compra!'
  const pie2 = config.pie2 ?? null

  const fecha = new Date(datos.creado_en)
  const fechaStr = fecha.toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const horaStr = fecha.toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit',
  })
  const sm  = config.simboloMoneda
  const fmt = (n: number) => `${sm}${n.toFixed(2)}`

  const itemsHtml = datos.items.map(item => `
    <tr>
      <td colspan="${mostrarPU ? 3 : 2}" class="item-nombre">${item.nombre}</td>
    </tr>
    <tr>
      <td class="item-cant">${item.cantidad}x</td>
      ${mostrarPU ? `<td class="item-pu">${fmt(item.precio)}</td>` : ''}
      <td class="item-sub">${fmt(item.subtotal)}</td>
    </tr>
  `).join('')

  const encabezadoHtml = lineasEncabezado
    .map(l => `<div class="sub-tienda">${l}</div>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${datos.numero_orden}</title>
  <style>
    @page {
      size: ${ancho}mm auto;
      margin: 6mm 5mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      width: ${anchoContenido};
      color: #000;
      background: #fff;
    }
    .hr {
      border: none;
      border-top: 1px dashed #333;
      margin: 5px 0;
    }
    .nombre-tienda {
      font-size: 13pt;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .sub-tienda {
      font-size: 7.5pt;
      text-align: center;
      color: #333;
      margin-bottom: 2px;
    }
    .orden {
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      margin: 4px 0 2px;
    }
    .meta {
      font-size: 8pt;
      margin-bottom: 1px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0;
    }
    table.items .item-nombre {
      font-size: 8.5pt;
      padding-top: 3px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    table.items .item-cant { font-size: 8pt; width: 20px; }
    table.items .item-pu   { font-size: 8pt; text-align: right; }
    table.items .item-sub  { font-size: 8pt; text-align: right; font-weight: bold; width: 50px; }
    .totales {
      width: 100%;
      margin: 3px 0;
      font-size: 9pt;
    }
    .totales td:last-child { text-align: right; font-weight: bold; }
    .fila-total td {
      font-size: 12pt;
      font-weight: bold;
      padding-top: 3px;
    }
    .pie {
      font-size: 8pt;
      text-align: center;
      margin-top: 6px;
      color: #333;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="nombre-tienda">${config.nombreTienda.toUpperCase()}</div>
  ${encabezadoHtml}

  <hr class="hr">

  <div class="orden"># ${datos.numero_orden}</div>
  <div class="meta">Fecha  : ${fechaStr}  ${horaStr}</div>
  <div class="meta">Cliente: ${datos.nombres}</div>
  ${datos.forma_pago ? `<div class="meta">Pago   : ${FORMA_PAGO[datos.forma_pago] ?? datos.forma_pago}</div>` : ''}
  ${datos.tipo === 'delivery' && datos.ciudad
    ? `<div class="meta">Envío  : ${datos.ciudad}${datos.provincia ? ', ' + datos.provincia : ''}</div>`
    : ''}

  <hr class="hr">

  <table class="items">
    <thead>
      <tr>
        <th colspan="${mostrarPU ? 3 : 2}" style="font-size:7pt; text-align:left; padding-bottom:2px;">
          CANT  PRODUCTO${mostrarPU ? '              TOTAL' : ''}
        </th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <hr class="hr">

  <table class="totales">
    ${datos.descuento_cupon > 0 ? `
    <tr>
      <td>Subtotal</td>
      <td>${fmt(datos.subtotal)}</td>
    </tr>
    <tr>
      <td>Desc. cupón${datos.cupon_codigo ? ' (' + datos.cupon_codigo + ')' : ''}</td>
      <td>-${fmt(datos.descuento_cupon)}</td>
    </tr>
    ` : ''}
    ${datos.costo_envio > 0 ? `
    <tr>
      <td>Envío</td>
      <td>${fmt(datos.costo_envio)}</td>
    </tr>
    ` : ''}
    <tr class="fila-total">
      <td>TOTAL</td>
      <td>${fmt(datos.total)}</td>
    </tr>
  </table>

  <hr class="hr">

  ${pie1 ? `<div class="pie">${pie1}</div>` : ''}
  ${pie2 ? `<div class="pie" style="margin-top:2px;">${pie2}</div>` : ''}

</body>
</html>`

  const ventana = window.open('', '_blank', 'width=420,height=600,scrollbars=yes')
  if (!ventana) {
    alert('Permite las ventanas emergentes para imprimir el ticket.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => { ventana.print() }, 400)
}
