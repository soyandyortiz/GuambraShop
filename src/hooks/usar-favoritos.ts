'use client'

import { useFavoritosContext } from '@/components/providers/favoritos-provider'

export function usarFavoritos() {
  return useFavoritosContext()
}
