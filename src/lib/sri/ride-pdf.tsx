/**
 * RIDE — Representación Impresa del Documento Electrónico
 * Generado con @react-pdf/renderer siguiendo el formato SRI Ecuador
 */

import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, renderToBuffer
} from '@react-pdf/renderer'
import type { Factura, ConfiguracionFacturacion } from '@/types'

// Paleta SRI Ecuador (colores neutros para facturas legales)
const AZUL   = '#1E3A5F'
const GRIS   = '#F5F5F5'
const BORDE  = '#CCCCCC'
const NEGRO  = '#111111'
const MUTED  = '#555555'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: NEGRO,
    padding: 28,
    backgroundColor: '#FFFFFF',
  },
  // ── Cabecera ──
  header: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDE,
    marginBottom: 6,
  },
  headerLeft: {
    flex: 2,
    padding: 8,
    borderRightWidth: 1,
    borderColor: BORDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 3,
    padding: 8,
  },
  razonSocial: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: AZUL,
    textAlign: 'center',
    marginBottom: 2,
  },
  nombreComercial: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 4,
  },
  emisorDato: {
    fontSize: 7,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  tipoComprobante: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: AZUL,
    textAlign: 'center',
    marginBottom: 4,
  },
  numeroFactura: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  // ── Clave de acceso ──
  claveBox: {
    backgroundColor: GRIS,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDE,
    marginBottom: 6,
  },
  claveLabel: { fontSize: 6, color: MUTED, marginBottom: 2 },
  claveValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  // ── Autorización ──
  autoRow: { flexDirection: 'row', marginBottom: 2 },
  autoLabel: { fontSize: 7, color: MUTED, width: 100 },
  autoValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', flex: 1 },
  // ── Comprador ──
  sectionTitle: {
    backgroundColor: AZUL,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: '3 6',
    marginBottom: 0,
  },
  compradorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDE,
    marginBottom: 6,
  },
  compradorCell: {
    width: '50%',
    padding: '4 6',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDE,
  },
  compradorCellFull: {
    width: '100%',
    padding: '4 6',
    borderBottomWidth: 1,
    borderColor: BORDE,
  },
  cellLabel: { fontSize: 6, color: MUTED, marginBottom: 1 },
  cellValue: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  // ── Tabla de ítems ──
  table: {
    borderWidth: 1,
    borderColor: BORDE,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: AZUL,
    padding: '3 4',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: BORDE,
    padding: '3 4',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: BORDE,
    padding: '3 4',
    backgroundColor: GRIS,
  },
  thText: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tdText: { fontSize: 7, color: NEGRO },
  tdMuted: { fontSize: 7, color: MUTED },
  colCod:   { width: '8%' },
  colDesc:  { width: '40%' },
  colCant:  { width: '10%', textAlign: 'right' },
  colPU:    { width: '14%', textAlign: 'right' },
  colDesc2: { width: '10%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  // ── Totales ──
  totalesBox: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  totalesTable: {
    width: '45%',
    borderWidth: 1,
    borderColor: BORDE,
  },
  totalesRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDE,
    padding: '3 6',
  },
  totalesRowFinal: {
    flexDirection: 'row',
    backgroundColor: AZUL,
    padding: '4 6',
  },
  totalesLabel: { flex: 1, fontSize: 7, color: MUTED },
  totalesValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  totalesLabelFinal: { flex: 1, fontSize: 8, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  totalesValueFinal: { fontSize: 8, color: '#FFFFFF', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  // ── Info adicional ──
  infoAdicional: {
    borderWidth: 1,
    borderColor: BORDE,
    padding: 6,
    marginBottom: 6,
  },
  infoItem: { fontSize: 7, color: MUTED, marginBottom: 1 },
  // ── Footer ──
  footer: {
    borderTopWidth: 1,
    borderColor: BORDE,
    paddingTop: 4,
    textAlign: 'center',
  },
  footerText: { fontSize: 6, color: MUTED },
})

function n2(v: number) { return v.toFixed(2) }

