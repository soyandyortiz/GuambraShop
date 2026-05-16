/**
 * GET /api/proformas/pdf?id={proformaId}
 * Descarga el PDF de una proforma existente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { generarProformaBuffer } from '@/lib/proforma-pdf'
import type { Proforma } from '@/types'

export async function GET(req: NextRequest) {
  const proformaId = req.nextUrl.searchParams.get('id')
  if (!proformaId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  try {
    const supabase = await crearClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const [{ data: proformaData }, { data: tienda }] = await Promise.all([
      supabase.from('proformas').select('*').eq('id', proformaId).single(),
      supabase.from('configuracion_tienda').select('nombre_tienda, simbolo_moneda, logo_url').single(),
    ])

    if (!proformaData) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })

    const proforma = proformaData as Proforma
    const pdfBuffer = await generarProformaBuffer(
      proforma,
      tienda?.nombre_tienda ?? 'Tienda',
      tienda?.simbolo_moneda ?? '$',
      tienda?.logo_url ?? null,
    )

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Proforma-${proforma.numero}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[proformas/pdf] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
