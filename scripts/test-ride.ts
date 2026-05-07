/**
 * Script de prueba — genera un RIDE PDF con datos ficticios
 * Uso: npx tsx scripts/test-ride.ts
 */

import fs from 'fs'
import path from 'path'
import type { Factura, ConfiguracionFacturacion } from '../src/types'
import { generarRIDEBuffer } from '../src/lib/sri/ride-pdf'

// Variables de entorno mínimas para que no falle sin proyecto Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dummy'

// ── Datos de prueba ──────────────────────────────────────────────────────────

const config: ConfiguracionFacturacion = {
  id: 'cfg-1',
  ruc: '1791234567001',
  razon_social: 'FERRETERÍA EL CLAVO DE ORO S.A.',
  nombre_comercial: 'El Clavo de Oro',
  direccion_matriz: 'Av. 10 de Agosto N23-45 y Ramírez Dávalos, Quito',
  codigo_establecimiento: '001',
  punto_emision: '001',
  ambiente: 'pruebas',
  obligado_contabilidad: true,
  tipo_contribuyente: 'ruc',
  tarifa_iva: 15,
  contribuyente_especial: null,
  regimen: null,
  cert_p12_url: null,
  cert_pin: null,
  secuencial_actual: 1,
  secuencial_nc_actual: 1,
  activo: true,
  creado_en: new Date().toISOString(),
  actualizado_en: new Date().toISOString(),
}

const factura: Factura = {
  id: 'fac-001',
  pedido_id: 'ped-001',
  tipo: 'factura',
  factura_origen_id: null,
  numero_secuencial: '000000001',
  numero_factura: '001-001-000000001',
  clave_acceso: '0605202601179123456700110010010000000011234567819',
  numero_autorizacion: '0605202601179123456700110010010000000011234567819',
  fecha_emision: '2026-05-06',
  fecha_autorizacion: new Date().toISOString(),
  estado: 'autorizada',
  datos_comprador: {
    tipo_identificacion: '05',
    identificacion: '1712345678',
    razon_social: 'Juan Carlos Pérez Rodríguez',
    email: 'juanperez@gmail.com',
    direccion: 'Calle Los Rosales 456, Quito, Pichincha',
    telefono: '0987654321',
  },
  items: [
    {
      descripcion: 'Martillo de acero 500g mango de madera',
      cantidad: 2,
      precio_unitario: 12.50,
      descuento: 0,
      subtotal: 25.00,
      iva: 15,
    },
    {
      descripcion: 'Caja de tornillos 3" x 100 unidades galvanizados',
      cantidad: 5,
      precio_unitario: 4.80,
      descuento: 1.00,
      subtotal: 23.00,
      iva: 15,
    },
    {
      descripcion: 'Cable eléctrico #10 AWG rollo 50m IMSA',
      cantidad: 1,
      precio_unitario: 38.90,
      descuento: 0,
      subtotal: 38.90,
      iva: 15,
    },
    {
      descripcion: 'Tubo PVC presión 1/2" x 6m clase B',
      cantidad: 3,
      precio_unitario: 3.20,
      descuento: 0,
      subtotal: 9.60,
      iva: 0,
    },
  ],
  totales: {
    subtotal_0: 9.60,
    subtotal_iva: 86.90,
    total_iva: 13.04,
    descuento: 1.00,
    total: 109.54,
  },
  xml_firmado: null,
  ride_url: null,
  error_sri: null,
  motivo_anulacion: null,
  notas: 'Pedido online #2026-001 — Entregado a domicilio',
  email_enviado_en: null,
  email_enviado_a: null,
  creado_en: new Date().toISOString(),
  actualizado_en: new Date().toISOString(),
}

// ── Generar ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Generando RIDE PDF...')
  const buffer = await generarRIDEBuffer(factura, config)

  const outPath = path.resolve('scripts/ride-prueba.pdf')
  fs.writeFileSync(outPath, buffer)
  console.log(`✅  PDF generado: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`)
}

main().catch(console.error)
