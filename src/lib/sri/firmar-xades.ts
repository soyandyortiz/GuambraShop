/**
 * Firma XAdES-BES para comprobantes electrónicos SRI Ecuador
 * Implementado con node-forge (RSA-SHA1 + canonicalización C14N)
 *
 * Estructura requerida por el SRI:
 *   - Reference URI="#comprobante" (el id del elemento <factura>)
 *   - CanonicalizationMethod: C14N sin comentarios
 *   - SignatureMethod: RSA-SHA1
 *   - Digest del comprobante: SHA-1 del XML sin la declaración <?xml?>
 *   - Digest del certificado: SHA-1 de los bytes DER (encoding binary)
 */

import forge from 'node-forge'
import { createHash, createSign } from 'crypto'

/** Carga el certificado .p12 y extrae clave privada + cadena de certificados */
export function cargarP12(p12Buffer: Buffer, pin: string): {
  privateKey: forge.pki.rsa.PrivateKey
  cert: forge.pki.Certificate
  certPem: string
} {
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pin)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('No se encontró clave privada en el certificado .p12')
  const privateKey = keyBag.key as forge.pki.rsa.PrivateKey

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag  = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No se encontró certificado en el archivo .p12')
  const cert = certBag.cert

  const certPem = forge.pki.certificateToPem(cert)
  return { privateKey, cert, certPem }
}

/**
 * C14N simplificado: elimina la declaración XML y normaliza saltos de línea.
 * El SRI Ecuador acepta este nivel de canonicalización para el documento
 * principal dado que <factura> no usa prefijos de namespace.
 */
function c14n(xml: string): string {
  return xml
    .replace(/^<\?xml[^?]*\?>\s*/m, '')  // elimina declaración XML (C14N la excluye)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/** SHA-1 de texto UTF-8, resultado en Base64 */
function sha1Utf8B64(text: string): string {
  return createHash('sha1').update(text, 'utf8').digest('base64')
}

/** SHA-1 de bytes binarios (DER), resultado en Base64 */
function sha1BinaryB64(binaryStr: string): string {
  return createHash('sha1').update(Buffer.from(binaryStr, 'binary')).digest('base64')
}

/** Firma RSA-SHA1 en Base64 */
function rsaSha1Sign(data: string, privateKeyPem: string): string {
  const sign = createSign('RSA-SHA1')
  sign.update(data, 'utf8')
  return sign.sign(privateKeyPem, 'base64')
}

/**
 * Firma el XML de factura con XAdES-BES y retorna el XML firmado.
 * El elemento <ds:Signature> se inserta dentro de <factura> antes de </factura>.
 */
export function firmarXML(xmlSinFirma: string, p12Buffer: Buffer, pin: string): string {
  const { privateKey, cert, certPem } = cargarP12(p12Buffer, pin)

  // --- Datos del certificado ---
  const certAsn1   = forge.pki.certificateToAsn1(cert)
  const certDerStr = forge.asn1.toDer(certAsn1).getBytes()           // binary string
  const certDerB64 = Buffer.from(certDerStr, 'binary').toString('base64')
  const certDigestB64 = sha1BinaryB64(certDerStr)                    // SHA-1 sobre bytes DER

  const issuerName = cert.issuer.attributes
    .map(a => `${a.shortName}=${a.value}`)
    .join(',')
  // El número de serie en el SRI va en decimal
  const serialNumberDecimal = BigInt('0x' + cert.serialNumber).toString(10)

  const signingTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  // IDs estables con el mismo timestamp
  const ts            = Date.now()
  const sigId         = `Signature-${ts}`
  const keyInfoId     = `Certificate${ts}`
  const signedPropsId = `${sigId}-SignedProperties`
  const objectId      = `${sigId}-Object`

  // --- 1. Digest del comprobante (URI="#comprobante") ---
  // C14N elimina la declaración XML; el contenido es el <factura> sin Signature
  // (la Signature no existe aún → el enveloped-signature transform no tiene nada que quitar)
  const xmlC14n       = c14n(xmlSinFirma)
  const docDigestB64  = sha1Utf8B64(xmlC14n)

  // --- 2. SignedProperties y su digest ---
  // xmlns:ds se declara en el raíz (no en hijos) para que el C14N inclusivo
  // del SRI produzca los mismos bytes que nuestra versión standalone.
  // Los namespaces van ordenados alfabéticamente: xmlns:ds antes de xmlns:xades.
  const signedPropertiesXml = `<xades:SignedProperties xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${signedPropsId}">
  <xades:SignedSignatureProperties>
    <xades:SigningTime>${signingTime}</xades:SigningTime>
    <xades:SigningCertificate>
      <xades:Cert>
        <xades:CertDigest>
          <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <ds:DigestValue>${certDigestB64}</ds:DigestValue>
        </xades:CertDigest>
        <xades:IssuerSerial>
          <ds:X509IssuerName>${issuerName}</ds:X509IssuerName>
          <ds:X509SerialNumber>${serialNumberDecimal}</ds:X509SerialNumber>
        </xades:IssuerSerial>
      </xades:Cert>
    </xades:SigningCertificate>
  </xades:SignedSignatureProperties>
</xades:SignedProperties>`

  const signedPropsDigestB64 = sha1Utf8B64(c14n(signedPropertiesXml))

  // --- 3. SignedInfo ---
  const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
  <ds:Reference Id="Reference-${ts}" URI="#comprobante">
    <ds:Transforms>
      <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    </ds:Transforms>
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <ds:DigestValue>${docDigestB64}</ds:DigestValue>
  </ds:Reference>
  <ds:Reference Id="Reference-${ts}-SignedProperties" Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropsId}">
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <ds:DigestValue>${signedPropsDigestB64}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`

  // --- 4. Firma RSA-SHA1 del SignedInfo canonicalizado ---
  const privateKeyPem     = forge.pki.privateKeyToPem(privateKey)
  const signatureValueB64 = rsaSha1Sign(c14n(signedInfoXml), privateKeyPem)

  // --- 5. Elemento Signature completo ---
  const signatureXml = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${sigId}">
  ${signedInfoXml}
  <ds:SignatureValue Id="${sigId}-SignatureValue">
${signatureValueB64}
  </ds:SignatureValue>
  <ds:KeyInfo Id="${keyInfoId}">
    <ds:X509Data>
      <ds:X509Certificate>
${certDerB64}
      </ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
  <ds:Object Id="${objectId}">
    <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${sigId}">
      ${signedPropertiesXml}
    </xades:QualifyingProperties>
  </ds:Object>
</ds:Signature>`

  // --- 6. Insertar la firma antes del cierre del elemento raíz ---
  return xmlSinFirma.replace(/<\/factura>\s*$/, `${signatureXml}\n</factura>`)
}
