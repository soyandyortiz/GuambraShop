'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, Package, ChevronDown, Loader2 } from 'lucide-react'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'
import { formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn } from '@/lib/utils'

interface Producto {
  id: string; nombre: string; slug: string; precio: number
  precio_descuento: number | null; imagen_url: string | null
  etiquetas: string[]; variante_count: number
}

interface Props {
  precioMinGlobal: number
  precioMaxGlobal: number
}

export function TiendaPrincipal({
  precioMinGlobal, precioMaxGlobal,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Parámetros de la URL
  const q = searchParams.get('q') || ''
  const min = Number(searchParams.get('min')) || precioMinGlobal
  const max = Number(searchParams.get('max')) || precioMaxGlobal
  const mostrarFiltros = searchParams.get('filtros') === 'true'

  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hayMas, setHayMas] = useState(true)
  const [inputBusqueda, setInputBusqueda] = useState(q)
  const LIMITE = 20

  const hayFiltros = min > precioMinGlobal || max < precioMaxGlobal

  // Sincronizar input cuando q cambia por URL
  useEffect(() => { setInputBusqueda(q) }, [q])

  // Carga inicial y cuando cambian los filtros
  useEffect(() => {
    cargarProductos(true)
  }, [q, min, max])

  async function cargarProductos(esNuevaBusqueda: boolean) {
    const nuevoOffset = esNuevaBusqueda ? 0 : offset + LIMITE
    if (esNuevaBusqueda) {
      setCargando(true)
    } else {
      setCargandoMas(true)
    }

    const supabase = crearClienteSupabase()
    let query = supabase
      .from('productos')
      .select('id, nombre, slug, precio, precio_descuento, etiquetas, imagenes_producto(url, orden), variantes_producto(id)')
      .eq('esta_activo', true)
      .order('creado_en', { ascending: false })
      .range(nuevoOffset, nuevoOffset + LIMITE - 1)

    if (q) query = query.ilike('nombre', `%${q}%`)
    if (min > precioMinGlobal) query = query.gte('precio', min)
    if (max < precioMaxGlobal) query = query.lte('precio', max)

    const { data } = await query

    if (data) {
      const mapeados = data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        slug: p.slug,
        precio: p.precio,
        precio_descuento: p.precio_descuento,
        etiquetas: p.etiquetas || [],
        imagen_url: p.imagenes_producto?.sort((a: any, b: any) => a.orden - b.orden)[0]?.url || null,
        variante_count: p.variantes_producto?.length || 0
      }))

      if (esNuevaBusqueda) {
        setProductos(mapeados)
      } else {
        setProductos(prev => [...prev, ...mapeados])
      }
      
      setOffset(nuevoOffset)
      setHayMas(data.length === LIMITE)
    } else {
      setHayMas(false)
    }

    setCargando(false)
    setCargandoMas(false)
  }

  function buscar(texto: string) {
    const url = new URLSearchParams(searchParams.toString())
    if (texto.trim()) url.set('q', texto.trim())
    else url.delete('q')
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function limpiarBusqueda() {
    const url = new URLSearchParams(searchParams.toString())
    url.delete('q')
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function toggleFiltros() {
    const url = new URLSearchParams(searchParams.toString())
    if (mostrarFiltros) url.delete('filtros')
    else url.set('filtros', 'true')
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function aplicarFiltros(params: { min?: number; max?: number }) {
    const url = new URLSearchParams(searchParams.toString())
    if (params.min !== undefined) {
      if (params.min > precioMinGlobal) url.set('min', String(params.min))
      else url.delete('min')
    }
    if (params.max !== undefined) {
      if (params.max < precioMaxGlobal) url.set('max', String(params.max))
      else url.delete('max')
    }
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function limpiarFiltros() {
    const url = new URLSearchParams()
    if (q) url.set('q', q)
    if (mostrarFiltros) url.set('filtros', 'true')
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  return (
    <section className="mt-5 px-4 mb-20">
      {/* Panel de filtros (controlado por el header) */}
      {mostrarFiltros && (
        <div className="bg-primary rounded-2xl p-4 mb-6 flex flex-col gap-5 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-white">Rango de Precio</p>
              <p className="text-xs text-white font-black bg-white/20 px-2 py-1 rounded-lg">
                {formatearPrecio(min)} — {formatearPrecio(max)}
              </p>
            </div>
            <div className="space-y-4 px-1">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-white/60 mb-1 font-bold">Mínimo</p>
                  <input
                    type="range"
                    min={precioMinGlobal}
                    max={precioMaxGlobal}
                    value={min}
                    onChange={e => {
                        const val = Number(e.target.value)
                        aplicarFiltros({ min: val })
                    }}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/60 mb-1 font-bold">Máximo</p>
                  <input
                    type="range"
                    min={precioMinGlobal}
                    max={precioMaxGlobal}
                    value={max}
                    onChange={e => {
                        const val = Number(e.target.value)
                        aplicarFiltros({ max: val })
                    }}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="h-10 rounded-xl bg-white text-primary text-xs font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-lg">
              <X className="w-4 h-4" />
              Limpiar todos los filtros
            </button>
          )}
        </div>
      )}

      {/* Barra de búsqueda inline + filtros */}
      <form
        onSubmit={e => { e.preventDefault(); buscar(inputBusqueda) }}
        className="flex gap-2 mb-4"
      >
        <div className="flex-1 flex items-center bg-card border border-card-border rounded-xl px-3 h-10 gap-2">
          <Search className="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <input
            type="text"
            value={inputBusqueda}
            onChange={e => setInputBusqueda(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 bg-transparent text-foreground text-sm focus:outline-none"
          />
          {inputBusqueda && (
            <button type="button" onClick={() => { setInputBusqueda(''); limpiarBusqueda() }}>
              <X className="w-3.5 h-3.5 text-foreground-muted" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={toggleFiltros}
          className={cn(
            'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all relative',
            mostrarFiltros || hayFiltros
              ? 'bg-primary border-primary text-white'
              : 'bg-card border-card-border text-foreground-muted'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hayFiltros && !mostrarFiltros && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
          )}
        </button>
      </form>

      {/* Título y contador */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-extrabold text-foreground">
            {q ? (
              <>Resultados para <span className="text-primary">"{q}"</span></>
            ) : (
              'Todos los productos'
            )}
          </h2>
          {q && (
            <button
              onClick={limpiarBusqueda}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-all"
            >
              <X className="w-3 h-3" />
              Limpiar búsqueda
            </button>
          )}
        </div>
        {!cargando && (
          <p className="text-[10px] font-bold text-foreground-muted bg-background-subtle px-2 py-1 rounded-lg flex-shrink-0">
            {productos.length} items
          </p>
        )}
      </div>

      {cargando ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground-muted font-medium">Cargando productos...</p>
        </div>
      ) : productos.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="w-12 h-12 text-foreground-muted/10 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">No encontramos nada</p>
          <p className="text-xs text-foreground-muted mt-1 px-4">Intenta con otros filtros o términos de búsqueda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {productos.map(p => (
              <TarjetaProducto key={p.id} {...p} />
            ))}
          </div>

          {hayMas && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => cargarProductos(false)}
                disabled={cargandoMas}
                className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-card border border-card-border shadow-sm hover:border-primary/50 transition-all active:scale-95 disabled:opacity-50"
              >
                {cargandoMas ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <>
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Ver más productos</span>
                    <ChevronDown className="w-4 h-4 text-foreground-muted group-hover:text-primary transition-all" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
