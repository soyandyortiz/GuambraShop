/**
 * Firma XAdES-BES para comprobantes electrónicos SRI Ecuador
 * Implementado con node-forge (RSA-SHA1 + C14N Inclusive)
 *
 * Estructura según ANEXO 14 de la Ficha Técnica SRI v2.26:
 *   - xmlns:ds solo en <ds:Signature>
 *   - xmlns:etsi solo en <etsi:QualifyingProperties>
 *   - 3 References en SignedInfo: SignedProperties → KeyInfo → comprobante
 *   - Type de SignedProperties Reference: http://uri.etsi.org/01903#SignedProperties (sin versión)
 *   - C14N Inclusive: expande elementos vacíos <foo/> → <foo></foo>
 */

import forge from 'node-forge'
import { createHash, createSign } from 'crypto'

export function cargarP12(p12Buffer: Buffer, pin: string): {
  privateKey: forge.pki.rsa.PrivateKey
  cert: forge.pki.Certificate
} {
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
  const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pin)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('No se encontró clave privada en el .p12')
  const privateKey = keyBag.key as forge.pki.rsa.PrivateKey

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag  = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No se encontró certificado en el .p12')

  return { privateKey, cert: certBag.cert }
}

/**
 * C14N Inclusive (W3C REC xml-c14n-20010315):
 *  1. Elimina la declaración XML
 *  2. Normaliza saltos de línea → LF
 *  3. Expande elementos vacíos auto-cerrados <foo attr="x"/> → <foo attr="x"></foo>
 *
 * El SRI valida los hashes sobre la forma canónica — sin expansión los hashes no coinciden.
 */
function c14n(xml: string): string {
  return xml
    .replace(/^<\?xml[^?]*\?>\s*/m, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<([\w:]+)(\s[^>]*)?\s*\/>/g, (_, tag, attrs) => `<${tag}${attrs ?? ''}></${tag}>`)
}

function sha1Utf8B64(text: string): string {
  return createHash('sha1').update(text, 'utf8').digest('base64')
}

function sha1BinaryB64(binaryStr: string): string {
  return createHash('sha1').update(Buffer.from(binaryStr, 'binary')).digest('base64')
}

