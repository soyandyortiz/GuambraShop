/**
 * POST /api/admin/importar-clientes
 * Lee todos los pedidos sin cliente_id, agrupa por email,
 * crea un registro en `clientes` por cada email único y
 * vincula los pedidos existentes.
 * Retorna: { creados, vinculados, omitidos }
 *
 * Regla de datos: siempre se prefieren los datos de facturación
 * con identificación real (cedula/ruc/pasaporte) sobre consumidor final.
 * Un cliente con datos completos NUNCA se sobrescribe con datos de CF.
 */

import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

const MAPA_TIPO: Record<string, string> = {
  '04': 'ruc',
  '05': 'cedula',
  '06': 'pasaporte',
  '07': 'consumidor_final',
}

function mapTipo(codigo?: string): string {
  return MAPA_TIPO[codigo ?? ''] ?? 'consumidor_final'
}

function esConsumidorFinal(fac: Record<string, string> | null): boolean {
  return !fac || fac.tipo_identificacion === '07' || !fac.identificacion || fac.identificacion === '9999999999999'
}

type PedidoImport = {
  id: string
  nombres: string
  email: string
  whatsapp: string | null
  provincia: string | null
  ciudad: string | null
  datos_facturacion: unknown
  creado_en: string
}

/** Devuelve el pedido con los mejores datos de facturación del grupo.
 *  Prioridad: datos reales (cedula/ruc) > consumidor_final.
 *  Si hay empate, el más reciente (grupo ya viene desc por creado_en). */
function mejorPedido(grupo: PedidoImport[]): PedidoImport {
  const conDatosReales = grupo.filter(p => !esConsumidorFinal(p.datos_facturacion as Record<string, string> | null))
  return conDatosReales[0] ?? grupo[0]
}

export async function POST() {
  const supabase = await crearClienteServidor()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user.id).single()
  if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Pedidos sin cliente vinculado, excluyendo emails de ventas manuales sin email real
  const { data: pedidos, error: errPedidos } = await supabase
    .from('pedidos')
    .select('id, nombres, email, whatsapp, provincia, ciudad, datos_facturacion, creado_en')
    .is('cliente_id', null)
    .not('email', 'like', '%@venta.local')
    .not('email', 'like', '%@manual.local')
    .order('creado_en', { ascending: false })

  if (errPedidos) return NextResponse.json({ error: errPedidos.message }, { status: 500 })
  if (!pedidos || pedidos.length === 0) {
    return NextResponse.json({ creados: 0, vinculados: 0, omitidos: 0 })
  }

  // Agrupar por email
  const grupos = new Map<string, typeof pedidos>()
  for (const p of pedidos) {
    const lista = grupos.get(p.email) ?? []
    lista.push(p)
    grupos.set(p.email, lista)
  }

  let creados   = 0
  let vinculados = 0
  let omitidos  = 0

  for (const [email, grupo] of grupos) {
    // Usar el pedido con mejores datos de facturación
    const mejor = mejorPedido(grupo)
    const fac   = mejor.datos_facturacion as Record<string, string> | null

    // ¿Ya existe un cliente con ese email?
    const { data: existente } = await supabase
      .from('clientes')
      .select('id, tipo_identificacion, identificacion')
      .eq('email', email)
      .maybeSingle()

    let clienteId: string

    if (existente) {
      clienteId = existente.id

      // Si el cliente existente tiene datos de consumidor_final pero hay datos reales
      // en algún pedido, actualizamos el cliente con los datos reales.
      const clienteEsCF = existente.tipo_identificacion === 'consumidor_final'
        || existente.identificacion === '9999999999999'
      const hayDatosReales = !esConsumidorFinal(fac)

      if (clienteEsCF && hayDatosReales) {
        await supabase
          .from('clientes')
          .update({
            tipo_identificacion: mapTipo(fac?.tipo_identificacion),
            identificacion:      fac?.identificacion,
            razon_social:        mejor.nombres,
            telefono:            mejor.whatsapp  || null,
            provincia:           mejor.provincia || null,
            ciudad:              mejor.ciudad    || null,
          })
          .eq('id', existente.id)
      }
      // Si el cliente ya tiene datos reales, no se toca aunque haya pedidos de CF.
    } else {
      const { data: nuevo, error: errIns } = await supabase
        .from('clientes')
        .insert({
          tipo_identificacion: mapTipo(fac?.tipo_identificacion),
          identificacion:      fac?.identificacion ?? '9999999999999',
          razon_social:        mejor.nombres,
          email,
          telefono:  mejor.whatsapp  || null,
          provincia: mejor.provincia || null,
          ciudad:    mejor.ciudad    || null,
        })
        .select('id')
        .single()

      if (errIns || !nuevo) { omitidos += grupo.length; continue }
      clienteId = nuevo.id
      creados++
    }

    // Vincular todos los pedidos del grupo
    const { error: errUp } = await supabase
      .from('pedidos')
      .update({ cliente_id: clienteId })
      .in('id', grupo.map(p => p.id))

    if (errUp) { omitidos += grupo.length }
    else       { vinculados += grupo.length }
  }

  return NextResponse.json({ creados, vinculados, omitidos })
}
