'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

export interface ConteosAdmin {
  pedidosPendientes: number
  citasPendientes: number       // pendiente + reservada
  solicitudesNuevas: number     // estado = 'nueva'
  alquileresVencidos: number    // estado = 'vencido'
  cargando: boolean
}

export function usarConteosAdmin(): ConteosAdmin {
  const [pedidosPendientes, setPedidosPendientes]   = useState(0)
  const [citasPendientes, setCitasPendientes]       = useState(0)
  const [solicitudesNuevas, setSolicitudesNuevas]   = useState(0)
  const [alquileresVencidos, setAlquileresVencidos] = useState(0)
  const [cargando, setCargando]                     = useState(true)
  // Nombre de canal único por instancia del hook — evita colisión cuando el
  // cliente Supabase es singleton y múltiples componentes llaman al hook.
  const canalId = useRef(`conteos-admin-${Math.random().toString(36).slice(2)}`)

  const fetchConteos = useCallback(async () => {
    const supabase = crearClienteSupabase()
    const [{ count: cp }, { count: cc }, { count: cs }, { count: cav }] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['pendiente_pago', 'pendiente_validacion']),
      supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['pendiente', 'reservada']),
      supabase
        .from('solicitudes_evento')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'nueva'),
      supabase
        .from('alquileres')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'vencido'),
    ])
    setPedidosPendientes(cp ?? 0)
    setCitasPendientes(cc ?? 0)
    setSolicitudesNuevas(cs ?? 0)
    setAlquileresVencidos(cav ?? 0)
    setCargando(false)
  }, [])

  useEffect(() => {
    fetchConteos()

    // Suscripción en tiempo real — actualiza al cambiar pedidos o citas
    const supabase = crearClienteSupabase()
    const canal = supabase
      .channel(canalId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },           fetchConteos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' },             fetchConteos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_evento' }, fetchConteos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alquileres' },         fetchConteos)
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [fetchConteos])

  return { pedidosPendientes, citasPendientes, solicitudesNuevas, alquileresVencidos, cargando }
}
