import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function DELETE(req: NextRequest) {
  try {
    const { facturaId } = await req.json() as { facturaId: string }
    if (!facturaId) return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })

    const supabase = await crearClienteServidor()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { data: factura } = await supabase
      .from('facturas')
      .select('id, estado, numero_factura')
      .eq('id', facturaId)
      .single()

    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })

    if (factura.estado !== 'borrador' && factura.estado !== 'rechazada') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar facturas en estado borrador o rechazadas' },
        { status: 422 }
      )
    }

    const { error } = await supabase.from('facturas').delete().eq('id', facturaId)
    if (error) throw error

    return NextResponse.json({ ok: true, numeroFactura: factura.numero_factura })
  } catch (err: unknown) {
    console.error('[facturacion/eliminar]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
