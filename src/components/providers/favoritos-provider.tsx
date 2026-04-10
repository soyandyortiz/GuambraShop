'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const CLAVE = 'tienda_favoritos'

interface FavoritosContextType {
  favoritos: string[]
  esFavorito: (id: string) => boolean
  toggleFavorito: (id: string) => void
  conteo: number
}

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined)

export function FavoritosProvider({ children }: { children: ReactNode }) {
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

  return (
    <FavoritosContext.Provider value={{ favoritos, esFavorito, toggleFavorito, conteo: favoritos.length }}>
      {children}
    </FavoritosContext.Provider>
  )
}

export function useFavoritosContext() {
  const ctx = useContext(FavoritosContext)
  if (!ctx) throw new Error('useFavoritosContext debe usarse dentro de FavoritosProvider')
  return ctx
}
