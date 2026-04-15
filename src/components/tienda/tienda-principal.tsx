'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, SlidersHorizontal, X, Package, ChevronDown,
  Loader2, Tag, ArrowUpDown, Percent, Grid2X2, Wrench,
  ChevronUp,
} from 'lucide-react'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'
import { formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn } from '@/lib/utils'

interface Producto {
  id: string; nombre: string; slug: string; precio: number
  precio_descuento: number | null; imagen_url: string | null
  etiquetas: string[]; variante_count: number
  tipo_producto?: 'producto' | 'servicio'
}

interface Categoria { id: string; nombre: string; slug: string }

interface Props {
  precioMinGlobal: number
  precioMaxGlobal: number
  categorias: Categoria[]
}

type Orden = 'reciente' | 'precio_asc' | 'precio_desc' | 'az'
type Tipo  = '' | 'producto' | 'servicio'

const OPCIONES_ORDEN: { valor: Orden; label: string }[] = [
  { valor: 'reciente',   label: 'Más recientes'  },
  { valor: 'precio_asc', label: 'Menor precio'   },
  { valor: 'precio_desc',label: 'Mayor precio'   },
  { valor: 'az',         label: 'A → Z'          },
]

const LIMITE = 20

export function TiendaPrincipal({ precioMinGlobal, precioMaxGlobal, categorias }: Props) {
  const router      = useRouter()
  const searchParams = useSearchParams()

  // ── Leer parámetros de URL ──────────────────────────────────
  const q       = searchParams.get('q')     || ''
  const min     = Number(searchParams.get('min'))  || precioMinGlobal
  const max     = Number(searchParams.get('max'))  || precioMaxGlobal
  const catId   = searchParams.get('cat')   || ''
  const tipo    = (searchParams.get('tipo') || '') as Tipo
  const soloDesc= searchParams.get('desc')  === 'true'
  const orden   = (searchParams.get('orden') || 'reciente') as Orden
  const panelAbierto = searchParams.get('filtros') === 'true'

  // ── Estado local ────────────────────────────────────────────
  const [productos,    setProductos]    = useState<Producto[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [cargandoMas,  setCargandoMas]  = useState(false)
  const [offset,       setOffset]       = useState(0)
  const [hayMas,       setHayMas]       = useState(true)
  const [inputBusqueda,setInputBusqueda]= useState(q)

  // Valores locales del slider (no disparan fetch hasta soltar)
  const [sliderMin, setSliderMin] = useState(min)
  const [sliderMax, setSliderMax] = useState(max)

  // Contar filtros activos (sin contar búsqueda de texto)
  const filtrosActivos = [
    min > precioMinGlobal || max < precioMaxGlobal,
    catId !== '',
    tipo  !== '',
    soloDesc,
    orden !== 'reciente',
  ].filter(Boolean).length

  // Sincronizar sliders con URL
  useEffect(() => { setSliderMin(min) }, [min])
  useEffect(() => { setSliderMax(max) }, [max])
  useEffect(() => { setInputBusqueda(q) }, [q])

  // ── Cargar productos ────────────────────────────────────────
  useEffect(() => { cargarProductos(true) }, [q, min, max, catId, tipo, soloDesc, orden])

  async function cargarProductos(nueva: boolean) {
    const nuevoOffset = nueva ? 0 : offset + LIMITE
    nueva ? setCargando(true) : setCargandoMas(true)

    const supabase = crearClienteSupabase()
    let query = supabase
      .from('productos')
      .select(`
        id, nombre, slug, precio, precio_descuento, etiquetas, tipo_producto,
        imagenes_producto(url, orden),
        variantes_producto(id)
      `)
      .eq('esta_activo', true)
      .range(nuevoOffset, nuevoOffset + LIMITE - 1)

    // Filtros
    if (q)         query = query.ilike('nombre', `%${q}%`)
    if (min > precioMinGlobal) query = query.gte('precio', min)
    if (max < precioMaxGlobal) query = query.lte('precio', max)
    if (catId)     query = query.eq('categoria_id', catId)
    if (tipo)      query = query.eq('tipo_producto', tipo)
    if (soloDesc)  query = query.not('precio_descuento', 'is', null)

    // Orden
    switch (orden) {
      case 'precio_asc':  query = query.order('precio', { ascending: true });  break
      case 'precio_desc': query = query.order('precio', { ascending: false }); break
      case 'az':          query = query.order('nombre', { ascending: true });  break
      default:            query = query.order('creado_en', { ascending: false })
    }

    const { data } = await query

    const mapeados: Producto[] = (data ?? []).map((p: any) => ({
      id: p.id, nombre: p.nombre, slug: p.slug,
      precio: p.precio, precio_descuento: p.precio_descuento,
      etiquetas: p.etiquetas || [],
      tipo_producto: p.tipo_producto,
      imagen_url: p.imagenes_producto?.sort((a: any, b: any) => a.orden - b.orden)[0]?.url || null,
      variante_count: p.variantes_producto?.length || 0,
    }))

    if (nueva) setProductos(mapeados)
    else       setProductos(prev => [...prev, ...mapeados])

    setOffset(nuevoOffset)
    setHayMas((data?.length ?? 0) === LIMITE)
    setCargando(false)
    setCargandoMas(false)
  }

  // ── Helpers para actualizar URL ─────────────────────────────
  function set(key: string, val: string | null) {
    const url = new URLSearchParams(searchParams.toString())
    if (val === null || val === '') url.delete(key)
    else url.set(key, val)
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function buscar(texto: string) {
    const url = new URLSearchParams(searchParams.toString())
    if (texto.trim()) url.set('q', texto.trim()); else url.delete('q')
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function limpiarFiltros() {
    const url = new URLSearchParams()
    if (q) url.set('q', q)
    url.set('filtros', 'true')
    router.push(`/?${url.toString()}`, { scroll: false })
  }

  function togglePanel() { set('filtros', panelAbierto ? null : 'true') }

  // ── Render ──────────────────────────────────────────────────
  return (
    <section className="mt-5 px-4 mb-20">

      {/* ── Barra de búsqueda + botón filtros ── */}
      <form onSubmit={e => { e.preventDefault(); buscar(inputBusqueda) }} className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center bg-card border border-card-border rounded-xl px-3 h-10 gap-2">
          <Search className="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <input
            type="text"
            value={inputBusqueda}
            onChange={e => setInputBusqueda(e.target.value)}
            placeholder="Buscar productos o servicios..."
            className="flex-1 bg-transparent text-foreground text-sm focus:outline-none"
          />
          {inputBusqueda && (
            <button type="button" onClick={() => { setInputBusqueda(''); buscar('') }}>
              <X className="w-3.5 h-3.5 text-foreground-muted" />
            </button>
          )}
        </div>

        {/* Botón filtros con contador */}
        <button
          type="button"
          onClick={togglePanel}
          className={cn(
            'relative w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all',
            panelAbierto
              ? 'bg-primary/10 border-primary text-primary'
              : filtrosActivos > 0
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-card border-card-border text-foreground-muted hover:border-primary/40 hover:text-primary'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {filtrosActivos > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-0.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
              {filtrosActivos}
            </span>
          )}
        </button>
      </form>

      {/* ── Panel de filtros avanzado ── */}
      {panelAbierto && (
        <div className="bg-card border border-card-border rounded-2xl mb-5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Cabecera del panel */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">Filtros avanzados</span>
              {filtrosActivos > 0 && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {filtrosActivos} activo{filtrosActivos > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {filtrosActivos > 0 && (
                <button
                  onClick={limpiarFiltros}
                  className="text-[11px] font-semibold text-foreground-muted hover:text-danger transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
              <button onClick={togglePanel} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background-subtle text-foreground-muted transition-all">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-5">

            {/* ── 1. Tipo ── */}
            <div>
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Grid2X2 className="w-3 h-3" /> Tipo
              </p>
              <div className="flex gap-2">
                {([
                  { valor: '' as Tipo,        label: 'Todos'     },
                  { valor: 'producto' as Tipo, label: 'Productos', icon: <Package className="w-3 h-3" /> },
                  { valor: 'servicio' as Tipo, label: 'Servicios', icon: <Wrench className="w-3 h-3" />  },
                ]).map(op => (
                  <button
                    key={op.valor}
                    onClick={() => set('tipo', op.valor || null)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                      tipo === op.valor
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background-subtle border-border text-foreground-muted hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {op.icon}
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 2. Categorías ── */}
            {categorias.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Categoría
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => set('cat', null)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                      catId === ''
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background-subtle border-border text-foreground-muted hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    Todas
                  </button>
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => set('cat', catId === cat.id ? null : cat.id)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                        catId === cat.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background-subtle border-border text-foreground-muted hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── 3. Precio ── */}
            {precioMaxGlobal > precioMinGlobal && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide">
                    Precio
                  </p>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                    {formatearPrecio(sliderMin)} — {formatearPrecio(sliderMax)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-foreground-muted mb-1.5 font-medium">Desde</p>
                    <input
                      type="range"
                      min={precioMinGlobal}
                      max={precioMaxGlobal}
                      value={sliderMin}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value), sliderMax - 1)
                        setSliderMin(v)
                      }}
                      onMouseUp={e => set('min', String((e.target as HTMLInputElement).value))}
                      onTouchEnd={e => set('min', String((e.target as HTMLInputElement).value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-primary/20"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground-muted mb-1.5 font-medium">Hasta</p>
                    <input
                      type="range"
                      min={precioMinGlobal}
                      max={precioMaxGlobal}
                      value={sliderMax}
                      onChange={e => {
                        const v = Math.max(Number(e.target.value), sliderMin + 1)
                        setSliderMax(v)
                      }}
                      onMouseUp={e => set('max', String((e.target as HTMLInputElement).value))}
                      onTouchEnd={e => set('max', String((e.target as HTMLInputElement).value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. Solo con descuento ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-3.5 h-3.5 text-foreground-muted" />
                <span className="text-xs font-semibold text-foreground">Solo con descuento</span>
              </div>
              <button
                type="button"
                onClick={() => set('desc', soloDesc ? null : 'true')}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative flex-shrink-0',
                  soloDesc ? 'bg-primary' : 'bg-border'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  soloDesc && 'translate-x-5'
                )} />
              </button>
            </div>

            {/* ── 5. Ordenar por ── */}
            <div>
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3" /> Ordenar por
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {OPCIONES_ORDEN.map(op => (
                  <button
                    key={op.valor}
                    onClick={() => set('orden', op.valor === 'reciente' ? null : op.valor)}
                    className={cn(
                      'h-8 px-3 rounded-xl text-xs font-semibold border transition-all',
                      orden === op.valor
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background-subtle border-border text-foreground-muted hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Chips de filtros activos ── */}
      {filtrosActivos > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {tipo && (
            <Chip label={tipo === 'producto' ? 'Productos' : 'Servicios'} onRemove={() => set('tipo', null)} />
          )}
          {catId && (
            <Chip label={categorias.find(c => c.id === catId)?.nombre ?? 'Categoría'} onRemove={() => set('cat', null)} />
          )}
          {(min > precioMinGlobal || max < precioMaxGlobal) && (
            <Chip label={`${formatearPrecio(min)} — ${formatearPrecio(max)}`} onRemove={() => { set('min', null); set('max', null) }} />
          )}
          {soloDesc && (
            <Chip label="Con descuento" onRemove={() => set('desc', null)} />
          )}
          {orden !== 'reciente' && (
            <Chip label={OPCIONES_ORDEN.find(o => o.valor === orden)?.label ?? ''} onRemove={() => set('orden', null)} />
          )}
        </div>
      )}

      {/* ── Título y contador ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-extrabold text-foreground">
          {q ? (
            <>Resultados para <span className="text-primary">"{q}"</span></>
          ) : tipo === 'servicio' ? 'Servicios disponibles'
            : tipo === 'producto' ? 'Productos'
            : catId ? (categorias.find(c => c.id === catId)?.nombre ?? 'Productos')
            : 'Todos los productos'}
        </h2>
        {!cargando && (
          <p className="text-[10px] font-bold text-foreground-muted bg-background-subtle px-2 py-1 rounded-lg flex-shrink-0">
            {productos.length}{hayMas ? '+' : ''} items
          </p>
        )}
      </div>

      {/* ── Grid de productos ── */}
      {cargando ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground-muted font-medium">Cargando...</p>
        </div>
      ) : productos.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="w-12 h-12 text-foreground-muted/10 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Sin resultados</p>
          <p className="text-xs text-foreground-muted mt-1 px-4">Prueba con otros filtros o términos de búsqueda</p>
          {filtrosActivos > 0 && (
            <button onClick={limpiarFiltros} className="mt-3 text-xs text-primary font-semibold hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {productos.map(p => <TarjetaProducto key={p.id} {...p} />)}
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
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Ver más</span>
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

// ── Chip de filtro activo ──────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-semibold rounded-full border border-primary/20">
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-danger transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
