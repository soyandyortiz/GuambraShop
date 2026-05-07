/**
 * Script de prueba local para validar que la firma XAdES-BES funciona
 * con el certificado .p12 del proyecto.
 *
 * Uso: npx tsx scripts/test-firma.ts
 */

import fs from 'fs'
import path from 'path'
import { signInvoiceXml } from 'ec-sri-invoice-signer'

// Buscar el .p12 en la raíz del proyecto
const root = path.resolve(__dirname, '..')
const p12Files = fs.readdirSync(root).filter(f => f.endsWith('.p12'))
if (p12Files.length === 0) {
  console.error('❌ No se encontró archivo .p12 en la raíz del proyecto')
  process.exit(1)
}

const p12Path = path.join(root, p12Files[0])
console.log(`📜 Certificado: ${p12Files[0]}`)

const p12Buffer = fs.readFileSync(p12Path)

// PIN del certificado — ajustar si es diferente
const PIN = process.argv[2] || ''

// XML de prueba mínimo con la estructura que genera el sistema
const xmlPrueba = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
  <infoTributaria>
    <ambiente>1</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>PRUEBA FIRMA</razonSocial>
    <ruc>0000000000001</ruc>
    <claveAcceso>0705202601000000000011001001000000001000000011</claveAcceso>
    <codDoc>01</codDoc>
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>000000001</secuencial>
    <dirMatriz>DIRECCION TEST</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>07/05/2026</fechaEmision>
    <dirEstablecimiento>DIRECCION TEST</dirEstablecimiento>
    <obligadoContabilidad>NO</obligadoContabilidad>
    <tipoIdentificacionComprador>07</tipoIdentificacionComprador>
    <razonSocialComprador>CONSUMIDOR FINAL</razonSocialComprador>
    <identificacionComprador>9999999999999</identificacionComprador>
    <totalSinImpuestos>10.00</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>0</codigoPorcentaje>
        <baseImponible>10.00</baseImponible>
        <valor>0.00</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>10.00</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>01</formaPago>
        <total>10.00</total>
        <plazo>0</plazo>
        <unidadTiempo>dias</unidadTiempo>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>
    <detalle>
      <codigoPrincipal>001</codigoPrincipal>
      <descripcion>PRODUCTO DE PRUEBA</descripcion>
      <cantidad>1.000000</cantidad>
      <precioUnitario>10.000000</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>10.00</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>0</codigoPorcentaje>
          <tarifa>0</tarifa>
          <baseImponible>10.00</baseImponible>
          <valor>0.00</valor>
        </impuesto>
      </impuestos>
    </detalle>
  </detalles>
  <infoAdicional>
    <campoAdicional nombre="email">test@test.com</campoAdicional>
  </infoAdicional>
</factura>`

try {
  console.log('🔐 Firmando XML de prueba...')
  const xmlFirmado = signInvoiceXml(xmlPrueba, p12Buffer, { pkcs12Password: PIN })
  
  // Verificar que la firma se insertó
  const tieneSignature = xmlFirmado.includes('<ds:Signature') || xmlFirmado.includes('<Signature')
  const tieneSignedInfo = xmlFirmado.includes('SignedInfo')
  const tieneSignatureValue = xmlFirmado.includes('SignatureValue')
  const tieneX509Certificate = xmlFirmado.includes('X509Certificate')
  const tieneSignedProperties = xmlFirmado.includes('SignedProperties')
  
  console.log('')
  console.log('✅ ¡FIRMA EXITOSA!')
  console.log('')
  console.log('Verificación de estructura:')
  console.log(`  ds:Signature:       ${tieneSignature ? '✅' : '❌'}`)
  console.log(`  SignedInfo:         ${tieneSignedInfo ? '✅' : '❌'}`)
  console.log(`  SignatureValue:     ${tieneSignatureValue ? '✅' : '❌'}`)
  console.log(`  X509Certificate:    ${tieneX509Certificate ? '✅' : '❌'}`)
  console.log(`  SignedProperties:   ${tieneSignedProperties ? '✅' : '❌'}`)
  console.log('')
  console.log(`📄 Tamaño XML firmado: ${xmlFirmado.length} caracteres`)
  
  // Guardar para inspección
  const outPath = path.join(root, 'scripts', 'test-firmado.xml')
  fs.writeFileSync(outPath, xmlFirmado, 'utf8')
  console.log(`💾 XML firmado guardado en: ${outPath}`)
  
} catch (err: any) {
  console.error('')
  console.error('❌ ERROR AL FIRMAR:', err.message)
  console.error('')
  console.error('Posibles causas:')
  console.error('  - PIN incorrecto (pasar como argumento: npx tsx scripts/test-firma.ts MI_PIN)')
  console.error('  - Certificado .p12 corrupto o no compatible')
  console.error('  - Certificado vencido')
  process.exit(1)
}