function rsaSha1Sign(data: string, privateKeyPem: string): string {
  const sign = createSign('RSA-SHA1')
  sign.update(data, 'utf8')
  return sign.sign(privateKeyPem, 'base64')
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

export function firmarXML(xmlSinFirma: string, p12Buffer: Buffer, pin: string): string {
  const { privateKey, cert } = cargarP12(p12Buffer, pin)

  // --- Datos del certificado ---
  const certAsn1      = forge.pki.certificateToAsn1(cert)
  const certDerStr    = forge.asn1.toDer(certAsn1).getBytes()
  const certDerB64    = Buffer.from(certDerStr, 'binary').toString('base64')
  const certDigestB64 = sha1BinaryB64(certDerStr)

  // IssuerName en formato RFC 2253 (coma + espacio, tal como lo valida el SRI)
  const issuerName = cert.issuer.attributes
    .map(a => `${a.shortName}=${a.value}`)
    .join(', ')

  const serialNumberDecimal = BigInt('0x' + cert.serialNumber).toString(10)

  // Módulo y exponente RSA — strip del byte de signo 0x00 que agrega forge
  const rsaPub      = cert.publicKey as forge.pki.rsa.PublicKey
  const nBytes      = rsaPub.n.toByteArray()
  const modulusB64  = Buffer.from(nBytes[0] === 0 ? nBytes.slice(1) : nBytes).toString('base64')
  const exponentB64 = Buffer.from(rsaPub.e.toByteArray()).toString('base64')

  const signingTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  const ts            = Date.now()
  const sigId         = `Signature${ts}`
  const sigInfoId     = `Signature-SignedInfo${ts}`
  const sigValueId    = `SignatureValue${ts}`
  const keyInfoId     = `Certificate${ts}`
  const signedPropsId = `${sigId}-SignedProperties${ts}`
  const objectId      = `${sigId}-Object${ts}`
  const refDocId      = `Reference-ID-${ts}`
  const refPropsId    = `SignedPropertiesID${ts}`

  const NS_DS        = 'http://www.w3.org/2000/09/xmldsig#'
  const NS_ETSI      = 'http://uri.etsi.org/01903/v1.3.2#'
  // El Type de la Reference a SignedProperties usa la URI SIN la versión
  const TYPE_SP      = 'http://uri.etsi.org/01903#SignedProperties'

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Digest del documento (#comprobante)  ← Reference 3
  //    El enveloped-signature transform elimina el elemento Signature.
  //    Como todavía no se ha insertado, hasheamos el XML original directamente.
  // ─────────────────────────────────────────────────────────────────────────
  const docDigestB64 = sha1Utf8B64(c14n(xmlSinFirma))

  // ─────────────────────────────────────────────────────────────────────────
  // 2. KeyInfo  ← Reference 2
  //    xmlns:ds declarado aquí porque el SRI hace C14N de este elemento
  //    incluyendo los namespaces en scope (xmlns:ds viene de Signature padre).
  // ─────────────────────────────────────────────────────────────────────────
  const keyInfoXml = `<ds:KeyInfo xmlns:ds="${NS_DS}" Id="${keyInfoId}">
  <ds:X509Data>
    <ds:X509Certificate>
${certDerB64}
    </ds:X509Certificate>
  </ds:X509Data>
  <ds:KeyValue>
    <ds:RSAKeyValue>
      <ds:Modulus>${modulusB64}</ds:Modulus>
      <ds:Exponent>${exponentB64}</ds:Exponent>
    </ds:RSAKeyValue>
  </ds:KeyValue>
</ds:KeyInfo>`

  const keyInfoDigestB64 = sha1Utf8B64(c14n(keyInfoXml))

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SignedProperties  ← Reference 1
  //    xmlns:ds y xmlns:etsi en scope (ds de Signature, etsi de QualifyingProperties)
  // ─────────────────────────────────────────────────────────────────────────
  const signedPropertiesXml = `<etsi:SignedProperties xmlns:ds="${NS_DS}" xmlns:etsi="${NS_ETSI}" Id="${signedPropsId}">
  <etsi:SignedSignatureProperties>
    <etsi:SigningTime>${signingTime}</etsi:SigningTime>
    <etsi:SigningCertificate>
      <etsi:Cert>
        <etsi:CertDigest>
          <ds:DigestMethod Algorithm="${NS_DS}sha1"/>
          <ds:DigestValue>${certDigestB64}</ds:DigestValue>
        </etsi:CertDigest>
        <etsi:IssuerSerial>
          <ds:X509IssuerName>${issuerName}</ds:X509IssuerName>
          <ds:X509SerialNumber>${serialNumberDecimal}</ds:X509SerialNumber>
        </etsi:IssuerSerial>
      </etsi:Cert>
    </etsi:SigningCertificate>
  </etsi:SignedSignatureProperties>
  <etsi:SignedDataObjectProperties>
    <etsi:DataObjectFormat ObjectReference="#${refDocId}">
      <etsi:Description>contenido comprobante</etsi:Description>
      <etsi:MimeType>text/xml</etsi:MimeType>
    </etsi:DataObjectFormat>
  </etsi:SignedDataObjectProperties>
</etsi:SignedProperties>`

  const signedPropsDigestB64 = sha1Utf8B64(c14n(signedPropertiesXml))

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SignedInfo — 3 References en orden del ANEXO 14:
  //    1) SignedProperties  2) KeyInfo/Certificate  3) comprobante
  //    TYPE_SP usa la URI sin versión: http://uri.etsi.org/01903#SignedProperties
  // ─────────────────────────────────────────────────────────────────────────
  const signedInfoXml = `<ds:SignedInfo xmlns:ds="${NS_DS}" Id="${sigInfoId}">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="${NS_DS}rsa-sha1"/>
  <ds:Reference Id="${refPropsId}" Type="${TYPE_SP}" URI="#${signedPropsId}">
    <ds:DigestMethod Algorithm="${NS_DS}sha1"/>
    <ds:DigestValue>${signedPropsDigestB64}</ds:DigestValue>
  </ds:Reference>
  <ds:Reference URI="#${keyInfoId}">
    <ds:DigestMethod Algorithm="${NS_DS}sha1"/>
    <ds:DigestValue>${keyInfoDigestB64}</ds:DigestValue>
  </ds:Reference>
  <ds:Reference Id="${refDocId}" URI="#comprobante">
    <ds:Transforms>
      <ds:Transform Algorithm="${NS_DS}enveloped-signature"/>
    </ds:Transforms>
    <ds:DigestMethod Algorithm="${NS_DS}sha1"/>
    <ds:DigestValue>${docDigestB64}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Valor de firma RSA-SHA1 sobre el SignedInfo canonicalizado
  // ─────────────────────────────────────────────────────────────────────────
  const privateKeyPem     = forge.pki.privateKeyToPem(privateKey)
  const signatureValueB64 = rsaSha1Sign(c14n(signedInfoXml), privateKeyPem)

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Elemento Signature completo
  //    - xmlns:ds solo en <ds:Signature> (estructura oficial SRI)
  //    - xmlns:etsi solo en <etsi:QualifyingProperties> (estructura oficial SRI)
  // ─────────────────────────────────────────────────────────────────────────
  const signatureXml = `<ds:Signature xmlns:ds="${NS_DS}" Id="${sigId}">
  ${signedInfoXml}
  <ds:SignatureValue Id="${sigValueId}">
${signatureValueB64}
  </ds:SignatureValue>
  ${keyInfoXml}
  <ds:Object Id="${objectId}">
    <etsi:QualifyingProperties xmlns:etsi="${NS_ETSI}" Target="#${sigId}">
      ${signedPropertiesXml}
    </etsi:QualifyingProperties>
  </ds:Object>
</ds:Signature>`

  // Insertar antes del cierre del elemento raíz (factura o notaCredito)
  return xmlSinFirma
    .replace(/<\/factura>\s*$/, `${signatureXml}\n</factura>`)
    .replace(/<\/notaCredito>\s*$/, `${signatureXml}\n</notaCredito>`)
}
