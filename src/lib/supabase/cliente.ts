import { createBrowserClient } from '@supabase/ssr'
import { DemoStore } from './demo-store'

export const CLAVE_DEMO = 'tienda_demo'

// ─── DemoQueryBuilder ────────────────────────────────────────────────────────
// Intercepta la cadena de métodos de Supabase para escrituras (insert, update,
// delete, upsert). Las lecturas (select) pasan al cliente real.

type Op = 'insert' | 'update' | 'delete' | 'upsert'

class DemoQueryBuilder {
  private tabla: string
  private op: Op
  private datos: any
  private filtros = new Map<string, any>()
  private soloUno = false

  constructor(tabla: string, op: Op, datos?: any) {
    this.tabla = tabla
    this.op = op
    this.datos = datos
  }

  // Filtros — solo .eq() es necesario para el 99% de las operaciones admin
  eq(col: string, val: any)   { this.filtros.set(col, val); return this }
  neq()                       { return this }
  in()                        { return this }
  is(col: string, val: any)   { this.filtros.set(col, val); return this }
  ilike()                     { return this }
  not()                       { return this }
  or()                        { return this }
  filter()                    { return this }
  match(obj: Record<string, any>) {
    Object.entries(obj).forEach(([k, v]) => this.filtros.set(k, v))
    return this
  }

  // Opciones de resultado
  select()       { return this }
  order()        { return this }
  limit()        { return this }
  range()        { return this }
  single()       { this.soloUno = true; return this }
  maybeSingle()  { this.soloUno = true; return this }
  throwOnError() { return this }
  returns()      { return this }

  // PromiseLike — se ejecuta al hacer await
  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return Promise.resolve(this.ejecutar()).then(resolve, reject)
  }
  catch(fn: (e: any) => any) { return Promise.resolve(this.ejecutar()).catch(fn) }
  finally(fn: () => void)    { fn?.(); return Promise.resolve(this.ejecutar()) }

  private ejecutar(): { data: any; error: null; count?: null } {
    const { tabla, op, datos, filtros, soloUno } = this

    switch (op) {
      case 'insert': {
        const items = Array.isArray(datos) ? datos : [datos]
        const nuevos = items.map(item => DemoStore.insertar(tabla, item))
        return { data: soloUno ? (nuevos[0] ?? null) : nuevos, error: null }
      }

      case 'update': {
        // Si la tabla no está en DemoStore aún, no hay registros que actualizar.
        // El cambio se perderá, pero esto solo ocurre si el usuario edita sin
        // haber visitado la lista primero (caso muy raro en el flujo normal).
        if (!DemoStore.has(tabla)) return { data: null, error: null }
        const actualizados = DemoStore.actualizar(tabla, filtros, datos)
        return { data: soloUno ? (actualizados[0] ?? null) : actualizados, error: null }
      }

      case 'delete': {
        if (!DemoStore.has(tabla)) return { data: [], error: null }
        DemoStore.eliminar(tabla, filtros)
        return { data: [], error: null }
      }

      case 'upsert': {
        const items = Array.isArray(datos) ? datos : [datos]
        const resultado = items.map(item => DemoStore.upsert(tabla, item))
        return { data: soloUno ? (resultado[0] ?? null) : resultado, error: null }
      }
    }
  }
}

// ─── Proxy sobre Storage ─────────────────────────────────────────────────────
function envolverStorage(realStorage: any): any {
  return new Proxy(realStorage, {
    get(target, prop) {
      if (prop === 'from') {
        return () => ({
          upload: (_path: string, file: File) => {
            // Devolver un data URL como URL "pública" de demo
            return new Promise(resolve => {
              const reader = new FileReader()
              reader.onload = () => resolve({ data: { path: `demo/${Date.now()}` }, error: null })
              reader.onerror = () => resolve({ data: { path: `demo/${Date.now()}` }, error: null })
              reader.readAsDataURL(file)
            })
          },
          remove: () => Promise.resolve({ data: [], error: null }),
          getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
        })
      }
      const val = target[prop]
      return typeof val === 'function' ? val.bind(target) : val
    },
  })
}

// ─── Proxy sobre Auth ─────────────────────────────────────────────────────────
function envolverAuth(realAuth: any): any {
  return new Proxy(realAuth, {
    get(target, prop) {
      if (prop === 'updateUser') {
        return () => Promise.resolve({ data: { user: null }, error: null })
      }
      const val = target[prop]
      return typeof val === 'function' ? val.bind(target) : val
    },
  })
}

// ─── Cliente completo modo demo ───────────────────────────────────────────────
function crearClienteDemo(real: any): any {
  return new Proxy(real, {
    get(target, prop) {
      if (prop === 'from') {
        return (tabla: string) => {
          const realBuilder = target.from(tabla)
          return new Proxy(realBuilder, {
            get(qb, qbProp) {
              // Interceptar escrituras → DemoQueryBuilder
              if (qbProp === 'insert') return (d: any) => new DemoQueryBuilder(tabla, 'insert', d)
              if (qbProp === 'update') return (d: any) => new DemoQueryBuilder(tabla, 'update', d)
              if (qbProp === 'delete') return ()     => new DemoQueryBuilder(tabla, 'delete')
              if (qbProp === 'upsert') return (d: any) => new DemoQueryBuilder(tabla, 'upsert', d)
              // Lecturas → cliente real
              const val = qb[qbProp]
              return typeof val === 'function' ? val.bind(qb) : val
            },
          })
        }
      }
      if (prop === 'storage') return envolverStorage(target.storage)
      if (prop === 'auth')    return envolverAuth(target.auth)
      const val = target[prop]
      return typeof val === 'function' ? val.bind(target) : val
    },
  })
}

// ─── Export principal ─────────────────────────────────────────────────────────
export function crearClienteSupabase() {
  const real = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  if (typeof window !== 'undefined' && localStorage.getItem(CLAVE_DEMO) === 'true') {
    return crearClienteDemo(real) as typeof real
  }

  return real
}
