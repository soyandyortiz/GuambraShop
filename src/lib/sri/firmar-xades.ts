/**
 * Firma XAdES-BES para comprobantes electrónicos SRI Ecuador
 *
 * Usa la librería `ec-sri-invoice-signer` — implementación TypeScript pura
 * probada y validada contra los web services del SRI en producción.
 *
 * Soporta: facturas (01), notas de crédito (04), notas de débito (05),
 * guías de remisión (06), comprobantes de retención (07).
 */

import forge from 'node-forge'
import { signInvoiceXml, signCreditNoteXml } from 'ec-sri-invoice-signer'

/**
 * Firma un XML de factura electrónica con XAdES-BES.
 *
 * @param xmlSinFirma - XML del comprobante sin firma (con id="comprobante")
 * @param p12Buffer   - Contenido binario del archivo .p12
 * @param pin         - Contraseña del certificado .p12
 * @returns XML firmado listo para enviar al SRI
 */
export function firmarXML(xmlSinFirma: string, p12Buffer: Buffer, pin: string): string {
  // ec-sri-invoice-signer acepta Buffer o string base64
  return signInvoiceXml(xmlSinFirma, p12Buffer, { pkcs12Password: pin })
}

/**
 * Firma un XML de nota de crédito electrónica con XAdES-BES.
 */
export function firmarXMLNotaCredito(xmlSinFirma: string, p12Buffer: Buffer, pin: string): string {
  return signCreditNoteXml(xmlSinFirma, p12Buffer, { pkcs12Password: pin })
}

/** Lee la fecha de expiración del certificado desde el .p12 sin necesidad de firmar */
export function leerExpiracionCert(
  p12Buffer: Buffer,
  pin: string,
): { expiry: Date; cn: string } | null {
  try {
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
    const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pin)
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag  = certBags[forge.pki.oids.certBag]?.[0]
    if (!certBag?.cert) return null
    return {
      expiry: certBag.cert.validity.notAfter,
      cn:     certBag.cert.subject.getField('CN')?.value ?? '',
    }
  } catch {
    return null
  }
}
