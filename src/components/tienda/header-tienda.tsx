'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Package, Loader2, SlidersHorizontal, User, Tag, ArrowLeft, ClipboardList } from 'lucide-react'
import { usarCarrito } from '@/hooks/usar-carrito'
import Link from 'next/link'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import type { Producto, Categoria } from '@/types'

import { usePathname } from 'next/navigation'

interface Props {
  nombreTienda: string
  logoUrl: string | null
}

export function HeaderTienda({ nombreTienda, logoUrl }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { conteo } = usarCarrito()

  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Pick<Categoria, 'id' | 'nombre' | 'slug'>[]>([])
  const [cargando, setCargando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [sesionActiva, setSesionActiva] = useState<boolean | undefined>(undefined)

  // No renderizar en rutas de administración
  if (pathname.startsWith('/admin')) return null

  useEffect(() => {
    const supabase = crearClienteSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesionActiva(!!session)
    })
  }, [])

  // Búsqueda en tiempo real con debounce — productos + categorías
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!busqueda.trim() || busqueda.length < 2) {
        setResultados([])
        setCategorias([])
        return
      }

      setCargando(true)
      const supabase = crearClienteSupabase()

      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre, slug, precio, precio_descuento, imagenes_producto(url, orden)')
          .ilike('nombre', `%${busqueda}%`)
          .eq('esta_activo', true)
          .order('nombre')
          .limit(5),
        supabase
          .from('categorias')
          .select('id, nombre, slug')
          .ilike('nombre', `%${busqueda}%`)
          .eq('esta_activa', true)
          .order('nombre')
          .limit(3),
      ])

      if (prods) setResultados(prods as any)
      if (cats)  setCategorias(cats as any)
      setCargando(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [busqueda])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        cerrarBusqueda()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus automático al abrir búsqueda
  useEffect(() => {
    if (buscando) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [buscando])

  function cerrarBusqueda() {
    setBuscando(false)
    setBusqueda('')
    setResultados([])
    setCategorias([])
  }

  function abrirBusqueda() {
    setBuscando(true)
  }

  function onBuscar(e: React.FormEvent) {
    e.preventDefault()
    if (!busqueda.trim()) return
    router.push(`/?q=${encodeURIComponent(busqueda.trim())}`)
    cerrarBusqueda()
  }

  function toggleFiltros() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('filtros') === 'true') {
      params.delete('filtros')
    } else {
      params.set('filtros', 'true')
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  return (
    <header className="sticky top-0 z-30 bg-primary shadow-md">
      <div className="flex items-center gap-2 px-3 h-14 max-w-4xl mx-auto w-full">

        {buscando ? (
          /* ── MODO BÚSQUEDA: ocupa todo el ancho ── */
          <>
            {/* Botón volver */}
            <button
              type="button"
              onClick={cerrarBusqueda}
              className="w-8 h-8 flex items-center justify-center text-white flex-shrink-0"
              aria-label="Cerrar búsqueda"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Input de búsqueda full-width */}
            <div ref={containerRef} className="flex-1 relative min-w-0">
              <form onSubmit={onBuscar} className="flex items-center bg-white/20 rounded-xl px-2.5 h-9 gap-2 border border-transparent focus-within:border-white/30 focus-within:bg-white/25 transition-all">
                {cargando ? (
                  <Loader2 className="w-4 h-4 text-white/70 animate-spin flex-shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-white/70 flex-shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar productos..."
                  className="flex-1 bg-transparent text-white placeholder-white/60 text-sm focus:outline-none min-w-0"
                />
                {busqueda && (
                  <button type="button" onClick={() => { setBusqueda(''); setResultados([]); setCategorias([]) }}>
                    <X className="w-3.5 h-3.5 text-white/70" />
                  </button>
                )}
              </form>

              {/* Panel de Resultados Flotante */}
              {busqueda.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {cargando ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                      <p className="text-xs text-foreground-muted">Buscando...</p>
                    </div>
                  ) : categorias.length === 0 && resultados.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="w-10 h-10 text-foreground-muted/20 mx-auto mb-2" />
                      <p className="text-sm text-foreground font-medium">Sin resultados</p>
                      <p className="text-xs text-foreground-muted mt-1">Prueba con otras palabras...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {/* Categorías */}
                      {categorias.length > 0 && (
                        <>
                          <div className="px-3 py-2 bg-background-subtle border-b border-border">
                            <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Categorías</span>
                          </div>
                          {categorias.map(cat => (
                            <Link
                              key={cat.id}
                              href={`/categoria/${cat.slug}`}
                              onClick={cerrarBusqueda}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-background-subtle transition-colors group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Tag className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                {cat.nombre}
                              </span>
                            </Link>
                          ))}
                        </>
                      )}

                      {/* Productos */}
                      {resultados.length > 0 && (
                        <>
                          <div className="px-3 py-2 bg-background-subtle border-b border-border">
                            <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Productos</span>
                          </div>
                          {resultados.map(prod => {
                            const img = (prod as any).imagenes_producto?.sort((a: any, b: any) => a.orden - b.orden)[0]?.url
                            return (
                              <Link
                                key={prod.id}
                                href={`/producto/${prod.slug}`}
                                onClick={cerrarBusqueda}
                                className="flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors group"
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-background-subtle flex-shrink-0 border border-border group-hover:border-primary/20">
                                  {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={img} alt={prod.nombre} className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="w-5 h-5 text-foreground-muted/30" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    {prod.nombre}
                                  </p>
                                  <p className="text-xs font-bold text-emerald-600">
                                    {formatearPrecio(prod.precio_descuento ?? prod.precio)}
                                  </p>
                                </div>
                              </Link>
                            )
                          })}
                        </>
                      )}

                      <button
                        onClick={onBuscar}
                        className="w-full p-3 text-center bg-primary/5 hover:bg-primary/10 transition-colors border-t border-border"
                      >
                        <span className="text-xs font-bold text-primary">Ver todos los resultados para &quot;{busqueda}&quot;</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filtros — al final del modo búsqueda */}
            <button
              onClick={toggleFiltros}
              className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all flex-shrink-0"
              aria-label="Filtros"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* ── MODO NORMAL: Logo | espacio | Buscar | Avatar ── */
          <>
            {/* Logo / Nombre — ocupa el espacio disponible */}
            <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={nombreTienda}
                  className="h-8 w-auto max-w-[140px] object-contain"
                  onError={e => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const fallback = target.nextElementSibling as HTMLElement | null
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className="h-7 px-2.5 bg-white/20 rounded-lg items-center min-w-0"
                style={{ display: logoUrl ? 'none' : 'flex' }}
              >
                <span className="text-white font-bold text-xs truncate">{nombreTienda}</span>
              </div>
            </Link>

            {/* Icono búsqueda */}
            <button
              onClick={abrirBusqueda}
              className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all flex-shrink-0"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Seguimiento de pedido */}
            <Link
              href="/pedido"
              className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all flex-shrink-0"
              aria-label="Seguimiento de pedido"
            >
              <ClipboardList className="w-4 h-4" />
            </Link>

            {/* Avatar / sesión */}
            {sesionActiva === undefined ? (
              /* Cargando */
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
            ) : sesionActiva ? (
              /* Logueado — icono de usuario → panel admin */
              <Link href="/admin/dashboard" className="flex-shrink-0" title="Panel de administración">
                <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white/40 hover:border-white transition-all flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </Link>
            ) : (
              /* Sin sesión */
              <Link
                href="/admin"
                className="flex-shrink-0 px-3 h-8 rounded-xl bg-white/20 hover:bg-white/30 border border-white/20 transition-all flex items-center"
              >
                <span className="text-white text-[11px] font-bold tracking-wide whitespace-nowrap">INICIAR SESIÓN</span>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  )
}
