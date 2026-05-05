/**
 * GET /api/facturacion/xml?id={facturaId}
 * Descarga el XML firmado de una factura autorizada
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function GET(req: NextRequest) {
  const facturaId = req.nextUrl.searchParams.get('id')
  if (!facturaId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: factura } = await supabase
    .from('facturas')
    .select('xml_firmado, clave_acceso, numero_secuencial')
    .eq('id', facturaId)
    .single()

  if (!factura?.xml_firmado) {
    return NextResponse.json({ error: 'XML no disponible' }, { status: 404 })
  }

  const nombre = `${factura.clave_acceso ?? factura.numero_secuencial}.xml`
  return new NextResponse(factura.xml_firmado, {
    headers: {
      'Content-Type':        'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombre}"`,
    },
  })
}
