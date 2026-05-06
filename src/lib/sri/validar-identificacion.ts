/**
 * Validación de identificaciones tributarias Ecuador — SRI
 * Cubre: cédula, RUC persona natural, RUC sociedad privada,
 *        RUC entidad pública, pasaporte y consumidor final.
 */

// ─── Cédula (10 dígitos, módulo 10) ──────────────────────────

export function validarCedula(valor: string): boolean {
  if (!/^\d{10}$/.test(valor)) return false

  const provincia = parseInt(valor.slice(0, 2), 10)
  if (provincia < 1 || provincia > 24) return false

  const tercero = parseInt(valor[2], 10)
  if (tercero > 5) return false           // Solo personas naturales

  const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let p = parseInt(valor[i], 10) * coefs[i]
    if (p > 9) p -= 9
    suma += p
  }
  const verificador = (10 - (suma % 10)) % 10
  return verificador === parseInt(valor[9], 10)
}

// ─── RUC persona natural (13 dígitos, 3.° dígito 0-5) ────────

function validarRucNatural(valor: string): boolean {
  if (!/^\d{13}$/.test(valor)) return false
  if (!validarCedula(valor.slice(0, 10))) return false
  return parseInt(valor.slice(10), 10) >= 1   // sufijo ≥ 001
}

// ─── RUC sociedad privada (13 dígitos, 3.° dígito = 9) ───────

function validarRucSociedad(valor: string): boolean {
  if (!/^\d{13}$/.test(valor)) return false

  const provincia = parseInt(valor.slice(0, 2), 10)
  if (provincia < 1 || provincia > 24) return false
  if (parseInt(valor[2], 10) !== 9) return false

  // Módulo 11 sobre los primeros 9 dígitos
  const coefs = [4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  for (let i = 0; i < 9; i++) suma += parseInt(valor[i], 10) * coefs[i]
  const residuo = suma % 11
  const verificador = residuo === 0 ? 0 : 11 - residuo
  if (verificador !== parseInt(valor[9], 10)) return false

  return parseInt(valor.slice(10), 10) >= 1
}

// ─── RUC entidad pública (13 dígitos, 3.° dígito = 6) ────────

function validarRucPublico(valor: string): boolean {
  if (!/^\d{13}$/.test(valor)) return false

  const provincia = parseInt(valor.slice(0, 2), 10)
  if (provincia < 1 || provincia > 24) return false
  if (parseInt(valor[2], 10) !== 6) return false

  // Módulo 11 sobre los primeros 8 dígitos
  const coefs = [3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  for (let i = 0; i < 8; i++) suma += parseInt(valor[i], 10) * coefs[i]
  const residuo = suma % 11
  const verificador = residuo === 0 ? 0 : 11 - residuo
  if (verificador !== parseInt(valor[8], 10)) return false

  return parseInt(valor.slice(9), 10) >= 1
}

// ─── RUC genérico (delega según 3.° dígito) ──────────────────

export function validarRUC(valor: string): boolean {
  if (!/^\d{13}$/.test(valor)) return false
  const tercero = parseInt(valor[2], 10)
  if (tercero <= 5) return validarRucNatural(valor)
  if (tercero === 6) return validarRucPublico(valor)
  if (tercero === 9) return validarRucSociedad(valor)
  return false
}

// ─── Pasaporte ────────────────────────────────────────────────

export function validarPasaporte(valor: string): boolean {
  return /^[A-Z0-9]{5,20}$/i.test(valor.trim())
}

// ─── Función principal ────────────────────────────────────────

type TipoSRI = 'cedula' | 'ruc' | 'pasaporte' | 'consumidor_final'

export function validarIdentificacion(
  tipo: TipoSRI,
  valor: string,
): { valido: boolean; mensaje?: string } {
  if (tipo === 'consumidor_final') return { valido: true }

  const v = valor.trim()

  switch (tipo) {
    case 'cedula':
      if (!/^\d{10}$/.test(v))
        return { valido: false, mensaje: 'La cédula debe tener exactamente 10 dígitos' }
      if (!validarCedula(v))
        return { valido: false, mensaje: 'Cédula inválida — verifica el dígito verificador' }
      return { valido: true }

    case 'ruc':
      if (!/^\d{13}$/.test(v))
        return { valido: false, mensaje: 'El RUC debe tener exactamente 13 dígitos' }
      if (!validarRUC(v))
        return { valido: false, mensaje: 'RUC inválido — verifica el dígito verificador' }
      return { valido: true }

    case 'pasaporte':
      if (!validarPasaporte(v))
        return { valido: false, mensaje: 'Pasaporte inválido — solo letras y números, 5 a 20 caracteres' }
      return { valido: true }

    default:
      return { valido: false, mensaje: 'Tipo de identificación desconocido' }
  }
}
