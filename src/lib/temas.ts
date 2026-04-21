/**
 * Temas base del sistema.
 * Cada tema define todas las variables CSS que controlan el aspecto visual completo
 * de la tienda (fondos, textos, bordes, cards, inputs).
 * El color de acento (--primary) se aplica por separado desde `paletas.ts`.
 */

export interface Tema {
  id: string
  nombre: string
  descripcion: string
  /** Colores de preview para la card de selección */
  preview: {
    bg: string
    card: string
    text: string
    muted: string
    border: string
  }
  vars: {
    '--background': string
    '--background-subtle': string
    '--foreground': string
    '--foreground-muted': string
    '--border': string
    '--border-strong': string
    '--card': string
    '--card-border': string
    '--input-bg': string
    '--input-border': string
  }
}

export const TEMAS: Tema[] = [
  {
    id: 'claro',
    nombre: 'Claro',
    descripcion: 'Limpio y luminoso',
    preview: {
      bg: '#f1f5f9',
      card: '#ffffff',
      text: '#111827',
      muted: '#6b7280',
      border: '#dde3ed',
    },
    vars: {
      '--background':        '#f1f5f9',
      '--background-subtle': '#e8edf3',
      '--foreground':        '#111827',
      '--foreground-muted':  '#6b7280',
      '--border':            '#dde3ed',
      '--border-strong':     '#c8d0dc',
      '--card':              '#ffffff',
      '--card-border':       '#e2e8f0',
      '--input-bg':          '#f8fafc',
      '--input-border':      '#c8d0dc',
    },
  },
  {
    id: 'oscuro',
    nombre: 'Oscuro',
    descripcion: 'Elegante y moderno',
    preview: {
      bg: '#0f172a',
      card: '#1e293b',
      text: '#f1f5f9',
      muted: '#94a3b8',
      border: '#334155',
    },
    vars: {
      '--background':        '#0f172a',
      '--background-subtle': '#1e293b',
      '--foreground':        '#f1f5f9',
      '--foreground-muted':  '#94a3b8',
      '--border':            '#334155',
      '--border-strong':     '#475569',
      '--card':              '#1e293b',
      '--card-border':       '#334155',
      '--input-bg':          '#0f172a',
      '--input-border':      '#334155',
    },
  },
  {
    id: 'midnight',
    nombre: 'Midnight',
    descripcion: 'Negro puro, máximo contraste',
    preview: {
      bg: '#09090b',
      card: '#18181b',
      text: '#fafafa',
      muted: '#a1a1aa',
      border: '#27272a',
    },
    vars: {
      '--background':        '#09090b',
      '--background-subtle': '#18181b',
      '--foreground':        '#fafafa',
      '--foreground-muted':  '#a1a1aa',
      '--border':            '#27272a',
      '--border-strong':     '#3f3f46',
      '--card':              '#18181b',
      '--card-border':       '#27272a',
      '--input-bg':          '#09090b',
      '--input-border':      '#27272a',
    },
  },
  {
    id: 'calido',
    nombre: 'Cálido',
    descripcion: 'Crema suave, ideal para moda',
    preview: {
      bg: '#fdf8f0',
      card: '#fffbf5',
      text: '#2d1b10',
      muted: '#8b6f5e',
      border: '#e8d5c0',
    },
    vars: {
      '--background':        '#fdf8f0',
      '--background-subtle': '#f7ede0',
      '--foreground':        '#2d1b10',
      '--foreground-muted':  '#8b6f5e',
      '--border':            '#e8d5c0',
      '--border-strong':     '#d4b89e',
      '--card':              '#fffbf5',
      '--card-border':       '#eddcc8',
      '--input-bg':          '#fdf8f0',
      '--input-border':      '#d4b89e',
    },
  },
  {
    id: 'oceano',
    nombre: 'Océano',
    descripcion: 'Azul marino profundo',
    preview: {
      bg: '#0a1628',
      card: '#0f2040',
      text: '#e8f4f8',
      muted: '#7db4cc',
      border: '#1e3a5f',
    },
    vars: {
      '--background':        '#0a1628',
      '--background-subtle': '#0f2040',
      '--foreground':        '#e8f4f8',
      '--foreground-muted':  '#7db4cc',
      '--border':            '#1e3a5f',
      '--border-strong':     '#2d5a8e',
      '--card':              '#0f2040',
      '--card-border':       '#1e3a5f',
      '--input-bg':          '#0a1628',
      '--input-border':      '#1e3a5f',
    },
  },
]

export function obtenerTema(temaId?: string | null): Tema {
  if (!temaId) return TEMAS[0]
  return TEMAS.find(t => t.id === temaId) ?? TEMAS[0]
}
