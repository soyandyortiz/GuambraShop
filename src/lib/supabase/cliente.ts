import { createBrowserClient } from '@supabase/ssr'

export const CLAVE_DEMO = 'tienda_demo'

// Builder falso: soporta encadenamiento (.eq, .match, etc.) y es awaitable
// Devuelve { data: null, error: null } sin tocar la base de datos
class ConstructorFalso {
  private resultado = { data: null, error: null, count: null, status: 200, statusText: 'OK' }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return Promise.resolve(this.resultado).then(resolve, reject)
  }
  catch(fn: (e: any) => any) { return Promise.resolve(this.resultado).catch(fn) }
  finally(fn: () => void) { fn?.(); return Promise.resolve(this.resultado) }

  // Todos los métodos de filtro/opciones devuelven `this` para encadenar
  eq()          { return this } neq()    { return this } gt()     { return this }
  gte()         { return this } lt()     { return this } lte()    { return this }
  in()          { return this } is()     { return this } like()   { return this }
  ilike()       { return this } match()  { return this } not()    { return this }
  or()          { return this } filter() { return this } select() { return this }
  order()       { return this } limit()  { return this } range()  { return this }
  single()      { return this } maybeSingle() { return this }
  throwOnError(){ return this } returns() { return this }
}

// Proxy sobre el QueryBuilder real que intercepta escrituras
function envolverConstructor(real: any): any {
  return new Proxy(real, {
    get(target, prop) {
      if (['insert', 'update', 'delete', 'upsert'].includes(prop as string)) {
        return () => new ConstructorFalso()
      }
      const valor = target[prop]
      return typeof valor === 'function' ? valor.bind(target) : valor
    },
  })
}

// Proxy sobre Storage que bloquea uploads y deletes
function envolverStorage(realStorage: any): any {
  return new Proxy(realStorage, {
    get(target, prop) {
      if (prop === 'from') {
        return () => ({
          upload: () => Promise.resolve({ data: { path: 'demo/fake' }, error: null }),
          remove: () => Promise.resolve({ data: [], error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          list: (p: any) => target.from(p).list(),
        })
      }
      const valor = target[prop]
      return typeof valor === 'function' ? valor.bind(target) : valor
    },
  })
}

// Proxy sobre Auth que bloquea cambios de contraseña/datos
function envolverAuth(realAuth: any): any {
  return new Proxy(realAuth, {
    get(target, prop) {
      if (['updateUser'].includes(prop as string)) {
        return () => Promise.resolve({ data: { user: null }, error: null })
      }
      const valor = target[prop]
      return typeof valor === 'function' ? valor.bind(target) : valor
    },
  })
}

// Cliente completo en modo demo — todas las escrituras son no-op
function crearClienteDemo(real: any): any {
  return new Proxy(real, {
    get(target, prop) {
      if (prop === 'from') {
        return (tabla: string) => envolverConstructor(target.from(tabla))
      }
      if (prop === 'storage') return envolverStorage(target.storage)
      if (prop === 'auth')    return envolverAuth(target.auth)
      const valor = target[prop]
      return typeof valor === 'function' ? valor.bind(target) : valor
    },
  })
}

export function crearClienteSupabase() {
  const real = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Si estamos en el navegador y el flag demo está activo → cliente sin escrituras
  if (typeof window !== 'undefined' && localStorage.getItem(CLAVE_DEMO) === 'true') {
    return crearClienteDemo(real) as typeof real
  }

  return real
}
