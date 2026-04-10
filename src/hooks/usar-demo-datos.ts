'use client'

import { useState, useEffect } from 'react'
import { usarModoDemo } from '@/components/providers/demo-provider'
import { DemoStore, EVENTO_DEMO } from '@/lib/supabase/demo-store'

/**
 * En modo demo: mantiene los datos sincronizados con localStorage (DemoStore).
 * - Al montar: inicializa DemoStore con datosServidor si la tabla no existe aún.
 * - Escucha el evento `demo-actualizado` y re-renderiza con los datos nuevos.
 * - Ignora actualizaciones posteriores de datosServidor (evita que router.refresh()
 *   pise los cambios guardados en DemoStore).
 *
 * En modo normal: devuelve datosServidor tal cual.
 */
export function useDemoDatos<T>(tabla: string, datosServidor: T[]): T[] {
  const esDemo = usarModoDemo()

  // Siempre inicializar con datosServidor para que SSR y cliente coincidan (evita React #418).
  // El useEffect carga los datos demo de localStorage después de la hidratación.
  const [datos, setDatos] = useState<T[]>(datosServidor)

  useEffect(() => {
    if (!esDemo) return

    // Primera vez: si la tabla no existe en DemoStore, cargarla con datos del servidor
    if (!DemoStore.has(tabla)) {
      DemoStore.inicializar(tabla, datosServidor)
    }
    // Siempre leer de DemoStore al montar (puede haber cambios previos)
    setDatos(DemoStore.obtener(tabla) as T[])

    // Escuchar cambios futuros (insert/update/delete via proxy)
    function onCambio(e: Event) {
      const { tabla: t } = (e as CustomEvent<{ tabla: string }>).detail
      if (t === tabla) setDatos(DemoStore.obtener(tabla) as T[])
    }

    window.addEventListener(EVENTO_DEMO, onCambio)
    return () => window.removeEventListener(EVENTO_DEMO, onCambio)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, esDemo]) // Intencionalmente sin datosServidor → no resetear DemoStore en cada refresh

  return datos
}
