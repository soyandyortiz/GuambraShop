/**
 * GET /api/facturacion/ride?id={facturaId}
 * Genera y descarga el RIDE (Representación Impresa) en PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { generarRIDEBuffer } from '@/lib/sri/ride-pdf'
import type { Factura, ConfiguracionFacturacion } from '@/types'

export async function GET(req: NextRequest) {
  const facturaId = req.nextUrl.searchParams.get('id')
  if (!facturaId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  try {
    const supabase = await crearClienteServidor()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const [{ data: facturaData }, { data: configData }] = await Promise.all([
      supabase.from('facturas').select('*').eq('id', facturaId).single(),
      supabase.from('configuracion_facturacion').select('*').single(),
    ])

    if (!facturaData) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (!configData)  return NextResponse.json({ error: 'Configuración SRI no encontrada' }, { status: 422 })

    const factura = facturaData as Factura
    const config  = configData as ConfiguracionFacturacion

    const pdfBuffer = await generarRIDEBuffer(factura, config)

    const numFac = factura.numero_factura
      ?? `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="RIDE-${numFac}.pdf"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err: unknown) {
    console.error('[facturacion/ride]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error al generar el RIDE' }, { status: 500 })
  }
}
