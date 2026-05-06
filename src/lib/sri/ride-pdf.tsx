/**
 * RIDE — Representación Impresa del Documento Electrónico
 * Formato estándar SRI Ecuador con código de barras Code 128
 */

import React from 'react'
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer
} from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
// @ts-expect-error bwip-js lacks TS types in some setups
import bwipjs from 'bwip-js'
import type { Factura, ConfiguracionFacturacion } from '@/types'

// ── Colores ──────────────────────────────────────────────────────────────────
const NEGRO   = '#111111'
const AZUL    = '#1B3F7A'   // azul SRI Ecuador
const AZUL_SM = '#EEF2F9'   // azul muy claro para filas alternadas
const BORDE   = '#AAAAAA'
const MUTED   = '#555555'
const BLANCO  = '#FFFFFF'

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: NEGRO,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: BLANCO,
  },

  // ── Cabecera
  header: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDE,
    marginBottom: 4,
  },
  headerLeft: {
    flex: 35,
    padding: 8,
    borderRightWidth: 1,
    borderColor: BORDE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLANCO,   // siempre blanco → logo siempre visible
  },
  headerRight: {
    flex: 65,
    padding: 8,
    backgroundColor: BLANCO,
  },
  logo: {
    maxWidth: 110,
    maxHeight: 60,
    objectFit: 'contain',
    marginBottom: 4,
  },
  razonSocial: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  nombreComercial: {
    fontSize: 7,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 3,
  },
  emisorDato: {
    fontSize: 6.5,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 1.45,
  },
  // Lado derecho de la cabecera
  rucRow: {
    flexDirection: 'row',
    backgroundColor: AZUL,
    padding: '4 6',
    marginBottom: 4,
    alignItems: 'center',
  },
  rucLabel: { fontSize: 7, color: '#AABFE0', marginRight: 4 },
  rucValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLANCO },
  tipoDoc: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: AZUL,
    borderWidth: 1.5,
    borderColor: AZUL,
    padding: '4 6',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  numDoc: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  autoRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
  },
  autoLabel: { fontSize: 6.5, color: MUTED, width: 110 },
  autoValue: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', flex: 1 },
  barcodeImg: {
    width: '100%',
    height: 28,
    objectFit: 'contain',
    marginTop: 3,
    marginBottom: 1,
  },
  claveText: {
    fontSize: 5.5,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ── Sección título
  seccionTitulo: {
    backgroundColor: AZUL,
    borderWidth: 1,
    borderColor: AZUL,
    padding: '3 6',
    marginTop: 4,
    marginBottom: 0,
  },
  seccionTituloTexto: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BLANCO,
  },

  // ── Comprador
  compradorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDE,
    marginBottom: 0,
  },
  celdaMedia: {
    width: '50%',
    padding: '3 5',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDE,
  },
  celdaCompleta: {
    width: '100%',
    padding: '3 5',
    borderBottomWidth: 1,
    borderColor: BORDE,
  },
  celdaTercio: {
    width: '33.33%',
    padding: '3 5',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDE,
  },
  etiqueta: { fontSize: 6, color: MUTED, marginBottom: 1 },
  valor: { fontSize: 7, fontFamily: 'Helvetica-Bold' },

  // ── Tabla de ítems
  tabla: {
    borderWidth: 1,
    borderColor: BORDE,
    marginTop: 4,
    marginBottom: 0,
  },
  tablaEncabezado: {
    flexDirection: 'row',
    backgroundColor: AZUL,
    borderBottomWidth: 1,
    borderColor: AZUL,
    padding: '3 4',
  },
  tablaFila: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDE,
    padding: '3 4',
    backgroundColor: BLANCO,
  },
  tablaFilaAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDE,
    padding: '3 4',
    backgroundColor: AZUL_SM,
  },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BLANCO },
  td: { fontSize: 6.5 },
  tdRight: { fontSize: 6.5, textAlign: 'right' },
  // columnas ítems
  cCodP:  { width: '9%' },
  cCodA:  { width: '8%' },
  cCant:  { width: '7%', textAlign: 'right' },
  cUnid:  { width: '7%' },
  cDesc:  { width: '37%' },
  cPU:    { width: '12%', textAlign: 'right' },
  cDsc:   { width: '8%', textAlign: 'right' },
  cTotal: { width: '12%', textAlign: 'right' },

  // ── Parte baja (pago + totales)
  parteInferior: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  pagoBox: {
    flex: 50,
  },
  totalesBox: {
    flex: 50,
  },

  // Forma de pago
  pagoTabla: {
    borderWidth: 1,
    borderColor: BORDE,
  },
  pagoCabecera: {
    flexDirection: 'row',
    backgroundColor: AZUL,
    borderBottomWidth: 1,
    borderColor: AZUL,
    padding: '3 5',
  },
  pagoFila: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDE,
    padding: '3 5',
  },
  pagoFilaLast: {
    flexDirection: 'row',
    padding: '3 5',
  },
  pagoColLabel: { flex: 1, fontSize: 6.5 },
  pagoColValue: { width: 50, textAlign: 'right', fontSize: 6.5 },

  // Totales
  totalesTabla: {
    borderWidth: 1,
    borderColor: BORDE,
  },
  totalesFila: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDE,
    padding: '2.5 5',
  },
  totalesFilaFinal: {
    flexDirection: 'row',
    backgroundColor: AZUL,
    padding: '3 5',
  },
  totalesLabel: { flex: 1, fontSize: 6.5, color: MUTED },
  totalesValue: { width: 55, textAlign: 'right', fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  totalesLabelFinal: { flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLANCO },
  totalesValueFinal: { width: 55, textAlign: 'right', fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLANCO },

  // Info adicional
  infoBox: {
    borderWidth: 1,
    borderColor: BORDE,
    padding: '4 6',
    marginTop: 4,
  },
  infoFila: {
    flexDirection: 'row',
    marginBottom: 1.5,
  },
  infoLabel: { fontSize: 6.5, color: MUTED, width: 60 },
  infoValor: { fontSize: 6.5, flex: 1 },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderColor: BORDE,
    marginTop: 6,
    paddingTop: 3,
    textAlign: 'center',
  },
  footerText: { fontSize: 6, color: MUTED },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function n2(v: number) { return `$${v.toFixed(2)}` }

