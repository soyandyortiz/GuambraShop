import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatearPrecio(precio: number, simbolo = '$'): string {
  return `${simbolo}${precio.toFixed(2)}`
}

export function calcularDescuento(precio: number, precioDescuento: number): number {
  return Math.round(((precio - precioDescuento) / precio) * 100)
}

export function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function generarSessionId(): string {
  if (typeof window === 'undefined') return ''
  const clave = 'tienda_session_id'
  let id = localStorage.getItem(clave)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(clave, id)
  }
  return id
}
