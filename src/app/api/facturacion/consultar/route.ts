/**
 * POST /api/facturacion/consultar
 * Body: { facturaId: string }
 *
 * Re-consulta el estado de autorización en el SRI para facturas
 * que quedaron en estado "enviada" (RECIBIDA pero sin respuesta de autorización).
 */

import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { consultarAutorizacion } from '@/lib/sri/soap-sri'
import type { Factura, ConfiguracionFacturacion } from '@/types'

export async function POST(req: NextRequest) {
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

    const [{ data: facturaData }, { data: configData }] = await Promise.all([
      supabase.from('facturas').select('id, estado, clave_acceso, numero_secuencial').eq('id', facturaId).single(),
      supabase.from('configuracion_facturacion').select('ambiente, codigo_establecimiento, punto_emision').single(),
    ])

    if (!facturaData) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (!configData)  return NextResponse.json({ error: 'Configuración SRI no encontrada' }, { status: 422 })

    const factura = facturaData as Pick<Factura, 'id' | 'estado' | 'clave_acceso' | 'numero_secuencial'>
    const config  = configData as Pick<ConfiguracionFacturacion, 'ambiente' | 'codigo_establecimiento' | 'punto_emision'>

    if (factura.estado !== 'enviada') {
      return NextResponse.json({ error: `La factura está en estado "${factura.estado}", no "enviada"` }, { status: 422 })
    }
    if (!factura.clave_acceso) {
      return NextResponse.json({ error: 'La factura no tiene clave de acceso guardada' }, { status: 422 })
    }

    const autorizacion = await consultarAutorizacion(factura.clave_acceso, config.ambiente)

    if (autorizacion.ok) {
      const numeroFactura = `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${factura.numero_secuencial.padStart(9,'0')}`
      await supabase.from('facturas').update({
        estado:              'autorizada',
        numero_autorizacion: autorizacion.numeroAutorizacion,
        numero_factura:      numeroFactura,
        fecha_autorizacion:  autorizacion.fechaAutorizacion
          ? new Date(autorizacion.fechaAutorizacion).toISOString()
          : new Date().toISOString(),
        error_sri: null,
      }).eq('id', facturaId)

      return NextResponse.json({
        ok: true,
        estado: 'autorizada',
        numeroAutorizacion: autorizacion.numeroAutorizacion,
      })
    }

    if (autorizacion.mensajes.length > 0) {
      const errorMsg = autorizacion.mensajes
        .map(m => `${m.identificador}: ${m.mensaje}`)
        .join(' | ')
      await supabase.from('facturas').update({ estado: 'rechazada', error_sri: errorMsg }).eq('id', facturaId)
      return NextResponse.json({ ok: false, estado: 'rechazada', mensajes: autorizacion.mensajes })
    }

    // Aún no tiene respuesta del SRI (sigue en cola)
    return NextResponse.json({ ok: true, estado: 'enviada', pendiente: true })

  } catch (err: unknown) {
    console.error('[facturacion/consultar]', err)
    return NextResponse.json({ error: (err as Error).message ?? 'Error interno' }, { status: 500 })
  }
}
