/**
 * Generador de PDF para Proformas
 * Usa @react-pdf/renderer igual que el RIDE de facturación
 */

import React from 'react'
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer
} from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import type { Proforma } from '@/types'

const NEGRO  = '#111111'
const VERDE  = '#16a34a'
const VERDE_SM = '#f0fdf4'
const BORDE  = '#d1d5db'
const MUTED  = '#6b7280'
const BLANCO = '#FFFFFF'
const GRIS   = '#f9fafb'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: NEGRO,
    paddingHorizontal: 28,
    paddingVertical: 22,
    backgroundColor: BLANCO,
  },

  // Cabecera
  header: { flexDirection: 'row', borderWidth: 1, borderColor: BORDE, marginBottom: 6 },
  headerLogo: {
    flex: 35, padding: 10, borderRightWidth: 1, borderColor: BORDE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerDatos: { flex: 65, padding: 10 },
  logo: { maxWidth: 110, maxHeight: 55, objectFit: 'contain', marginBottom: 4 },
  nombreTienda: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 2 },
  subtituloTienda: { fontSize: 6.5, color: MUTED, textAlign: 'center' },

  // Número de proforma
  cajaNumero: {
    borderWidth: 1.5, borderColor: VERDE, backgroundColor: VERDE_SM,
    padding: 8, alignItems: 'center', marginBottom: 6,
  },
  labelNumero: { fontSize: 7, color: VERDE, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  numero: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: VERDE },

  // Info fecha y vencimiento
  infoBanda: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  infoCaja: { flex: 1, borderWidth: 1, borderColor: BORDE, padding: 6 },
  infoLabel: { fontSize: 6.5, color: MUTED, marginBottom: 2 },
  infoValor: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  infoVencimientoLabel: { fontSize: 6.5, color: '#dc2626', marginBottom: 2 },
  infoVencimientoValor: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#dc2626' },

  // Cliente
  seccion: { marginBottom: 8 },
  seccionTitulo: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', backgroundColor: VERDE,
    color: BLANCO, padding: '3 6', marginBottom: 0,
  },
  seccionCuerpo: { borderWidth: 1, borderTopWidth: 0, borderColor: BORDE, padding: 6 },
  fila: { flexDirection: 'row', marginBottom: 2 },
  filaLabel: { width: 80, fontSize: 7, color: MUTED },
  filaValor: { flex: 1, fontSize: 7.5 },

  // Tabla productos
  tablaHeader: {
    flexDirection: 'row', backgroundColor: VERDE, padding: '4 6',
  },
  tablaCeldaHeader: { fontSize: 7, color: BLANCO, fontFamily: 'Helvetica-Bold' },
  tablaFila: { flexDirection: 'row', padding: '4 6', borderBottomWidth: 0.5, borderColor: BORDE },
  tablaFilaAlterna: { flexDirection: 'row', padding: '4 6', backgroundColor: GRIS, borderBottomWidth: 0.5, borderColor: BORDE },
  tablaCelda: { fontSize: 7.5 },

  colNombre: { flex: 4 },
  colCantidad: { flex: 1, textAlign: 'right' },
  colPrecio: { flex: 1.5, textAlign: 'right' },
  colSubtotal: { flex: 1.5, textAlign: 'right' },

  // Totales
  totalesBloque: { alignItems: 'flex-end', marginTop: 4, marginBottom: 8 },
  totalesCaja: { width: 200, borderWidth: 1, borderColor: BORDE },
  totalesFila: { flexDirection: 'row', justifyContent: 'space-between', padding: '4 8', borderBottomWidth: 0.5, borderColor: BORDE },
  totalesFilaTotal: { flexDirection: 'row', justifyContent: 'space-between', padding: '5 8', backgroundColor: VERDE },
  totalesLabel: { fontSize: 7.5, color: MUTED },
  totalesValor: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  totalesLabelTotal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLANCO },
  totalesValorTotal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLANCO },

  // Cláusula de vigencia
  clausula: {
    borderWidth: 1, borderColor: '#fbbf24', backgroundColor: '#fffbeb',
    padding: 8, marginBottom: 8,
  },
  clausulaTitulo: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 3 },
  clausulaTexto: { fontSize: 6.5, color: '#78350f', lineHeight: 1.5 },

  // Nota interna (si hay)
  nota: {
    borderWidth: 1, borderColor: BORDE, backgroundColor: GRIS,
    padding: 6, marginBottom: 8,
  },
  notaLabel: { fontSize: 6.5, color: MUTED, marginBottom: 2 },
  notaTexto: { fontSize: 7.5 },

  pie: { fontSize: 6.5, color: MUTED, textAlign: 'center', marginTop: 4 },
})

