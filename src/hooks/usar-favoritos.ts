'use client'

import { useState, useEffect, useCallback } from 'react'

const CLAVE = 'tienda_favoritos'

export function usarFavoritos() {
  const [favoritos, setFavoritos] = useState<string[]>([])

  useEffect(() => {
    try {
      setFavoritos(JSON.parse(localStorage.getItem(CLAVE) ?? '[]'))
    } catch { setFavoritos([]) }
  }, [])

  const esFavorito = useCallback((id: string) => favoritos.includes(id), [favoritos])

  const toggleFavorito = useCallback((id: string) => {
    setFavoritos(prev => {
      const nuevos = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem(CLAVE, JSON.stringify(nuevos))
      return nuevos
    })
  }, [])

  return { favoritos, esFavorito, toggleFavorito, conteo: favoritos.length }
}
