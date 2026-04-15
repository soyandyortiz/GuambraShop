'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

export interface ConteosAdmin {
  pedidosPendientes: number
  citasPendientes: number   // pendiente + reservada
  cargando: boolean
}

export function usarConteosAdmin(): ConteosAdmin {
  const [pedidosPendientes, setPedidosPendientes] = useState(0)
  const [citasPendientes, setCitasPendientes]     = useState(0)
  const [cargando, setCargando]                   = useState(true)
  // Nombre de canal único por instancia del hook — evita colisión cuando el
  // cliente Supabase es singleton y múltiples componentes llaman al hook.
  const canalId = useRef(`conteos-admin-${Math.random().toString(36).slice(2)}`)

  const fetchConteos = useCallback(async () => {
    const supabase = crearClienteSupabase()
    const [{ count: cp }, { count: cc }] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente'),
      supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['pendiente', 'reservada']),
    ])
    setPedidosPendientes(cp ?? 0)
    setCitasPendientes(cc ?? 0)
    setCargando(false)
  }, [])

  useEffect(() => {
    fetchConteos()

    // Suscripción en tiempo real — actualiza al cambiar pedidos o citas
    const supabase = crearClienteSupabase()
    const canal = supabase
      .channel(canalId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, fetchConteos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' },   fetchConteos)
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [fetchConteos])

  return { pedidosPendientes, citasPendientes, cargando }
}
