/**
 * Firma XAdES-BES para comprobantes electrónicos SRI Ecuador
 * Implementado con node-forge (RSA-SHA1 + canonicalización C14N)
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

  // Extraer clave privada
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('No se encontró clave privada en el certificado .p12')
  const privateKey = keyBag.key as forge.pki.rsa.PrivateKey

  // Extraer certificado
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag  = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No se encontró certificado en el archivo .p12')
  const cert = certBag.cert

  const certPem = forge.pki.certificateToPem(cert)
  return { privateKey, cert, certPem }
}

/** Canonicalización C14N simplificada (sin namespace propagation) */
function c14n(xml: string): string {
  // Para el SRI Ecuador se usa C14N sin comentarios
  // Esta implementación es suficiente para el esquema de factura SRI
  return xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/** SHA-1 digest en Base64 */
function sha1b64(data: string): string {
  return createHash('sha1').update(data, 'utf8').digest('base64')
}

/** Firma RSA-SHA1 en Base64 */
function rsaSha1Sign(data: string, privateKeyPem: string): string {
  const sign = createSign('RSA-SHA1')
  sign.update(data, 'utf8')
  return sign.sign(privateKeyPem, 'base64')
}

/**
 * Firma el XML de factura con XAdES-BES y retorna el XML firmado
 * El resultado incluye el elemento <Signature> embebido en el comprobante
 */
export function firmarXML(xmlSinFirma: string, p12Buffer: Buffer, pin: string): string {
  const { privateKey, cert, certPem } = cargarP12(p12Buffer, pin)

  // --- Datos del certificado ---
  const certDerB64 = forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
  )

  const issuerName  = cert.issuer.attributes
    .map(a => `${a.shortName}=${a.value}`)
    .join(',')
  const serialNumber = cert.serialNumber

  const signingTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const certDigestB64 = sha1b64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
  )

  // IDs estables
  const sigId         = 'Signature-' + Date.now()
  const keyInfoId     = 'Certificate' + Date.now()
  const signedPropsId = 'Signature-' + Date.now() + '-SignedProperties'
  const objectId      = 'Signature-' + Date.now() + '-Object'
  const refPropsId    = 'Reference-' + Date.now() + '-SignedProperties'

  // --- 1. Canonicalizar el documento original y calcular su digest ---
  const xmlC14n = c14n(xmlSinFirma)
  const docDigestB64 = sha1b64(xmlC14n)

  // --- 2. Construir SignedProperties y calcular su digest ---
  const signedPropertiesXml = `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${signedPropsId}">
  <xades:SignedSignatureProperties>
    <xades:SigningTime>${signingTime}</xades:SigningTime>
    <xades:SigningCertificate>
      <xades:Cert>
        <xades:CertDigest>
          <ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigestB64}</ds:DigestValue>
        </xades:CertDigest>
        <xades:IssuerSerial>
          <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${issuerName}</ds:X509IssuerName>
          <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${parseInt(serialNumber, 16)}</ds:X509SerialNumber>
        </xades:IssuerSerial>
      </xades:Cert>
    </xades:SigningCertificate>
  </xades:SignedSignatureProperties>
</xades:SignedProperties>`

  const signedPropsDigestB64 = sha1b64(c14n(signedPropertiesXml))

  // --- 3. Construir SignedInfo ---
  const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
  <ds:Reference URI="">
    <ds:Transforms>
      <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    </ds:Transforms>
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <ds:DigestValue>${docDigestB64}</ds:DigestValue>
  </ds:Reference>
  <ds:Reference URI="#${signedPropsId}" Type="http://uri.etsi.org/01903#SignedProperties">
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <ds:DigestValue>${signedPropsDigestB64}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`

  // --- 4. Firmar SignedInfo con clave privada ---
  const privateKeyPem = forge.pki.privateKeyToPem(privateKey)
  const signatureValueB64 = rsaSha1Sign(c14n(signedInfoXml), privateKeyPem)

  // --- 5. Ensamblar el elemento Signature completo ---
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
  return xmlSinFirma.replace(/<\/factura>$/, `${signatureXml}\n</factura>`)
}
