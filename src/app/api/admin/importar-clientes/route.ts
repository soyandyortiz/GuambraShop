/**
 * POST /api/admin/importar-clientes
 * Lee todos los pedidos sin cliente_id, agrupa por email,
 * crea un registro en `clientes` por cada email único y
 * vincula los pedidos existentes.
 * Retorna: { creados, vinculados, omitidos }
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
    const reciente = grupo[0] // ya viene ordenado por creado_en desc
    const fac = reciente.datos_facturacion as Record<string, string> | null

    // ¿Ya existe un cliente con ese email?
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let clienteId: string

    if (existente) {
      clienteId = existente.id
    } else {
      const { data: nuevo, error: errIns } = await supabase
        .from('clientes')
        .insert({
          tipo_identificacion: mapTipo(fac?.tipo_identificacion),
          identificacion:      fac?.identificacion ?? '9999999999999',
          razon_social:        reciente.nombres,
          email,
          telefono:  reciente.whatsapp  || null,
          provincia: reciente.provincia || null,
          ciudad:    reciente.ciudad    || null,
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
