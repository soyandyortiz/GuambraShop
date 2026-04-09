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
  // ── Rojos & Rosas ─────────────────────────────────────────────
  {
    id: 'rojo-vital',
    nombre: 'Rojo Pasión',
    primary: '#ef4444',
    hover: '#dc2626',
    foreground: '#ffffff',
    subtle: '#fef2f2',
  },
  {
    id: 'rojo-carmesi',
    nombre: 'Carmesí',
    primary: '#b91c1c',
    hover: '#991b1b',
    foreground: '#ffffff',
    subtle: '#fef2f2',
  },
  {
    id: 'rosa-elegante',
    nombre: 'Rosa Elegante',
    primary: '#be185d',
    hover: '#9d174d',
    foreground: '#ffffff',
    subtle: '#fff1f2',
  },
  {
    id: 'rosa-fucsia',
    nombre: 'Fucsia',
    primary: '#db2777',
    hover: '#be185d',
    foreground: '#ffffff',
    subtle: '#fdf2f8',
  },
  {
    id: 'rose-soft',
    nombre: 'Rosa Suave',
    primary: '#f43f5e',
    hover: '#e11d48',
    foreground: '#ffffff',
    subtle: '#fff1f2',
  },

  // ── Naranjas & Amarillos ───────────────────────────────────────
  {
    id: 'naranja-energia',
    nombre: 'Naranja Energía',
    primary: '#ea580c',
    hover: '#c2410c',
    foreground: '#ffffff',
    subtle: '#fff7ed',
  },
  {
    id: 'naranja-mango',
    nombre: 'Mango',
    primary: '#f97316',
    hover: '#ea580c',
    foreground: '#ffffff',
    subtle: '#fff7ed',
  },
  {
    id: 'ambar-dorado',
    nombre: 'Ámbar Dorado',
    primary: '#d97706',
    hover: '#b45309',
    foreground: '#ffffff',
    subtle: '#fffbeb',
  },
  {
    id: 'oro-premium',
    nombre: 'Oro Premium',
    primary: '#854d0e',
    hover: '#713f12',
    foreground: '#ffffff',
    subtle: '#fefce8',
  },
  {
    id: 'amarillo-sol',
    nombre: 'Sol',
    primary: '#ca8a04',
    hover: '#a16207',
    foreground: '#ffffff',
    subtle: '#fefce8',
  },

  // ── Verdes ────────────────────────────────────────────────────
  {
    id: 'verde-esmeralda',
    nombre: 'Esmeralda',
    primary: '#059669',
    hover: '#047857',
    foreground: '#ffffff',
    subtle: '#ecfdf5',
  },
  {
    id: 'bosque-profundo',
    nombre: 'Verde Bosque',
    primary: '#065f46',
    hover: '#064e3b',
    foreground: '#ffffff',
    subtle: '#ecfdf5',
  },
  {
    id: 'verde-lima',
    nombre: 'Lima Fresco',
    primary: '#65a30d',
    hover: '#4d7c0f',
    foreground: '#ffffff',
    subtle: '#f7fee7',
  },
  {
    id: 'verde-oliva',
    nombre: 'Oliva Natural',
    primary: '#3f6212',
    hover: '#365314',
    foreground: '#ffffff',
    subtle: '#f7fee7',
  },
  {
    id: 'teal-fresco',
    nombre: 'Teal',
    primary: '#0d9488',
    hover: '#0f766e',
    foreground: '#ffffff',
    subtle: '#f0fdfa',
  },

  // ── Azules & Celestes ──────────────────────────────────────────
  {
    id: 'azul-cielo',
    nombre: 'Azul Cielo',
    primary: '#0284c7',
    hover: '#0369a1',
    foreground: '#ffffff',
    subtle: '#f0f9ff',
  },
  {
    id: 'azul-ocean',
    nombre: 'Océano',
    primary: '#1d4ed8',
    hover: '#1e40af',
    foreground: '#ffffff',
    subtle: '#eff6ff',
  },
  {
    id: 'azul-medianoche',
    nombre: 'Azul Medianoche',
    primary: '#1e293b',
    hover: '#0f172a',
    foreground: '#ffffff',
    subtle: '#f1f5f9',
  },
  {
    id: 'navy-clasico',
    nombre: 'Navy Clásico',
    primary: '#1e3a8a',
    hover: '#1e3070',
    foreground: '#ffffff',
    subtle: '#eff6ff',
  },
  {
    id: 'cyan-fresh',
    nombre: 'Cian Fresco',
    primary: '#0891b2',
    hover: '#0e7490',
    foreground: '#ffffff',
    subtle: '#ecfeff',
  },

  // ── Púrpuras & Violetas ────────────────────────────────────────
  {
    id: 'indigo-moderno',
    nombre: 'Índigo Moderno',
    primary: '#4f46e5',
    hover: '#4338ca',
    foreground: '#ffffff',
    subtle: '#eef2ff',
  },
  {
    id: 'violeta-real',
    nombre: 'Violeta Real',
    primary: '#7c3aed',
    hover: '#6d28d9',
    foreground: '#ffffff',
    subtle: '#f5f3ff',
  },
  {
    id: 'purpura-intenso',
    nombre: 'Púrpura Intenso',
    primary: '#9333ea',
    hover: '#7e22ce',
    foreground: '#ffffff',
    subtle: '#faf5ff',
  },
  {
    id: 'morado-uva',
    nombre: 'Uva',
    primary: '#6b21a8',
    hover: '#581c87',
    foreground: '#ffffff',
    subtle: '#faf5ff',
  },

  // ── Neutros ───────────────────────────────────────────────────
  {
    id: 'slate-pro',
    nombre: 'Gris Pizarra',
    primary: '#334155',
    hover: '#1e293b',
    foreground: '#ffffff',
    subtle: '#f8fafc',
  },
  {
    id: 'gris-acero',
    nombre: 'Acero',
    primary: '#4b5563',
    hover: '#374151',
    foreground: '#ffffff',
    subtle: '#f9fafb',
  },
  {
    id: 'negro-total',
    nombre: 'Negro Total',
    primary: '#000000',
    hover: '#1a1a1a',
    foreground: '#ffffff',
    subtle: '#f3f4f6',
  },
  {
    id: 'carbon',
    nombre: 'Carbón',
    primary: '#18181b',
    hover: '#09090b',
    foreground: '#ffffff',
    subtle: '#f4f4f5',
  },
]

/**
 * Obtiene la paleta completa basada en el color primario almacenado.
 * Si no coincide, genera una paleta "al vuelo" o devuelve la por defecto.
 */
export function obtenerPaleta(primaryColor?: string | null): Paleta {
  if (!primaryColor) return PALETAS[0]

  const encontrada = PALETAS.find(p => p.primary.toLowerCase() === primaryColor.toLowerCase())
  if (encontrada) return encontrada

  // Color personalizado no registrado — devuelve versión segura
  return {
    id: 'custom',
    nombre: 'Personalizado',
    primary: primaryColor,
    hover: primaryColor,
    foreground: '#ffffff',
    subtle: `${primaryColor}10`,
  }
}
