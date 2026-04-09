'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Package, Star, Clock, MessageSquare, TrendingUp, ArrowUpDown } from 'lucide-react'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Producto {
  id: string; nombre: string; slug: string; precio: number
  precio_descuento: number | null; imagen_url: string | null
  etiquetas: string[]; variante_count: number
  likes_count?: number; calificacion_promedio?: number; total_resenas?: number
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
  ordenInic: string
}

// ─── Dual-thumb range slider ───────────────────────────────────────────────
function RangeSlider({
  min, max, valueMin, valueMax,
  onChange, onCommit,
}: {
  min: number; max: number; valueMin: number; valueMax: number
  onChange: (min: number, max: number) => void
  onCommit: () => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'min' | 'max' | null>(null)

  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const valueFromPct = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = min + ratio * (max - min)
    // Step: round to sensible steps
    const step = max > 1000 ? 10 : max > 100 ? 5 : 1
    return Math.round(raw / step) * step
  }, [min, max])

  const startDrag = (thumb: 'min' | 'max') => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = thumb
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const v = valueFromPct(e.clientX)
    if (dragging.current === 'min') {
      onChange(Math.min(v, valueMax - 1), valueMax)
    } else {
      onChange(valueMin, Math.max(v, valueMin + 1))
    }
  }

  const onPointerUp = () => {
    if (dragging.current) { dragging.current = null; onCommit() }
  }

  const minPct = pct(valueMin)
  const maxPct = pct(valueMax)

  return (
    <div className="px-2 py-1">
      {/* Prices display */}
      <div className="flex justify-between mb-3">
        <span className="text-xs font-semibold text-primary bg-primary/10 rounded-lg px-2 py-0.5">
          {formatearPrecio(valueMin)}
        </span>
        <span className="text-xs font-semibold text-primary bg-primary/10 rounded-lg px-2 py-0.5">
          {formatearPrecio(valueMax)}
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-5 flex items-center select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Background track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-foreground/10" />

        {/* Active range */}
        <div
          className="absolute h-1.5 rounded-full bg-primary"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />

        {/* Min thumb */}
        <div
          className={cn(
            'absolute w-5 h-5 rounded-full bg-white border-2 border-primary shadow-md cursor-grab active:cursor-grabbing',
            'transition-shadow hover:shadow-lg hover:shadow-primary/30',
            '-translate-x-1/2 z-10'
          )}
          style={{ left: `${minPct}%` }}
          onPointerDown={startDrag('min')}
        >
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100">
            {formatearPrecio(valueMin)}
          </div>
        </div>

        {/* Max thumb */}
        <div
          className={cn(
            'absolute w-5 h-5 rounded-full bg-white border-2 border-primary shadow-md cursor-grab active:cursor-grabbing',
            'transition-shadow hover:shadow-lg hover:shadow-primary/30',
            '-translate-x-1/2 z-20'
          )}
          style={{ left: `${maxPct}%` }}
          onPointerDown={startDrag('max')}
        >
        </div>
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-foreground-muted">{formatearPrecio(min)}</span>
        <span className="text-[10px] text-foreground-muted">{formatearPrecio(max)}</span>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
const ORDENES = [
  { id: 'recientes',   label: 'Recientes',    icon: Clock },
  { id: 'populares',   label: 'Populares',    icon: Star },
  { id: 'resenas',     label: 'Más reseñas',  icon: MessageSquare },
  { id: 'precio_asc',  label: 'Precio ↑',     icon: TrendingUp },
  { id: 'precio_desc', label: 'Precio ↓',     icon: ArrowUpDown },
]

export function BuscarCliente({
  productosInic, categorias, qInic, categoriaInic,
  precioMinGlobal, precioMaxGlobal, minInic, maxInic, ordenInic,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(qInic)
  const [categoriaId, setCategoriaId] = useState(categoriaInic)
  const [min, setMin] = useState(minInic)
  const [max, setMax] = useState(maxInic)
  const [orden, setOrden] = useState(ordenInic)
  const [mostrarPrecio, setMostrarPrecio] = useState(false)

  const hayFiltroPrecio = min > precioMinGlobal || max < precioMaxGlobal
  const hayFiltros = !!categoriaId || hayFiltroPrecio || orden !== 'recientes'

  useEffect(() => {
    if (q === qInic) return
    const t = setTimeout(() => aplicar({ q }), 500)
    return () => clearTimeout(t)
  }, [q])

  function aplicar(params?: { q?: string; cat?: string; min?: number; max?: number; orden?: string }) {
    const nq = params?.q ?? q
    const ncat = params?.cat !== undefined ? params.cat : categoriaId
    const nmin = params?.min ?? min
    const nmax = params?.max ?? max
    const nord = params?.orden ?? orden
    const url = new URLSearchParams()
    if (nq) url.set('q', nq)
    if (ncat) url.set('categoria', ncat)
    if (nmin > precioMinGlobal) url.set('min', String(nmin))
    if (nmax < precioMaxGlobal) url.set('max', String(nmax))
    if (nord !== 'recientes') url.set('orden', nord)
    startTransition(() => router.push(`/buscar?${url.toString()}`, { scroll: false }))
  }

  function limpiarFiltros() {
    setCategoriaId(''); setMin(precioMinGlobal); setMax(precioMaxGlobal); setOrden('recientes')
    aplicar({ q: '', cat: '', min: precioMinGlobal, max: precioMaxGlobal, orden: 'recientes' })
  }

  function seleccionarOrden(o: string) {
    setOrden(o); aplicar({ orden: o })
  }

  function seleccionarCategoria(id: string) {
    setCategoriaId(id); aplicar({ cat: id })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* ── Barra de búsqueda ── */}
      <form onSubmit={e => { e.preventDefault(); aplicar() }} className="flex gap-2 mb-3">
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
        {hayFiltros && (
          <button type="button" onClick={limpiarFiltros}
            className="h-11 px-3 rounded-xl border border-border text-xs text-foreground-muted hover:text-foreground transition-all whitespace-nowrap">
            Limpiar
          </button>
        )}
      </form>

      {/* ── Barra de filtros deslizable ── */}
      <div className="relative mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">

          {/* Chips de orden */}
          {ORDENES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => seleccionarOrden(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap snap-start flex-shrink-0 transition-all',
                orden === id
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-card border border-card-border text-foreground-muted hover:text-foreground'
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}

          {/* Separador */}
          <div className="w-px h-8 bg-card-border flex-shrink-0 self-center" />

          {/* Chip precio */}
          <button
            onClick={() => setMostrarPrecio(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap snap-start flex-shrink-0 transition-all',
              hayFiltroPrecio || mostrarPrecio
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'bg-card border border-card-border text-foreground-muted hover:text-foreground'
            )}
          >
            {hayFiltroPrecio
              ? `${formatearPrecio(min)} – ${formatearPrecio(max)}`
              : '$ Precio'
            }
          </button>

          {/* Separador */}
          <div className="w-px h-8 bg-card-border flex-shrink-0 self-center" />

          {/* Chips categorías */}
          <button
            onClick={() => seleccionarCategoria('')}
            className={cn(
              'px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap snap-start flex-shrink-0 transition-all',
              !categoriaId
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'bg-card border border-card-border text-foreground-muted hover:text-foreground'
            )}
          >
            Todas
          </button>
          {categorias.map(c => (
            <button
              key={c.id}
              onClick={() => seleccionarCategoria(c.id)}
              className={cn(
                'px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap snap-start flex-shrink-0 transition-all',
                categoriaId === c.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-card border border-card-border text-foreground-muted hover:text-foreground'
              )}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel slider de precio ── */}
      {mostrarPrecio && (
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">Rango de precio</p>
            <button onClick={() => setMostrarPrecio(false)}>
              <X className="w-3.5 h-3.5 text-foreground-muted" />
            </button>
          </div>
          <RangeSlider
            min={precioMinGlobal}
            max={precioMaxGlobal}
            valueMin={min}
            valueMax={max}
            onChange={(nMin, nMax) => { setMin(nMin); setMax(nMax) }}
            onCommit={() => aplicar()}
          />
        </div>
      )}

      {/* ── Resultados ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">
          {qInic ? `"${qInic}"` : 'Todos los productos'}
        </p>
        <p className="text-xs text-foreground-muted">
          {productosInic.length} resultado{productosInic.length !== 1 ? 's' : ''}
        </p>
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
