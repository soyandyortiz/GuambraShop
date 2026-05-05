/**
 * Firma XAdES-BES para comprobantes electrónicos SRI Ecuador
 * Implementado con node-forge (RSA-SHA1 + C14N)
 *
 * Estructura basada en ANEXO 14 de la Ficha Técnica SRI v2.26:
 *   - 3 References en SignedInfo: SignedProperties → Certificate → comprobante
 *   - Prefijo etsi: para QualifyingProperties (igual al ejemplo oficial)
 *   - KeyInfo incluye X509Data + KeyValue (Modulus/Exponent)
 *   - SignedProperties incluye SignedDataObjectProperties con DataObjectFormat
 *   - C14N inclusivo: xmlns:ds y xmlns:etsi declarados en la raíz de SignedProperties
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
 * C14N simplificado: elimina la declaración XML y normaliza saltos de línea.
 * Suficiente para el esquema SRI donde los elementos no usan prefijos mixtos.
 */
function c14n(xml: string): string {
  return xml
    .replace(/^<\?xml[^?]*\?>\s*/m, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
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

export function firmarXML(xmlSinFirma: string, p12Buffer: Buffer, pin: string): string {
  const { privateKey, cert } = cargarP12(p12Buffer, pin)

  // --- Datos del certificado ---
  const certAsn1   = forge.pki.certificateToAsn1(cert)
  const certDerStr = forge.asn1.toDer(certAsn1).getBytes()
  const certDerB64 = Buffer.from(certDerStr, 'binary').toString('base64')
  const certDigestB64 = sha1BinaryB64(certDerStr)

  const issuerName = cert.issuer.attributes
    .map(a => `${a.shortName}=${a.value}`)
    .join(',')
  const serialNumberDecimal = BigInt('0x' + cert.serialNumber).toString(10)

  // Módulo y exponente RSA para KeyValue
  const rsaPub     = cert.publicKey as forge.pki.rsa.PublicKey
  const modulusB64 = Buffer.from(rsaPub.n.toByteArray()).toString('base64')
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

  const NS_DS   = 'http://www.w3.org/2000/09/xmldsig#'
  const NS_ETSI = 'http://uri.etsi.org/01903/v1.3.2#'

  // ─────────────────────────────────────────────────────────────────
  // 1. KeyInfo XML  (necesario para calcular su digest — Reference 2)
  // xmlns:ds declarado en el elemento raíz para que el C14N inclusivo
  // del SRI (que hereda xmlns:ds del Signature padre) produzca los
  // mismos bytes que nuestra versión standalone.
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // 2. SignedProperties XML  (Reference 1)
  // Prefijo etsi: (igual al ANEXO 14 de la Ficha Técnica SRI v2.26)
  // xmlns:ds declarado en el raíz para C14N inclusivo (heredado de Signature)
  // Namespace declarations en orden alfabético: xmlns:ds antes de xmlns:etsi
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // 3. Digest del documento (#comprobante)  — Reference 3
  // C14N elimina la declaración XML; el contenido es el <factura>
  // sin Signature (aún no insertada → enveloped-signature no tiene nada que quitar)
  // ─────────────────────────────────────────────────────────────────
  const docDigestB64 = sha1Utf8B64(c14n(xmlSinFirma))

  // ─────────────────────────────────────────────────────────────────
  // 4. SignedInfo con 3 References en el orden del ANEXO 14:
  //    1) SignedProperties  2) Certificate/KeyInfo  3) comprobante
  // Atributos en orden C14N alfabético en cada elemento.
  // ─────────────────────────────────────────────────────────────────
  const signedInfoXml = `<ds:SignedInfo xmlns:ds="${NS_DS}" Id="${sigInfoId}">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="${NS_DS}rsa-sha1"/>
  <ds:Reference Id="${refPropsId}" Type="${NS_ETSI}SignedProperties" URI="#${signedPropsId}">
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

  // ─────────────────────────────────────────────────────────────────
  // 5. Firma RSA-SHA1 del SignedInfo canonicalizado
  // ─────────────────────────────────────────────────────────────────
  const privateKeyPem     = forge.pki.privateKeyToPem(privateKey)
  const signatureValueB64 = rsaSha1Sign(c14n(signedInfoXml), privateKeyPem)

  // ─────────────────────────────────────────────────────────────────
  // 6. Elemento Signature completo
  // ─────────────────────────────────────────────────────────────────
  const signatureXml = `<ds:Signature xmlns:ds="${NS_DS}" xmlns:etsi="${NS_ETSI}" Id="${sigId}">
  ${signedInfoXml}
  <ds:SignatureValue Id="${sigValueId}">
${signatureValueB64}
  </ds:SignatureValue>
  ${keyInfoXml}
  <ds:Object Id="${objectId}">
    <etsi:QualifyingProperties Target="#${sigId}">
      ${signedPropertiesXml}
    </etsi:QualifyingProperties>
  </ds:Object>
</ds:Signature>`

  return xmlSinFirma.replace(/<\/factura>\s*$/, `${signatureXml}\n</factura>`)
}
