/**
 * POST /api/pedidos/crear-temporal
 *
 * Crea un pedido temporal con expiración de 15 minutos.
 * NO guarda el pedido definitivo — espera la subida del comprobante.
 * Bloquea citas y alquileres como 'reservada/reservado' para evitar doble reserva.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      tipo, nombres, email, whatsapp,
      provincia, ciudad, direccion, detalles_direccion,
      items, simbolo_moneda, subtotal, descuento_cupon,
      cupon_codigo, costo_envio, total, datos_facturacion,
    } = body

    if (!nombres || !email || !whatsapp || !items?.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const admin = crearAdmin()

    // Validación del cupón en servidor (re-verifica antes de guardar el pedido)
    let descuentoValidado = 0
    if (cupon_codigo) {
      const { data: cupon } = await admin
        .from('cupones')
        .select('tipo_descuento, valor_descuento, compra_minima, max_usos, usos_actuales, esta_activo, inicia_en, vence_en')
        .eq('codigo', cupon_codigo)
        .eq('esta_activo', true)
        .single()

      if (!cupon) {
        return NextResponse.json({ error: 'Cupón no válido' }, { status: 422 })
      }
      const ahora = new Date()
      if (cupon.inicia_en && new Date(cupon.inicia_en) > ahora) {
        return NextResponse.json({ error: 'Cupón no disponible aún' }, { status: 422 })
      }
      if (cupon.vence_en && new Date(cupon.vence_en) < ahora) {
        return NextResponse.json({ error: 'Cupón vencido' }, { status: 422 })
      }
      if (cupon.max_usos && cupon.usos_actuales >= cupon.max_usos) {
        return NextResponse.json({ error: 'Cupón agotado' }, { status: 422 })
      }
      const sub = Number(subtotal)
      if (cupon.compra_minima && sub < cupon.compra_minima) {
        return NextResponse.json({ error: `Compra mínima requerida: ${cupon.compra_minima}` }, { status: 422 })
      }
      // Recalcular descuento en el servidor
      descuentoValidado = cupon.tipo_descuento === 'porcentaje'
        ? +(sub * cupon.valor_descuento / 100).toFixed(2)
        : +Math.min(cupon.valor_descuento, sub).toFixed(2)
    }

    // 1. Crear el pedido temporal (el trigger genera numero_temporal)
    const { data: temporal, error: errTemporal } = await admin
      .from('pedidos_temporales')
      .insert({
        tipo, nombres, email, whatsapp,
        provincia: provincia ?? null,
        ciudad: ciudad ?? null,
        direccion: direccion ?? null,
        detalles_direccion: detalles_direccion ?? null,
        items,
        simbolo_moneda: simbolo_moneda ?? '$',
        subtotal:        +Number(subtotal).toFixed(2),
        descuento_cupon: descuentoValidado,
        cupon_codigo:    cupon_codigo ?? null,
        costo_envio:     +Number(costo_envio).toFixed(2),
        total:           +(Number(subtotal) - descuentoValidado + Number(costo_envio ?? 0)).toFixed(2),
        datos_facturacion: datos_facturacion ?? null,
      })
      .select('id, numero_temporal, expira_en')
      .single()

    if (errTemporal || !temporal) {
      console.error('[crear-temporal]', errTemporal)
      return NextResponse.json({ error: 'Error al crear pedido temporal' }, { status: 500 })
    }

    const citasIds: string[] = []
    const alquileresIds: string[] = []

    // 2. Bloquear citas (servicios) como 'reservada'
    const servicios = (items as any[]).filter(i => i.tipo_producto === 'servicio' && i.cita)
    if (servicios.length > 0) {
      const { data: citasCreadas, error: errCitas } = await admin
        .from('citas')
        .insert(
          servicios.map(i => ({
            producto_id: i.producto_id,
            fecha:       i.cita.fecha,
            hora_inicio: i.cita.hora_inicio,
            hora_fin:    i.cita.hora_fin,
            empleado_id: i.cita.empleado_id ?? null,
            estado:      'reservada',
          }))
        )
        .select('id')

      if (errCitas) {
        // Limpiar el temporal si falla el bloqueo de citas
        await admin.from('pedidos_temporales').delete().eq('id', temporal.id)
        return NextResponse.json({ error: 'Horario ya reservado. Elige otro.' }, { status: 409 })
      }
      citasCreadas?.forEach(c => citasIds.push(c.id))
    }

    // 3. Bloquear alquileres como 'reservado'
    const alquileres = (items as any[]).filter(i => i.tipo_producto === 'alquiler' && i.alquiler)
    if (alquileres.length > 0) {
      const { data: alqCreados, error: errAlq } = await admin
        .from('alquileres')
        .insert(
          alquileres.map(i => ({
            producto_id:  i.producto_id,
            fecha_inicio: i.alquiler.fecha_inicio,
            fecha_fin:    i.alquiler.fecha_fin,
            dias:         i.alquiler.dias,
            cantidad:     i.cantidad,
            hora_recogida: i.alquiler.hora_recogida ?? null,
            estado:       'reservado',
          }))
        )
        .select('id')

      if (errAlq) {
        // Limpiar temporal y citas si falla
        if (citasIds.length) await admin.from('citas').delete().in('id', citasIds)
        await admin.from('pedidos_temporales').delete().eq('id', temporal.id)
        return NextResponse.json({ error: 'Sin disponibilidad para esas fechas.' }, { status: 409 })
      }
      alqCreados?.forEach(a => alquileresIds.push(a.id))
    }

    // 4. Guardar los IDs de citas/alquileres en el temporal para limpiarlos si expira
    if (citasIds.length > 0 || alquileresIds.length > 0) {
      await admin
        .from('pedidos_temporales')
        .update({ citas_ids: citasIds, alquileres_ids: alquileresIds })
        .eq('id', temporal.id)
    }

    return NextResponse.json({
      ok: true,
      numero_temporal: temporal.numero_temporal,
      expira_en:       temporal.expira_en,
      id:              temporal.id,
    })
  } catch (err) {
    console.error('[crear-temporal]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
