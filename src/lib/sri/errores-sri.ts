/** Códigos de error del SRI Ecuador → mensajes amigables */
const TABLA: Record<string, string> = {
  '15': 'Estructura del XML inválida',
  '18': 'Certificado digital vencido o inválido',
  '29': 'Clave de acceso no corresponde a este emisor',
  '35': 'Fecha de emisión fuera del período permitido (máx. 30 días)',
  '40': 'Comprobante ya registrado anteriormente',
  '43': 'Clave de acceso ya registrada en el SRI',
  '45': 'RUC del emisor inválido o no autorizado para emitir',
  '65': 'Error en la firma electrónica del comprobante',
  '70': 'RUC del emisor no válido',
  '72': 'Clave de acceso no pertenece al emisor',
}

type MensajeSRI = { identificador: string; mensaje: string; informacionAdicional?: string }

/** Convierte el array de mensajes SRI a texto legible para el usuario */
export function traducirMensajesSRI(mensajes: MensajeSRI[]): string {
  if (mensajes.length === 0) return 'Error desconocido del SRI'
  return mensajes.map(m => {
    const descripcion = TABLA[m.identificador] ?? m.mensaje
    const detalle = m.informacionAdicional ? ` — ${m.informacionAdicional}` : ''
    return `${descripcion}${detalle}`
  }).join(' | ')
}

/** Devuelve true si algún mensaje indica clave de acceso duplicada (error 43) */
export function esClaveDuplicada(mensajes: Pick<MensajeSRI, 'identificador'>[]): boolean {
  return mensajes.some(m => m.identificador === '43')
}