function formatear(valor: number, simbolo: string) {
  return `${simbolo} ${valor.toFixed(2)}`
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Guayaquil',
  })
}

interface Props {
  proforma: Proforma
  nombreTienda: string
  simboloMoneda: string
  logoUrl: string | null
}

function DocumentoProforma({ proforma, nombreTienda, simboloMoneda, logoUrl }: Props) {
  const sym = simboloMoneda || '$'
  const tieneDescuento = proforma.descuento_valor > 0 && proforma.descuento_tipo

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Cabecera ─────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLogo}>
            {logoUrl
              ? <Image src={logoUrl} style={s.logo} />
              : <Text style={s.nombreTienda}>{nombreTienda}</Text>
            }
            {logoUrl && <Text style={s.nombreTienda}>{nombreTienda}</Text>}
          </View>
          <View style={s.headerDatos}>
            <View style={s.cajaNumero}>
              <Text style={s.labelNumero}>PROFORMA</Text>
              <Text style={s.numero}>{proforma.numero}</Text>
            </View>
          </View>
        </View>

        {/* ── Fecha emisión y vencimiento ──────────────────────── */}
        <View style={s.infoBanda}>
          <View style={s.infoCaja}>
            <Text style={s.infoLabel}>FECHA DE EMISIÓN</Text>
            <Text style={s.infoValor}>{formatearFecha(proforma.creado_en)}</Text>
          </View>
          {proforma.vence_en ? (
            <View style={s.infoCaja}>
              <Text style={s.infoVencimientoLabel}>VÁLIDA HASTA</Text>
              <Text style={s.infoVencimientoValor}>{formatearFecha(proforma.vence_en)}</Text>
            </View>
          ) : (
            <View style={s.infoCaja}>
              <Text style={s.infoLabel}>VIGENCIA</Text>
              <Text style={s.infoValor}>Sin fecha límite</Text>
            </View>
          )}
        </View>

        {/* ── Datos del cliente ────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>DATOS DEL CLIENTE</Text>
          <View style={s.seccionCuerpo}>
            <View style={s.fila}>
              <Text style={s.filaLabel}>Nombre:</Text>
              <Text style={s.filaValor}>{proforma.cliente_nombre}</Text>
            </View>
            <View style={s.fila}>
              <Text style={s.filaLabel}>Email:</Text>
              <Text style={s.filaValor}>{proforma.cliente_email}</Text>
            </View>
            {proforma.cliente_telefono && (
              <View style={s.fila}>
                <Text style={s.filaLabel}>Teléfono:</Text>
                <Text style={s.filaValor}>{proforma.cliente_telefono}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Tabla de productos ───────────────────────────────── */}
        <View style={s.seccion}>
          <View style={s.tablaHeader}>
            <Text style={[s.tablaCeldaHeader, s.colNombre]}>Descripción</Text>
            <Text style={[s.tablaCeldaHeader, s.colCantidad]}>Cant.</Text>
            <Text style={[s.tablaCeldaHeader, s.colPrecio]}>P. Unit.</Text>
            <Text style={[s.tablaCeldaHeader, s.colSubtotal]}>Subtotal</Text>
          </View>
          {proforma.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.tablaFila : s.tablaFilaAlterna}>
              <Text style={[s.tablaCelda, s.colNombre]}>{item.nombre}</Text>
              <Text style={[s.tablaCelda, s.colCantidad]}>{item.cantidad}</Text>
              <Text style={[s.tablaCelda, s.colPrecio]}>{formatear(item.precio_unitario, sym)}</Text>
              <Text style={[s.tablaCelda, s.colSubtotal]}>{formatear(item.subtotal, sym)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totales ──────────────────────────────────────────── */}
        <View style={s.totalesBloque}>
          <View style={s.totalesCaja}>
            <View style={s.totalesFila}>
              <Text style={s.totalesLabel}>Subtotal</Text>
              <Text style={s.totalesValor}>{formatear(proforma.subtotal, sym)}</Text>
            </View>
            {tieneDescuento && (
              <View style={s.totalesFila}>
                <Text style={s.totalesLabel}>
                  Descuento {proforma.descuento_tipo === 'porcentaje' ? `(${proforma.descuento_valor}%)` : ''}
                </Text>
                <Text style={s.totalesValor}>- {formatear(proforma.descuento_monto, sym)}</Text>
              </View>
            )}
            <View style={s.totalesFila}>
              <Text style={s.totalesLabel}>Base imponible</Text>
              <Text style={s.totalesValor}>{formatear(proforma.base_imponible, sym)}</Text>
            </View>
            <View style={s.totalesFila}>
              <Text style={s.totalesLabel}>IVA ({proforma.iva_porcentaje}%)</Text>
              <Text style={s.totalesValor}>{formatear(proforma.iva_monto, sym)}</Text>
            </View>
            <View style={s.totalesFilaTotal}>
              <Text style={s.totalesLabelTotal}>TOTAL</Text>
              <Text style={s.totalesValorTotal}>{formatear(proforma.total, sym)}</Text>
            </View>
          </View>
        </View>

        {/* ── Nota interna ─────────────────────────────────────── */}
        {proforma.nota && (
          <View style={s.nota}>
            <Text style={s.notaLabel}>OBSERVACIONES</Text>
            <Text style={s.notaTexto}>{proforma.nota}</Text>
          </View>
        )}

        {/* ── Cláusula de vigencia ─────────────────────────────── */}
        {proforma.vence_en ? (
          <View style={s.clausula}>
            <Text style={s.clausulaTitulo}>⚠ CONDICIONES DE VALIDEZ</Text>
            <Text style={s.clausulaTexto}>
              La presente proforma tiene validez hasta el {formatearFecha(proforma.vence_en)}.
              Transcurrida esta fecha y hora, los precios, condiciones y disponibilidad aquí indicados
              quedarán sin efecto y estarán sujetos a modificación sin previo aviso.
              Para confirmar su pedido antes del vencimiento, comuníquese con nosotros.
            </Text>
          </View>
        ) : (
          <View style={s.clausula}>
            <Text style={s.clausulaTitulo}>CONDICIONES</Text>
            <Text style={s.clausulaTexto}>
              Los precios indicados en esta proforma están sujetos a disponibilidad de stock y
              podrán ser modificados sin previo aviso. Esta proforma no constituye una factura ni
              un compromiso de venta hasta que sea confirmada por escrito.
            </Text>
          </View>
        )}

        {/* ── Pie ──────────────────────────────────────────────── */}
        <Text style={s.pie}>
          {nombreTienda} — Documento generado el {formatearFecha(proforma.creado_en)} — {proforma.numero}
        </Text>

      </Page>
    </Document>
  )
}

export async function generarProformaBuffer(
  proforma: Proforma,
  nombreTienda: string,
  simboloMoneda: string,
  logoUrl: string | null,
): Promise<Buffer> {
  let logoData: string | null = null

  if (logoUrl) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const path = logoUrl.includes('/storage/v1/object/public/')
        ? logoUrl.split('/storage/v1/object/public/imagenes/')[1]
        : null

      if (path) {
        const { data } = await supabase.storage.from('imagenes').download(path)
        if (data) {
          const buf = Buffer.from(await data.arrayBuffer())
          const mime = data.type || 'image/jpeg'
          logoData = `data:${mime};base64,${buf.toString('base64')}`
        }
      } else {
        logoData = logoUrl
      }
    } catch {
      logoData = null
    }
  }

  const buffer = await renderToBuffer(
    <DocumentoProforma
      proforma={proforma}
      nombreTienda={nombreTienda}
      simboloMoneda={simboloMoneda}
      logoUrl={logoData}
    />
  )

  return buffer as unknown as Buffer
}
