'use client'

import { useCarritoContext } from '@/components/providers/carrito-provider'

export type { ItemCarrito } from '@/components/providers/carrito-provider'

export function usarCarrito() {
  return useCarritoContext()
}
