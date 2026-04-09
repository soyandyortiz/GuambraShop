'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, Package } from 'lucide-react'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'
import { formatearPrecio } from '@/lib/utils'

interface Producto {
  id: string; nombre: string; slug: string; precio: number
  precio_descuento: number | null; imagen_url: string | null
  etiquetas: string[]; variante_count: number
}
interface Categoria { id: string; nombre: string; slug: string }

interface Props {
  productosInic: Producto[]
  categorias: Categoria[]
  qInic: string
  categoriaInic: string
  precioMinGlobal: number
  precioMaxGlobal: number
  minInic: number
  maxInic: number
}

export function BuscarCliente({
  productosInic, categorias, qInic, categoriaInic,
  precioMinGlobal, precioMaxGlobal, minInic, maxInic,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(qInic)
  const [categoriaId, setCategoriaId] = useState(categoriaInic)
  const [min, setMin] = useState(minInic)
  const [max, setMax] = useState(maxInic)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const hayFiltros = categoriaId || min > precioMinGlobal || max < precioMaxGlobal

  // Búsqueda en tiempo real para la cuadrícula
  useEffect(() => {
    // Si la búsqueda es igual a la inicial (ej. al cargar la página), no hacemos nada
    if (q === qInic) return

    const timer = setTimeout(() => {
      aplicar({ q })
    }, 500)

    return () => clearTimeout(timer)
  }, [q])

  function aplicar(params?: { q?: string; cat?: string; min?: number; max?: number }) {
    const nq = params?.q ?? q
    const ncat = params?.cat ?? categoriaId
    const nmin = params?.min ?? min
    const nmax = params?.max ?? max
    const url = new URLSearchParams()
    if (nq) url.set('q', nq)
    if (ncat) url.set('categoria', ncat)
    if (nmin > precioMinGlobal) url.set('min', String(nmin))
    if (nmax < precioMaxGlobal) url.set('max', String(nmax))
    startTransition(() => router.push(`/buscar?${url.toString()}`, { scroll: false }))
  }

  function limpiarFiltros() {
    setCategoriaId('')
    setMin(precioMinGlobal)
    setMax(precioMaxGlobal)
    aplicar({ q: '', cat: '', min: precioMinGlobal, max: precioMaxGlobal })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Barra búsqueda */}
      <form onSubmit={e => { e.preventDefault(); aplicar() }} className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center bg-card border border-card-border rounded-xl px-3 h-11 gap-2">
          <Search className="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 bg-transparent text-foreground text-sm focus:outline-none"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); aplicar({ q: '' }) }}>
              <X className="w-3.5 h-3.5 text-foreground-muted" />
            </button>
          )}
        </div>
        <button type="button"
          onClick={() => setMostrarFiltros(v => !v)}
          className={`relative w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
            mostrarFiltros || hayFiltros ? 'bg-primary border-primary text-white' : 'bg-card border-card-border text-foreground-muted'
          }`}>
          <SlidersHorizontal className="w-4 h-4" />
          {hayFiltros && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
          )}
        </button>
      </form>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-4 flex flex-col gap-4">
          {/* Categorías */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Categoría</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setCategoriaId(''); aplicar({ cat: '' }) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  !categoriaId ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted hover:text-foreground'
                }`}>
                Todas
              </button>
              {categorias.map(c => (
                <button key={c.id}
                  onClick={() => { setCategoriaId(c.id); aplicar({ cat: c.id }) }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    categoriaId === c.id ? 'bg-primary text-white' : 'bg-background-subtle text-foreground-muted hover:text-foreground'
                  }`}>
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de precio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Precio</p>
              <p className="text-xs text-primary font-medium">
                {formatearPrecio(min)} — {formatearPrecio(max)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={precioMinGlobal}
                max={precioMaxGlobal}
                value={min}
                onChange={e => setMin(Number(e.target.value))}
                onMouseUp={() => aplicar()}
                onTouchEnd={() => aplicar()}
                className="flex-1 accent-primary"
              />
              <input
                type="range"
                min={precioMinGlobal}
                max={precioMaxGlobal}
                value={max}
                onChange={e => setMax(Number(e.target.value))}
                onMouseUp={() => aplicar()}
                onTouchEnd={() => aplicar()}
                className="flex-1 accent-primary"
              />
            </div>
            <div className="flex justify-between text-[10px] text-foreground-muted mt-1">
              <span>{formatearPrecio(precioMinGlobal)}</span>
              <span>{formatearPrecio(precioMaxGlobal)}</span>
            </div>
          </div>

          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="h-9 rounded-xl border border-border text-xs text-foreground-muted hover:text-foreground transition-all">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Resultados */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">
          {qInic ? `"${qInic}"` : 'Todos los productos'}
        </p>
        <p className="text-xs text-foreground-muted">{productosInic.length} resultado{productosInic.length !== 1 ? 's' : ''}</p>
      </div>

      {productosInic.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="w-12 h-12 text-foreground-muted/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin resultados</p>
          <p className="text-xs text-foreground-muted mt-1">Intenta con otras palabras o ajusta los filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {productosInic.map(p => (
            <TarjetaProducto key={p.id} {...p} />
          ))}
        </div>
      )}
    </div>
  )
}