function formatFecha(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const AMBIENTES: Record<string, string> = {
  pruebas:   'PRUEBAS',
  produccion: 'PRODUCCIÓN',
}

function chunkClave(clave: string): string {
  return (clave.match(/.{1,10}/g) ?? [clave]).join(' - ')
}

// Componente PDF
function RIDEDocument({ factura, config }: { factura: Factura; config: ConfiguracionFacturacion }) {
  const comp = factura.datos_comprador
  const items = factura.items
  const tot = factura.totales
  const numFac = factura.numero_factura ?? `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`

  const infoAdicional: { label: string; value: string }[] = []
  if (comp.email)     infoAdicional.push({ label: 'EMAIL', value: comp.email })
  if (comp.telefono)  infoAdicional.push({ label: 'TELÉFONO', value: comp.telefono })
  if (comp.direccion) infoAdicional.push({ label: 'DIRECCIÓN', value: comp.direccion })
  if (factura.notas)  infoAdicional.push({ label: 'NOTAS', value: factura.notas })

  return (
    <Document
      title={`Factura ${numFac}`}
      author={config.razon_social}
      subject="Factura Electrónica SRI Ecuador"
    >
      <Page size="A4" style={styles.page}>

        {/* ── CABECERA ── */}
        <View style={styles.header}>
          {/* Datos del emisor */}
          <View style={styles.headerLeft}>
            <Text style={styles.razonSocial}>{config.razon_social}</Text>
            {config.nombre_comercial && (
              <Text style={styles.nombreComercial}>{config.nombre_comercial}</Text>
            )}
            <Text style={styles.emisorDato}>Dir: {config.direccion_matriz}</Text>
            <Text style={styles.emisorDato}>RUC: {config.ruc}</Text>
            <Text style={styles.emisorDato}>
              Oblig. Contabilidad: {config.obligado_contabilidad ? 'SÍ' : 'NO'}
            </Text>
            {config.contribuyente_especial && (
              <Text style={styles.emisorDato}>
                Contrib. Especial N°: {config.contribuyente_especial}
              </Text>
            )}
          </View>

          {/* Tipo de comprobante + clave de acceso */}
          <View style={styles.headerRight}>
            <Text style={styles.tipoComprobante}>FACTURA</Text>
            <Text style={styles.numeroFactura}>{numFac}</Text>

            <View style={styles.claveBox}>
              <Text style={styles.claveLabel}>NÚMERO DE CLAVE DE ACCESO</Text>
              <Text style={styles.claveValue}>{chunkClave(factura.clave_acceso ?? '—')}</Text>
            </View>

            <View style={styles.autoRow}>
              <Text style={styles.autoLabel}>N° DE AUTORIZACIÓN</Text>
              <Text style={styles.autoValue}>{factura.numero_autorizacion ?? '(PENDIENTE)'}</Text>
            </View>
            <View style={styles.autoRow}>
              <Text style={styles.autoLabel}>FECHA Y HORA AUTORIZACIÓN</Text>
              <Text style={styles.autoValue}>
                {factura.fecha_autorizacion ? formatFecha(factura.fecha_autorizacion) : '—'}
              </Text>
            </View>
            <View style={styles.autoRow}>
              <Text style={styles.autoLabel}>AMBIENTE</Text>
              <Text style={styles.autoValue}>{AMBIENTES[config.ambiente] ?? config.ambiente.toUpperCase()}</Text>
            </View>
            <View style={styles.autoRow}>
              <Text style={styles.autoLabel}>EMISIÓN</Text>
              <Text style={styles.autoValue}>NORMAL</Text>
            </View>
          </View>
        </View>

        {/* ── DATOS DEL COMPRADOR ── */}
        <Text style={styles.sectionTitle}>DATOS DEL COMPRADOR</Text>
        <View style={styles.compradorGrid}>
          <View style={{ ...styles.compradorCellFull }}>
            <Text style={styles.cellLabel}>RAZÓN SOCIAL / NOMBRES Y APELLIDOS</Text>
            <Text style={styles.cellValue}>
              {comp.tipo_identificacion === '07' ? 'CONSUMIDOR FINAL' : comp.razon_social}
            </Text>
          </View>
          <View style={styles.compradorCell}>
            <Text style={styles.cellLabel}>IDENTIFICACIÓN</Text>
            <Text style={styles.cellValue}>
              {comp.tipo_identificacion === '07' ? '9999999999999' : comp.identificacion}
            </Text>
          </View>
          <View style={{ ...styles.compradorCell, borderRightWidth: 0 }}>
            <Text style={styles.cellLabel}>FECHA DE EMISIÓN</Text>
            <Text style={styles.cellValue}>{formatFecha(factura.fecha_emision)}</Text>
          </View>
          {comp.direccion && (
            <View style={{ ...styles.compradorCellFull, borderBottomWidth: 0 }}>
              <Text style={styles.cellLabel}>DIRECCIÓN</Text>
              <Text style={styles.cellValue}>{comp.direccion}</Text>
            </View>
          )}
        </View>

        {/* ── DETALLE DE PRODUCTOS ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.thText, ...styles.colCod }}>CÓD.</Text>
            <Text style={{ ...styles.thText, ...styles.colDesc }}>DESCRIPCIÓN</Text>
            <Text style={{ ...styles.thText, ...styles.colCant }}>CANT.</Text>
            <Text style={{ ...styles.thText, ...styles.colPU }}>P. UNIT.</Text>
            <Text style={{ ...styles.thText, ...styles.colDesc2 }}>DESC.</Text>
            <Text style={{ ...styles.thText, ...styles.colTotal }}>TOTAL S/IMP.</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={{ ...styles.tdMuted, ...styles.colCod }}>{String(i + 1).padStart(3, '0')}</Text>
              <Text style={{ ...styles.tdText, ...styles.colDesc }}>{item.descripcion}</Text>
              <Text style={{ ...styles.tdMuted, ...styles.colCant }}>{item.cantidad.toFixed(2)}</Text>
              <Text style={{ ...styles.tdMuted, ...styles.colPU }}>${n2(item.precio_unitario)}</Text>
              <Text style={{ ...styles.tdMuted, ...styles.colDesc2 }}>${n2(item.descuento)}</Text>
              <Text style={{ ...styles.tdText, ...styles.colTotal }}>${n2(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* ── TOTALES ── */}
        <View style={styles.totalesBox}>
          <View style={styles.totalesTable}>
            {tot.subtotal_0 > 0 && (
              <View style={styles.totalesRow}>
                <Text style={styles.totalesLabel}>SUBTOTAL TARIFA 0%</Text>
                <Text style={styles.totalesValue}>${n2(tot.subtotal_0)}</Text>
              </View>
            )}
            {tot.subtotal_iva > 0 && (
              <View style={styles.totalesRow}>
                <Text style={styles.totalesLabel}>SUBTOTAL TARIFA {config.tarifa_iva}%</Text>
                <Text style={styles.totalesValue}>${n2(tot.subtotal_iva)}</Text>
              </View>
            )}
            {tot.descuento > 0 && (
              <View style={styles.totalesRow}>
                <Text style={styles.totalesLabel}>DESCUENTO</Text>
                <Text style={styles.totalesValue}>- ${n2(tot.descuento)}</Text>
              </View>
            )}
            <View style={styles.totalesRow}>
              <Text style={styles.totalesLabel}>IVA {config.tarifa_iva}%</Text>
              <Text style={styles.totalesValue}>${n2(tot.total_iva)}</Text>
            </View>
            <View style={styles.totalesRow}>
              <Text style={styles.totalesLabel}>PROPINA</Text>
              <Text style={styles.totalesValue}>$0.00</Text>
            </View>
            <View style={styles.totalesRowFinal}>
              <Text style={styles.totalesLabelFinal}>VALOR TOTAL</Text>
              <Text style={styles.totalesValueFinal}>${n2(tot.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── INFORMACIÓN ADICIONAL ── */}
        {infoAdicional.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>INFORMACIÓN ADICIONAL</Text>
            <View style={styles.infoAdicional}>
              {infoAdicional.map((info, i) => (
                <Text key={i} style={styles.infoItem}>
                  {info.label}: {info.value}
                </Text>
              ))}
            </View>
          </>
        )}

        {/* ── PIE DE PÁGINA ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Documento generado electrónicamente · Autorizado por el SRI Ecuador · {config.ruc}
          </Text>
          <Text style={styles.footerText}>
            Verifique este documento en: www.sri.gob.ec
          </Text>
        </View>

      </Page>
    </Document>
  )
}

/** Genera el RIDE como buffer PDF */
export async function generarRIDEBuffer(
  factura: Factura,
  config: ConfiguracionFacturacion
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(RIDEDocument, { factura, config }) as any
  return renderToBuffer(element)
}
