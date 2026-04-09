/**
 * Definición de paletas de colores profesionales para la tienda.
 * Cada paleta está diseñada para mantener el contraste y la legibilidad.
 */

export interface Paleta {
  id: string
  nombre: string
  primary: string
  hover: string
  foreground: string
  subtle: string
}

export const PALETAS: Paleta[] = [
  {
    id: 'rojo-vital',
    nombre: 'Rojo Pasión',
    primary: '#ef4444',
    hover: '#dc2626',
    foreground: '#ffffff',
    subtle: '#fef2f2'
  },
  {
    id: 'azul-medianoche',
    nombre: 'Azul Medianoche',
    primary: '#1e293b',
    hover: '#0f172a',
    foreground: '#ffffff',
    subtle: '#f1f5f9'
  },
  {
    id: 'indigo-moderno',
    nombre: 'Índigo Moderno',
    primary: '#4f46e5',
    hover: '#4338ca',
    foreground: '#ffffff',
    subtle: '#eef2ff'
  },
  {
    id: 'bosque-profundo',
    nombre: 'Verde Bosque',
    primary: '#065f46',
    hover: '#064e3b',
    foreground: '#ffffff',
    subtle: '#ecfdf5'
  },
  {
    id: 'oro-premium',
    nombre: 'Oro Premium',
    primary: '#854d0e',
    hover: '#713f12',
    foreground: '#ffffff',
    subtle: '#fefce8'
  },
  {
    id: 'rosa-elegante',
    nombre: 'Rosa Elegante',
    primary: '#be185d',
    hover: '#9d174d',
    foreground: '#ffffff',
    subtle: '#fff1f2'
  },
  {
    id: 'negro-total',
    nombre: 'Negro Total',
    primary: '#000000',
    hover: '#1a1a1a',
    foreground: '#ffffff',
    subtle: '#f3f4f6'
  },
  {
    id: 'slate-pro',
    nombre: 'Gris Pizarra',
    primary: '#334155',
    hover: '#1e293b',
    foreground: '#ffffff',
    subtle: '#f8fafc'
  }
]

/**
 * Obtiene la paleta completa basada en el color primario almacenado.
 * Si no coincide, genera una paleta "al vuelo" o devuelve la por defecto.
 */
export function obtenerPaleta(primaryColor?: string | null): Paleta {
  if (!primaryColor) return PALETAS[0]
  
  const encontrada = PALETAS.find(p => p.primary.toLowerCase() === primaryColor.toLowerCase())
  if (encontrada) return encontrada

  // Si es un color personalizado no registrado, devolvemos una versión segura
  // (Esto evita romper el diseño si se metió un color manual en la DB)
  return {
    id: 'custom',
    nombre: 'Personalizado',
    primary: primaryColor,
    hover: primaryColor, // Idealmente oscurecerlo
    foreground: '#ffffff',
    subtle: `${primaryColor}10`
  }
}