function formatFecha(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatFechaHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const TIPO_ID: Record<string, string> = {
  '04': 'RUC',
  '05': 'CÉDULA',
  '06': 'PASAPORTE',
  '07': 'CONS. FINAL',
}

// ── Documento PDF ─────────────────────────────────────────────────────────────
function RIDEDocument({
  factura,
  config,
  logoDataUrl,
  barcodeDataUrl,
}: {
  factura: Factura
  config: ConfiguracionFacturacion
  logoDataUrl: string | null
  barcodeDataUrl: string
}) {
  const comp = factura.datos_comprador
  const items = factura.items
  const tot = factura.totales

  const esNC = factura.tipo === 'nota_credito'
  const tipoLabel = esNC ? 'NOTA DE CRÉDITO' : 'FACTURA'

  const numDoc = factura.numero_factura
    ?? `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`

  const claveAcceso = factura.clave_acceso ?? ''

  // Subtotales por tarifa
  const base15 = tot.subtotal_iva
  const base0  = tot.subtotal_0
  const iva15  = tot.total_iva
  const subtotalSinImp = base15 + base0
  const descuento = tot.descuento
  const totalFinal = tot.total

  // Info adicional (campos extra)
  const infoAdicional: { label: string; value: string }[] = []
  if (comp.email)     infoAdicional.push({ label: 'Email', value: comp.email })
  if (comp.telefono)  infoAdicional.push({ label: 'Teléfono', value: comp.telefono })
  if (factura.notas)  infoAdicional.push({ label: 'Notas', value: factura.notas })

  // Dividir clave de acceso en grupos de 10 para display
  const claveGrupos = (claveAcceso.match(/.{1,10}/g) ?? []).join('  ')

  return (
    <Document
      title={`${tipoLabel} ${numDoc}`}
      author={config.razon_social}
      subject={`${tipoLabel} Electrónica SRI Ecuador`}
    >
      <Page size="A4" style={s.page}>

        {/* ══════════════════════════════════════════════════════
            CABECERA
        ══════════════════════════════════════════════════════ */}
        <View style={s.header}>

          {/* Columna izquierda — logo + datos emisor */}
          <View style={s.headerLeft}>
            {logoDataUrl ? (
              <Image style={s.logo} src={logoDataUrl} />
            ) : null}
            <Text style={s.razonSocial}>{config.razon_social}</Text>
            {config.nombre_comercial && (
              <Text style={s.nombreComercial}>{config.nombre_comercial}</Text>
            )}
            <Text style={s.emisorDato}>Dir. Matriz: {config.direccion_matriz}</Text>
            {config.contribuyente_especial && (
              <Text style={s.emisorDato}>
                Contribuyente Especial N° {config.contribuyente_especial}
              </Text>
            )}
            <Text style={s.emisorDato}>
              Obligado a llevar Contabilidad: {config.obligado_contabilidad ? 'SÍ' : 'NO'}
            </Text>
          </View>

          {/* Columna derecha — RUC, tipo comprobante, autorización, barcode */}
          <View style={s.headerRight}>
            <View style={s.rucRow}>
              <Text style={s.rucLabel}>R.U.C.:</Text>
              <Text style={s.rucValue}>{config.ruc}</Text>
            </View>

            <Text style={s.tipoDoc}>{tipoLabel}</Text>
            <Text style={s.numDoc}>No. {numDoc}</Text>

            <View style={s.autoRow}>
              <Text style={s.autoLabel}>N° AUTORIZACIÓN:</Text>
              <Text style={s.autoValue}>{factura.numero_autorizacion ?? '(PENDIENTE)'}</Text>
            </View>
            <View style={s.autoRow}>
              <Text style={s.autoLabel}>FECHA Y HORA AUTORIZACIÓN:</Text>
              <Text style={s.autoValue}>
                {factura.fecha_autorizacion ? formatFechaHora(factura.fecha_autorizacion) : '—'}
              </Text>
            </View>
            <View style={s.autoRow}>
              <Text style={s.autoLabel}>AMBIENTE:</Text>
              <Text style={s.autoValue}>
                {config.ambiente === 'produccion' ? 'PRODUCCIÓN' : 'PRUEBAS'}
              </Text>
            </View>
            <View style={s.autoRow}>
              <Text style={s.autoLabel}>EMISIÓN:</Text>
              <Text style={s.autoValue}>NORMAL</Text>
            </View>
            <View style={s.autoRow}>
              <Text style={s.autoLabel}>CLAVE DE ACCESO:</Text>
            </View>

            {barcodeDataUrl ? (
              <Image style={s.barcodeImg} src={barcodeDataUrl} />
            ) : null}
            <Text style={s.claveText}>{claveGrupos}</Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            DATOS DEL ADQUIRENTE
        ══════════════════════════════════════════════════════ */}
        <View style={s.seccionTitulo}>
          <Text style={s.seccionTituloTexto}>DATOS DEL ADQUIRENTE / COMPRADOR</Text>
        </View>
        <View style={s.compradorGrid}>
          {/* Razón social — ocupa toda la fila */}
          <View style={[s.celdaCompleta, { borderRightWidth: 0 }]}>
            <Text style={s.etiqueta}>RAZÓN SOCIAL / NOMBRES Y APELLIDOS</Text>
            <Text style={s.valor}>
              {comp.tipo_identificacion === '07' ? 'CONSUMIDOR FINAL' : comp.razon_social}
            </Text>
          </View>
          {/* Identificación + Tipo + Fecha */}
          <View style={s.celdaTercio}>
            <Text style={s.etiqueta}>IDENTIFICACIÓN</Text>
            <Text style={s.valor}>
              {comp.tipo_identificacion === '07' ? '9999999999999' : comp.identificacion}
            </Text>
          </View>
          <View style={s.celdaTercio}>
            <Text style={s.etiqueta}>TIPO IDENTIFICACIÓN</Text>
            <Text style={s.valor}>{TIPO_ID[comp.tipo_identificacion] ?? comp.tipo_identificacion}</Text>
          </View>
          <View style={[s.celdaTercio, { borderRightWidth: 0 }]}>
            <Text style={s.etiqueta}>FECHA EMISIÓN</Text>
            <Text style={s.valor}>{formatFecha(factura.fecha_emision)}</Text>
          </View>
          {/* Dirección */}
          {comp.direccion ? (
            <View style={[s.celdaCompleta, { borderBottomWidth: 0, borderRightWidth: 0 }]}>
              <Text style={s.etiqueta}>DIRECCIÓN DEL COMPRADOR</Text>
              <Text style={s.valor}>{comp.direccion}</Text>
            </View>
          ) : (
            // Celda vacía para cerrar la tabla correctamente
            <View style={[s.celdaCompleta, { borderBottomWidth: 0, borderRightWidth: 0, padding: 0 }]} />
          )}
        </View>

        {/* ══════════════════════════════════════════════════════
            DETALLE DE BIENES Y/O SERVICIOS
        ══════════════════════════════════════════════════════ */}
        <View style={s.seccionTitulo}>
          <Text style={s.seccionTituloTexto}>DETALLE DE BIENES Y/O SERVICIOS</Text>
        </View>
        <View style={s.tabla}>
          {/* Encabezado */}
          <View style={s.tablaEncabezado}>
            <Text style={[s.th, s.cCodP]}>CÓD. PRINCIPAL</Text>
            <Text style={[s.th, s.cCodA]}>CÓD. AUX.</Text>
            <Text style={[s.th, s.cCant]}>CANT.</Text>
            <Text style={[s.th, s.cUnid]}>UNIDAD</Text>
            <Text style={[s.th, s.cDesc]}>DESCRIPCIÓN</Text>
            <Text style={[s.th, s.cPU]}>P. UNITARIO</Text>
            <Text style={[s.th, s.cDsc]}>DESCUENTO</Text>
            <Text style={[s.th, s.cTotal]}>P. TOTAL</Text>
          </View>
          {/* Filas */}
          {items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.tablaFila : s.tablaFilaAlt}>
              <Text style={[s.td, s.cCodP]}>{String(i + 1).padStart(6,'0')}</Text>
              <Text style={[s.td, s.cCodA]}>—</Text>
              <Text style={[s.tdRight, s.cCant]}>{item.cantidad.toFixed(2)}</Text>
              <Text style={[s.td, s.cUnid]}>U</Text>
              <Text style={[s.td, s.cDesc]}>{item.descripcion}</Text>
              <Text style={[s.tdRight, s.cPU]}>{item.precio_unitario.toFixed(2)}</Text>
              <Text style={[s.tdRight, s.cDsc]}>{item.descuento.toFixed(2)}</Text>
              <Text style={[s.tdRight, s.cTotal]}>{item.subtotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════
            FORMA DE PAGO  +  TOTALES
        ══════════════════════════════════════════════════════ */}
        <View style={s.parteInferior}>

          {/* Forma de pago */}
          <View style={s.pagoBox}>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionTituloTexto}>FORMA DE PAGO</Text>
            </View>
            <View style={s.pagoTabla}>
              <View style={s.pagoCabecera}>
                <Text style={[s.th, s.pagoColLabel, { color: BLANCO }]}>FORMA DE PAGO</Text>
                <Text style={[s.th, s.pagoColValue, { color: BLANCO }]}>VALOR</Text>
              </View>
              <View style={s.pagoFilaLast}>
                <Text style={s.pagoColLabel}>SIN UTILIZACIÓN DEL SISTEMA FINANCIERO</Text>
                <Text style={s.pagoColValue}>{totalFinal.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Totales */}
          <View style={s.totalesBox}>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionTituloTexto}>RESUMEN DE VALORES</Text>
            </View>
            <View style={s.totalesTabla}>
              {base15 > 0 && (
                <View style={s.totalesFila}>
                  <Text style={s.totalesLabel}>SUBTOTAL {config.tarifa_iva}%</Text>
                  <Text style={s.totalesValue}>{base15.toFixed(2)}</Text>
                </View>
              )}
              {base0 > 0 && (
                <View style={s.totalesFila}>
                  <Text style={s.totalesLabel}>SUBTOTAL 0%</Text>
                  <Text style={s.totalesValue}>{base0.toFixed(2)}</Text>
                </View>
              )}
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>SUBTOTAL SIN IMPUESTOS</Text>
                <Text style={s.totalesValue}>{subtotalSinImp.toFixed(2)}</Text>
              </View>
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>SUBTOTAL NO OBJETO DE IVA</Text>
                <Text style={s.totalesValue}>0.00</Text>
              </View>
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>SUBTOTAL EXENTO DE IVA</Text>
                <Text style={s.totalesValue}>0.00</Text>
              </View>
              {descuento > 0 && (
                <View style={s.totalesFila}>
                  <Text style={s.totalesLabel}>DESCUENTO</Text>
                  <Text style={s.totalesValue}>{descuento.toFixed(2)}</Text>
                </View>
              )}
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>ICE</Text>
                <Text style={s.totalesValue}>0.00</Text>
              </View>
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>IVA {config.tarifa_iva}%</Text>
                <Text style={s.totalesValue}>{iva15.toFixed(2)}</Text>
              </View>
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>IRBPNR</Text>
                <Text style={s.totalesValue}>0.00</Text>
              </View>
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>PROPINA</Text>
                <Text style={s.totalesValue}>0.00</Text>
              </View>
              <View style={s.totalesFilaFinal}>
                <Text style={s.totalesLabelFinal}>VALOR TOTAL</Text>
                <Text style={s.totalesValueFinal}>{n2(totalFinal)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            INFORMACIÓN ADICIONAL
        ══════════════════════════════════════════════════════ */}
        {infoAdicional.length > 0 && (
          <>
            <View style={s.seccionTitulo}>
              <Text style={s.seccionTituloTexto}>INFORMACIÓN ADICIONAL</Text>
            </View>
            <View style={s.infoBox}>
              {infoAdicional.map((info, i) => (
                <View key={i} style={s.infoFila}>
                  <Text style={s.infoLabel}>{info.label}:</Text>
                  <Text style={s.infoValor}>{info.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            PIE DE PÁGINA
        ══════════════════════════════════════════════════════ */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Documento generado y autorizado electrónicamente — verifique en: www.sri.gob.ec
          </Text>
        </View>

      </Page>
    </Document>
  )
}

// ── Función principal ─────────────────────────────────────────────────────────

/** Genera el RIDE como buffer PDF con logo y código de barras Code 128 */
export async function generarRIDEBuffer(
  factura: Factura,
  config: ConfiguracionFacturacion,
): Promise<Buffer> {
  // 1. Código de barras Code 128 (clave de acceso de 49 dígitos)
  let barcodeDataUrl = ''
  const claveAcceso = factura.clave_acceso ?? ''
  if (claveAcceso) {
    try {
      const buf: Buffer = await bwipjs.toBuffer({
        bcid:        'code128',
        text:        claveAcceso,
        scale:       2,
        height:      10,
        includetext: false,
        padding:     2,
      })
      barcodeDataUrl = `data:image/png;base64,${buf.toString('base64')}`
    } catch (e) {
      console.warn('[ride-pdf] barcode generation failed:', e)
    }
  }

  // 2. Logo de la tienda (desde configuracion_tienda)
  let logoDataUrl: string | null = null
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: tienda } = await admin
      .from('configuracion_tienda')
      .select('logo_url')
      .maybeSingle()

    if (tienda?.logo_url) {
      const res = await fetch(tienda.logo_url)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const mime = res.headers.get('content-type') ?? 'image/png'
        logoDataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
      }
    }
  } catch (e) {
    console.warn('[ride-pdf] logo load failed:', e)
  }

  // 3. Renderizar PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(RIDEDocument, { factura, config, logoDataUrl, barcodeDataUrl }) as any
  return renderToBuffer(element)
}
