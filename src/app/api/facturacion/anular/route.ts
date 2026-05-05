/**
 * POST /api/facturacion/anular
 * Body: { facturaId: string; motivo: string }
 *
 * Marca la factura como "anulada" en la BD local.
 * La anulación formal ante el SRI debe completarse manualmente
 * en el portal web del SRI (cel.sri.gob.ec o celcer.sri.gob.ec).
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function POST(req: NextRequest) {
  try {
    const { facturaId, motivo } = await req.json() as { facturaId: string; motivo: string }
    if (!facturaId) return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })
    if (!motivo?.trim()) return NextResponse.json({ error: 'El motivo de anulación es obligatorio' }, { status: 400 })

    const supabase = await crearClienteServidor()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { data: factura } = await supabase
      .from('facturas')
      .select('id, estado, numero_factura, numero_autorizacion')
      .eq('id', facturaId)
      .single()

    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (factura.estado === 'anulada') {
      return NextResponse.json({ error: 'La factura ya está anulada' }, { status: 422 })
    }

    await supabase.from('facturas').update({
      estado:            'anulada',
      motivo_anulacion:  motivo.trim(),
    }).eq('id', facturaId)

    return NextResponse.json({
      ok: true,
      eraAutorizada: factura.estado === 'autorizada',
      numeroFactura: factura.numero_factura,
      numeroAutorizacion: factura.numero_autorizacion,
    })
  } catch (err: unknown) {
    console.error('[facturacion/anular]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
