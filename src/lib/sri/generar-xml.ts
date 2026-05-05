/**
 * Generación del XML de factura electrónica según esquema SRI Ecuador v2.1.0
 * Ref: https://www.sri.gob.ec/factura-electronica
 */

import type { ConfiguracionFacturacion, Factura } from '@/types'

const TIPO_AMBIENTE: Record<string, string> = {
  pruebas:   '1',
  produccion: '2',
}

const CODIGO_TIPO_ID: Record<string, string> = {
  '04': '04',  // RUC
  '05': '05',  // Cédula
  '06': '06',  // Pasaporte
  '07': '07',  // Consumidor final
}

/** Calcula el dígito verificador por módulo 11 */
function digitoVerificador(serie: string): string {
  const pesos = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7]
  const digits = serie.split('').reverse()
  const suma = digits.reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0)
  const resto = suma % 11
  const dv = resto === 0 ? 0 : resto === 1 ? 1 : 11 - resto
  return String(dv)
}

/** Genera la clave de acceso de 49 dígitos */
export function generarClaveAcceso(config: ConfiguracionFacturacion, factura: Factura): string {
  const fecha = new Date(factura.fecha_emision + 'T12:00:00')
  const dd   = String(fecha.getDate()).padStart(2, '0')
  const mm   = String(fecha.getMonth() + 1).padStart(2, '0')
  const yyyy = String(fecha.getFullYear())

  const fechaStr = `${dd}${mm}${yyyy}`                      // 8
  const tipoComp = '01'                                      // 2 - factura
  const ruc      = config.ruc                               // 13
  const ambiente = TIPO_AMBIENTE[config.ambiente] ?? '1'    // 1
  const serie    = `${config.codigo_establecimiento.padStart(3,'0')}${config.punto_emision.padStart(3,'0')}` // 6
  const secuencial = factura.numero_secuencial.padStart(9, '0') // 9
  const codigoNum = String(Math.floor(Math.random() * 99999999)).padStart(8, '0') // 8
  const tipoEmision = '1'                                    // 1

  const sin_dv = `${fechaStr}${tipoComp}${ruc}${ambiente}${serie}${secuencial}${codigoNum}${tipoEmision}`
  const dv = digitoVerificador(sin_dv)

  return `${sin_dv}${dv}` // 49 dígitos
}

/** Formatea fecha como DD/MM/YYYY para el XML */
function formatFechaXML(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function n2(val: number): string {
  return val.toFixed(2)
}

/** Genera el XML sin firma de la factura */
export function generarXMLFactura(
  config: ConfiguracionFacturacion,
  factura: Factura,
  claveAcceso: string,
): string {
  const comprador = factura.datos_comprador
  const items     = factura.items
  const totales   = factura.totales
  const ambiente  = TIPO_AMBIENTE[config.ambiente] ?? '1'
  const obligado  = config.obligado_contabilidad ? 'SI' : 'NO'

  const totalSinImpuestos = n2(totales.subtotal_0 + totales.subtotal_iva)
  const totalDescuento    = n2(totales.descuento)
  const importeTotal      = n2(totales.total)
  const totalIVA          = n2(totales.total_iva)

  // Detalles
  const detallesXML = items.map((item, i) => {
    const precioTotalSinImp = n2(item.subtotal)
    const descItem = n2(item.descuento)
    const valorIVA = n2(item.subtotal * (item.iva / 100))
    const codigoIVA = item.iva === 0 ? '0' : '2'  // 0=exento, 2=15% (tarifa vigente)
    const tarifaIVA = item.iva === 0 ? '0' : String(item.iva)

    return `    <detalle>
      <codigoPrincipal>${String(i + 1).padStart(3, '0')}</codigoPrincipal>
      <descripcion>${esc(item.descripcion)}</descripcion>
      <cantidad>${item.cantidad.toFixed(6)}</cantidad>
      <precioUnitario>${item.precio_unitario.toFixed(6)}</precioUnitario>
      <descuento>${descItem}</descuento>
      <precioTotalSinImpuesto>${precioTotalSinImp}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${codigoIVA}</codigoPorcentaje>
          <tarifa>${tarifaIVA}</tarifa>
          <baseImponible>${precioTotalSinImp}</baseImponible>
          <valor>${valorIVA}</valor>
        </impuesto>
      </impuestos>
    </detalle>`
  }).join('\n')

  // Impuestos totales
  let impuestosTotales = ''
  if (totales.subtotal_0 > 0) {
    impuestosTotales += `
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>0</codigoPorcentaje>
        <baseImponible>${n2(totales.subtotal_0)}</baseImponible>
        <valor>0.00</valor>
      </totalImpuesto>`
  }
  if (totales.subtotal_iva > 0) {
    impuestosTotales += `
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>2</codigoPorcentaje>
        <baseImponible>${n2(totales.subtotal_iva)}</baseImponible>
        <valor>${totalIVA}</valor>
      </totalImpuesto>`
  }

  const nombreComercial = config.nombre_comercial
    ? `<nombreComercial>${esc(config.nombre_comercial)}</nombreComercial>\n    `
    : ''

  const contribEspecial = config.contribuyente_especial
    ? `<contribuyenteEspecial>${esc(config.contribuyente_especial)}</contribuyenteEspecial>\n    `
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
  <infoTributaria>
    <ambiente>${ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${esc(config.razon_social)}</razonSocial>
    ${nombreComercial}<ruc>${config.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${config.codigo_establecimiento.padStart(3,'0')}</estab>
    <ptoEmi>${config.punto_emision.padStart(3,'0')}</ptoEmi>
    <secuencial>${factura.numero_secuencial.padStart(9,'0')}</secuencial>
    <dirMatriz>${esc(config.direccion_matriz)}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${formatFechaXML(factura.fecha_emision)}</fechaEmision>
    <dirEstablecimiento>${esc(config.direccion_matriz)}</dirEstablecimiento>
    ${contribEspecial}<obligadoContabilidad>${obligado}</obligadoContabilidad>
    <tipoIdentificacionComprador>${CODIGO_TIPO_ID[comprador.tipo_identificacion] ?? '05'}</tipoIdentificacionComprador>
    <razonSocialComprador>${esc(comprador.tipo_identificacion === '07' ? 'CONSUMIDOR FINAL' : comprador.razon_social)}</razonSocialComprador>
    <identificacionComprador>${comprador.tipo_identificacion === '07' ? '9999999999999' : comprador.identificacion}</identificacionComprador>
    <totalSinImpuestos>${totalSinImpuestos}</totalSinImpuestos>
    <totalDescuento>${totalDescuento}</totalDescuento>
    <totalConImpuestos>${impuestosTotales}
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${importeTotal}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>01</formaPago>
        <total>${importeTotal}</total>
        <plazo>0</plazo>
        <unidadTiempo>dias</unidadTiempo>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>
${detallesXML}
  </detalles>
  <infoAdicional>
    ${comprador.email ? `<campoAdicional nombre="email">${esc(comprador.email)}</campoAdicional>` : ''}
    ${comprador.telefono ? `<campoAdicional nombre="telefono">${esc(comprador.telefono)}</campoAdicional>` : ''}
    ${comprador.direccion ? `<campoAdicional nombre="direccion">${esc(comprador.direccion)}</campoAdicional>` : ''}
    ${factura.notas ? `<campoAdicional nombre="notas">${esc(factura.notas)}</campoAdicional>` : ''}
  </infoAdicional>
</factura>`

  return xml
}
