/**
 * Comunicación SOAP con los servicios web del SRI Ecuador
 * Endpoints:
 *   Pruebas:    https://celcer.sri.gob.ec/comprobantes-electronicos-ws/
 *   Producción: https://cel.sri.gob.ec/comprobantes-electronicos-ws/
 */

const ENDPOINTS = {
  pruebas: {
    recepcion:    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
  produccion: {
    recepcion:    'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
}

export type RespuestaRecepcion = {
  ok: boolean
  estado: 'RECIBIDA' | 'DEVUELTA'
  mensajes: { identificador: string; mensaje: string; tipo: string }[]
}

export type RespuestaAutorizacion = {
  ok: boolean
  estado: 'AUTORIZADO' | 'NO AUTORIZADO'
  numeroAutorizacion: string | null
  fechaAutorizacion: string | null
  ambiente: string | null
  mensajes: { identificador: string; mensaje: string; tipo: string; informacionAdicional?: string }[]
  xmlAutorizado: string | null
}

/** Convierte el XML firmado a Base64 para envío SOAP */
function xmlToBase64(xml: string): string {
  return Buffer.from(xml, 'utf8').toString('base64')
}

/** Parsea la respuesta SOAP de recepción */
function parsearRespuestaRecepcion(soapXml: string): RespuestaRecepcion {
  const estadoMatch = soapXml.match(/<estado>([^<]+)<\/estado>/)
  const estado = (estadoMatch?.[1] ?? 'DEVUELTA') as 'RECIBIDA' | 'DEVUELTA'

  const mensajes: RespuestaRecepcion['mensajes'] = []
  const mensajesMatch = soapXml.matchAll(/<mensaje>([\s\S]*?)<\/mensaje>/g)
  for (const m of mensajesMatch) {
    const bloque = m[1]
    mensajes.push({
      identificador: bloque.match(/<identificador>([^<]+)<\/identificador>/)?.[1] ?? '',
      mensaje:       bloque.match(/<mensaje>([^<]+)<\/mensaje>/)?.[1] ?? bloque.match(/<descripcion>([^<]+)<\/descripcion>/)?.[1] ?? '',
      tipo:          bloque.match(/<tipo>([^<]+)<\/tipo>/)?.[1] ?? 'ERROR',
    })
  }

  return { ok: estado === 'RECIBIDA', estado, mensajes }
}

/** Parsea la respuesta SOAP de autorización */
function parsearRespuestaAutorizacion(soapXml: string): RespuestaAutorizacion {
  const authMatch = soapXml.match(/<autorizacion>([\s\S]*?)<\/autorizacion>/)
  if (!authMatch) {
    return { ok: false, estado: 'NO AUTORIZADO', numeroAutorizacion: null, fechaAutorizacion: null, ambiente: null, mensajes: [], xmlAutorizado: null }
  }

  const bloque = authMatch[1]
  const estado = (bloque.match(/<estado>([^<]+)<\/estado>/)?.[1] ?? 'NO AUTORIZADO') as 'AUTORIZADO' | 'NO AUTORIZADO'
  const numeroAutorizacion = bloque.match(/<numeroAutorizacion>([^<]+)<\/numeroAutorizacion>/)?.[1] ?? null
  const fechaAutorizacion  = bloque.match(/<fechaAutorizacion>([^<]+)<\/fechaAutorizacion>/)?.[1] ?? null
  const ambiente           = bloque.match(/<ambiente>([^<]+)<\/ambiente>/)?.[1] ?? null

  const mensajes: RespuestaAutorizacion['mensajes'] = []
  const mensajesMatch = soapXml.matchAll(/<mensaje>([\s\S]*?)<\/mensaje>/g)
  for (const m of mensajesMatch) {
    const mb = m[1]
    mensajes.push({
      identificador:      mb.match(/<identificador>([^<]+)<\/identificador>/)?.[1] ?? '',
      mensaje:            mb.match(/<mensaje>([^<]+)<\/mensaje>/)?.[1] ?? mb.match(/<descripcion>([^<]+)<\/descripcion>/)?.[1] ?? '',
      tipo:               mb.match(/<tipo>([^<]+)<\/tipo>/)?.[1] ?? 'INFORMATIVO',
      informacionAdicional: mb.match(/<informacionAdicional>([^<]+)<\/informacionAdicional>/)?.[1],
    })
  }

  // Extraer el XML autorizado (comprobante devuelto por el SRI)
  const compMatch = soapXml.match(/<comprobante><!\[CDATA\[([\s\S]*?)\]\]><\/comprobante>/)
  const xmlAutorizado = compMatch?.[1] ?? null

  return { ok: estado === 'AUTORIZADO', estado, numeroAutorizacion, fechaAutorizacion, ambiente, mensajes, xmlAutorizado }
}

/** Envía el comprobante al SRI (RecepcionComprobantesOffline) */
export async function enviarComprobante(
  xmlFirmado: string,
  ambiente: 'pruebas' | 'produccion'
): Promise<RespuestaRecepcion> {
  const url = ENDPOINTS[ambiente].recepcion
  const xmlB64 = xmlToBase64(xmlFirmado)

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${xmlB64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: soapBody,
    signal: AbortSignal.timeout(30_000),
  })

  const text = await response.text()
  return parsearRespuestaRecepcion(text)
}

/** Consulta la autorización al SRI (AutorizacionComprobantesOffline) */
export async function consultarAutorizacion(
  claveAcceso: string,
  ambiente: 'pruebas' | 'produccion'
): Promise<RespuestaAutorizacion> {
  const url = ENDPOINTS[ambiente].autorizacion

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: soapBody,
    signal: AbortSignal.timeout(30_000),
  })

  const text = await response.text()
  return parsearRespuestaAutorizacion(text)
}

/** Flujo completo: recepción → espera → autorización */
export async function emitirAlSRI(
  xmlFirmado: string,
  claveAcceso: string,
  ambiente: 'pruebas' | 'produccion'
): Promise<{ recepcion: RespuestaRecepcion; autorizacion: RespuestaAutorizacion | null }> {
  const recepcion = await enviarComprobante(xmlFirmado, ambiente)

  if (!recepcion.ok) {
    return { recepcion, autorizacion: null }
  }

  // Esperar 3 segundos antes de consultar autorización (tiempo mínimo recomendado por SRI)
  await new Promise(r => setTimeout(r, 3000))

  const autorizacion = await consultarAutorizacion(claveAcceso, ambiente)
  return { recepcion, autorizacion }
}
