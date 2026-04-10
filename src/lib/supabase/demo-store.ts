// Base de datos local para el modo demo.
// Todos los datos se guardan en localStorage y persisten hasta que el
// usuario limpie el cache del navegador.

const PREFIJO = 'demo_'
export const EVENTO_DEMO = 'demo-actualizado'

function leer(tabla: string): any[] {
  try {
    return JSON.parse(localStorage.getItem(PREFIJO + tabla) ?? 'null') ?? []
  } catch { return [] }
}

function escribir(tabla: string, datos: any[]) {
  localStorage.setItem(PREFIJO + tabla, JSON.stringify(datos))
  window.dispatchEvent(new CustomEvent(EVENTO_DEMO, { detail: { tabla } }))
}

export const DemoStore = {
  has(tabla: string): boolean {
    return localStorage.getItem(PREFIJO + tabla) !== null
  },

  obtener(tabla: string): any[] {
    return leer(tabla)
  },

  /** Inicializa la tabla SOLO si no existe aún en localStorage */
  inicializar(tabla: string, datos: any[]) {
    if (!this.has(tabla)) {
      localStorage.setItem(PREFIJO + tabla, JSON.stringify(datos))
    }
  },

  /** Inserta un nuevo registro y dispara evento */
  insertar(tabla: string, item: any): any {
    const datos = leer(tabla)
    const nuevo = { ...item, id: item.id ?? crypto.randomUUID() }
    escribir(tabla, [...datos, nuevo])
    return nuevo
  },

  /** Actualiza registros que coincidan con los filtros y dispara evento */
  actualizar(tabla: string, filtros: Map<string, any>, parche: any): any[] {
    const datos = leer(tabla)
    const coincide = (item: any) => [...filtros.entries()].every(([col, val]) => item[col] == val)
    const actualizados = datos.map(item => coincide(item) ? { ...item, ...parche } : item)
    escribir(tabla, actualizados)
    return actualizados.filter(coincide)
  },

  /** Elimina registros que coincidan con los filtros y dispara evento */
  eliminar(tabla: string, filtros: Map<string, any>) {
    const datos = leer(tabla)
    const coincide = (item: any) => [...filtros.entries()].every(([col, val]) => item[col] == val)
    escribir(tabla, datos.filter(item => !coincide(item)))
  },

  /** Upsert: actualiza si existe por id, inserta si no */
  upsert(tabla: string, item: any): any {
    const datos = leer(tabla)
    const existente = item.id && datos.some((r: any) => r.id === item.id)
    if (existente) {
      return this.actualizar(tabla, new Map([['id', item.id]]), item)[0] ?? item
    }
    return this.insertar(tabla, item)
  },

  /** Elimina todos los datos demo del localStorage (al cerrar sesión) */
  limpiar() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIJO))
      .forEach(k => localStorage.removeItem(k))
  },
}
