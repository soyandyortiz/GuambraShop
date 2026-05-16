'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Plus, Trash2, UserPlus, ChevronDown, Percent, DollarSign, Loader2 } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import type { Cliente, Producto, ItemProforma } from '@/types'

interface Props {
  productos: Producto[]
  simboloMoneda: string
}

interface ItemForm extends ItemProforma {
  _key: string
}

type ModoCliente = 'buscar' | 'nuevo'

const IVA_DEFAULT = 15

export function FormularioNuevaProforma({ productos, simboloMoneda }: Props) {
  const router = useRouter()
  const sym = simboloMoneda || '$'

  // ── Cliente ────────────────────────────────────────────────────────────────
  const [modoCliente, setModoCliente] = useState<ModoCliente>('buscar')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [mostrarDropCliente, setMostrarDropCliente] = useState(false)
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!busquedaCliente || busquedaCliente.length < 2) {
      setClientesFiltrados([])
      return
    }
    setBuscandoCliente(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const supabase = crearClienteSupabase()
        const q = busquedaCliente.trim()
        const { data } = await supabase
          .from('clientes')
          .select('id, razon_social, email, telefono')
          .or(`razon_social.ilike.%${q}%,email.ilike.%${q}%`)
          .not('email', 'is', null)
          .order('razon_social', { ascending: true })
          .limit(8)
        setClientesFiltrados((data ?? []) as Cliente[])
      } catch {
        setClientesFiltrados([])
      } finally {
        setBuscandoCliente(false)
      }
    }, 300)
  }, [busquedaCliente])

  // ── Productos / ítems ──────────────────────────────────────────────────────
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [mostrarDropProducto, setMostrarDropProducto] = useState(false)
  const [items, setItems] = useState<ItemForm[]>([])

  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto || busquedaProducto.length < 2) return []
    const q = busquedaProducto.toLowerCase()
    return productos.filter(p => p.nombre.toLowerCase().includes(q)).slice(0, 10)
  }, [busquedaProducto, productos])

  const agregarProducto = useCallback((prod: Producto) => {
    const precio = prod.precio_descuento ?? prod.precio
    setItems(prev => [
      ...prev,
      {
        _key: `${prod.id}-${Date.now()}`,
        producto_id: prod.id,
        nombre: prod.nombre,
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
      }
    ])
    setBusquedaProducto('')
    setMostrarDropProducto(false)
  }, [])

  const actualizarItem = useCallback((key: string, campo: 'cantidad' | 'precio_unitario' | 'nombre', valor: string) => {
    setItems(prev => prev.map(it => {
      if (it._key !== key) return it
      const actualizado = { ...it, [campo]: campo === 'nombre' ? valor : Number(valor) }
      actualizado.subtotal = actualizado.cantidad * actualizado.precio_unitario
      return actualizado
    }))
  }, [])

  const eliminarItem = useCallback((key: string) => {
    setItems(prev => prev.filter(it => it._key !== key))
  }, [])

  // ── Descuento ──────────────────────────────────────────────────────────────
  const [descuentoTipo, setDescuentoTipo] = useState<'porcentaje' | 'fijo' | ''>('')
  const [descuentoValor, setDescuentoValor] = useState('')

  // ── Vigencia ───────────────────────────────────────────────────────────────
  const [vigenciaHoras, setVigenciaHoras] = useState('')

  // ── Nota ──────────────────────────────────────────────────────────────────
  const [nota, setNota] = useState('')

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, it) => s + it.subtotal, 0)

  const descuentoMonto = useMemo(() => {
    const val = parseFloat(descuentoValor) || 0
    if (descuentoTipo === 'porcentaje') return Math.min(subtotal * val / 100, subtotal)
    if (descuentoTipo === 'fijo') return Math.min(val, subtotal)
    return 0
  }, [descuentoTipo, descuentoValor, subtotal])

  const baseImponible = subtotal - descuentoMonto
  const ivaMonto = baseImponible * IVA_DEFAULT / 100
  const total = baseImponible + ivaMonto

  // ── Submit ─────────────────────────────────────────────────────────────────
  const [enviando, setEnviando] = useState(false)

  const datosCliente = modoCliente === 'buscar'
    ? {
      cliente_id: clienteSeleccionado?.id ?? null,
      cliente_nombre: clienteSeleccionado?.razon_social ?? '',
      cliente_email: clienteSeleccionado?.email ?? '',
      cliente_telefono: clienteSeleccionado?.telefono ?? null,
    }
    : {
      cliente_id: null,
      cliente_nombre: nuevoNombre,
      cliente_email: nuevoEmail,
      cliente_telefono: nuevoTelefono || null,
    }

  const validar = () => {
    if (!datosCliente.cliente_nombre) return 'Selecciona o crea un cliente'
    if (!datosCliente.cliente_email) return 'El email del cliente es obligatorio'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosCliente.cliente_email)) return 'Email inválido'
    if (items.length === 0) return 'Agrega al menos un producto'
    return null
  }

  async function handleSubmit() {
    const error = validar()
    if (error) { toast.error(error); return }

    setEnviando(true)
    try {
      const payload = {
        ...datosCliente,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        items: items.map(({ _key, ...item }) => item),
        subtotal,
        descuento_tipo: descuentoTipo || null,
        descuento_valor: parseFloat(descuentoValor) || 0,
        descuento_monto: descuentoMonto,
        base_imponible: baseImponible,
        iva_porcentaje: IVA_DEFAULT,
        iva_monto: ivaMonto,
        total,
        vigencia_horas: vigenciaHoras ? parseInt(vigenciaHoras) : null,
        nota: nota || null,
      }

      const res = await fetch('/api/proformas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.email_no_enviado) {
        toast.warning(`Proforma ${data.proforma.numero} creada, pero el email NO se envió: ${data.motivo_email}`)
      } else {
        toast.success(`Proforma ${data.proforma.numero} creada y enviada por email`)
      }
      router.push('/admin/dashboard/proformas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la proforma')
    } finally {
      setEnviando(false)
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ─── Sección Cliente ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Cliente</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setModoCliente('buscar'); setClienteSeleccionado(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                modoCliente === 'buscar'
                  ? 'bg-primary text-white'
                  : 'bg-background-subtle text-foreground-muted hover:text-foreground'
              }`}
            >
              Buscar cliente
            </button>
            <button
              type="button"
              onClick={() => setModoCliente('nuevo')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                modoCliente === 'nuevo'
                  ? 'bg-primary text-white'
                  : 'bg-background-subtle text-foreground-muted hover:text-foreground'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
        </div>

        {modoCliente === 'buscar' ? (
          <div className="space-y-3">
            <div className="relative">
              {buscandoCliente
                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted animate-spin" />
                : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              }
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={busquedaCliente}
                onChange={e => { setBusquedaCliente(e.target.value); setMostrarDropCliente(true) }}
                onFocus={() => setMostrarDropCliente(true)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {mostrarDropCliente && clientesFiltrados.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClienteSeleccionado(c)
                        setBusquedaCliente(c.razon_social)
                        setMostrarDropCliente(false)
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-background-subtle transition-colors border-b border-border last:border-0"
                    >
                      <p className="text-sm font-medium text-foreground">{c.razon_social}</p>
                      <p className="text-xs text-foreground-muted">{c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {clienteSeleccionado && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm">
                <p className="font-semibold text-foreground">{clienteSeleccionado.razon_social}</p>
                <p className="text-foreground-muted text-xs mt-0.5">{clienteSeleccionado.email}</p>
                {clienteSeleccionado.telefono && (
                  <p className="text-foreground-muted text-xs">{clienteSeleccionado.telefono}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground-muted mb-1">Nombre *</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Nombre o razón social"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">Email * <span className="text-danger">(requerido para envío)</span></label>
              <input
                type="email"
                value={nuevoEmail}
                onChange={e => setNuevoEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">Teléfono</label>
              <input
                type="tel"
                value={nuevoTelefono}
                onChange={e => setNuevoTelefono(e.target.value)}
                placeholder="0999000000"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Sección Productos ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Productos</h2>

        {/* Buscador de productos */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar y agregar producto..."
            value={busquedaProducto}
            onChange={e => { setBusquedaProducto(e.target.value); setMostrarDropProducto(true) }}
            onFocus={() => setMostrarDropProducto(true)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {mostrarDropProducto && productosFiltrados.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {productosFiltrados.map(prod => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => agregarProducto(prod)}
                  className="w-full text-left px-4 py-2.5 hover:bg-background-subtle transition-colors border-b border-border last:border-0 flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground">{prod.nombre}</span>
                  <span className="text-sm font-semibold text-primary shrink-0">
                    {formatearPrecio(prod.precio_descuento ?? prod.precio, sym)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agregar ítem en blanco */}
        <button
          type="button"
          onClick={() => setItems(prev => [...prev, {
            _key: `manual-${Date.now()}`,
            producto_id: null,
            nombre: '',
            cantidad: 1,
            precio_unitario: 0,
            subtotal: 0,
          }])}
          className="flex items-center gap-2 text-xs text-foreground-muted hover:text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar línea manual
        </button>

        {/* Lista de ítems */}
        {items.length > 0 && (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_110px_100px_36px] gap-2 px-2 text-xs font-medium text-foreground-muted uppercase tracking-wide">
              <span>Descripción</span>
              <span className="text-center">Cant.</span>
              <span className="text-right">P. Unit.</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>
            {items.map(item => (
              <div key={item._key} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_100px_36px] gap-2 items-center bg-background-subtle rounded-xl p-2">
                <input
                  type="text"
                  value={item.nombre}
                  onChange={e => actualizarItem(item._key, 'nombre', e.target.value)}
                  placeholder="Descripción del producto"
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={e => actualizarItem(item._key, 'cantidad', e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted text-xs">{sym}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.precio_unitario}
                    onChange={e => actualizarItem(item._key, 'precio_unitario', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-sm font-semibold text-right text-foreground px-2">
                  {formatearPrecio(item.subtotal, sym)}
                </p>
                <button
                  type="button"
                  onClick={() => eliminarItem(item._key)}
                  className="p-1.5 rounded-lg hover:bg-danger/10 text-foreground-muted hover:text-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Descuento + Vigencia ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Descuento */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Descuento <span className="text-xs text-foreground-muted font-normal">(opcional)</span></h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDescuentoTipo(descuentoTipo === 'porcentaje' ? '' : 'porcentaje')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                descuentoTipo === 'porcentaje'
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-foreground-muted hover:text-foreground'
              }`}
            >
              <Percent className="w-3.5 h-3.5" /> Porcentaje
            </button>
            <button
              type="button"
              onClick={() => setDescuentoTipo(descuentoTipo === 'fijo' ? '' : 'fijo')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                descuentoTipo === 'fijo'
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-foreground-muted hover:text-foreground'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> Monto fijo
            </button>
          </div>
          {descuentoTipo && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">
                {descuentoTipo === 'porcentaje' ? '%' : sym}
              </span>
              <input
                type="number"
                min={0}
                max={descuentoTipo === 'porcentaje' ? 100 : undefined}
                step={0.01}
                value={descuentoValor}
                onChange={e => setDescuentoValor(e.target.value)}
                placeholder={descuentoTipo === 'porcentaje' ? '10' : '5.00'}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
          {descuentoMonto > 0 && (
            <p className="text-xs text-success font-medium">
              Descuento aplicado: -{formatearPrecio(descuentoMonto, sym)}
            </p>
          )}
        </div>

        {/* Vigencia */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Vigencia <span className="text-xs text-foreground-muted font-normal">(opcional)</span></h2>
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
            <select
              value={vigenciaHoras}
              onChange={e => setVigenciaHoras(e.target.value)}
              className="w-full px-3 py-2.5 pr-9 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="">Sin fecha límite</option>
              <option value="24">24 horas (1 día)</option>
              <option value="48">48 horas (2 días)</option>
              <option value="72">72 horas (3 días)</option>
              <option value="120">5 días</option>
              <option value="168">7 días</option>
              <option value="336">15 días</option>
              <option value="720">30 días</option>
            </select>
          </div>
          {vigenciaHoras && (
            <p className="text-xs text-foreground-muted">
              Válida hasta: <span className="font-medium text-foreground">
                {new Date(Date.now() + parseInt(vigenciaHoras) * 3600000).toLocaleString('es-EC', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                  timeZone: 'America/Guayaquil',
                })}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Nota */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <h2 className="font-semibold text-foreground">Observaciones <span className="text-xs text-foreground-muted font-normal">(opcional — aparece en el PDF)</span></h2>
        <textarea
          rows={2}
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Condiciones especiales, notas de entrega, etc."
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* ─── Resumen de totales ───────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-3">Resumen</h2>
          <div className="space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Subtotal</span>
              <span className="font-medium">{formatearPrecio(subtotal, sym)}</span>
            </div>
            {descuentoMonto > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">
                  Descuento {descuentoTipo === 'porcentaje' ? `(${descuentoValor}%)` : ''}
                </span>
                <span className="font-medium text-success">-{formatearPrecio(descuentoMonto, sym)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">Base imponible</span>
              <span className="font-medium">{formatearPrecio(baseImponible, sym)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">IVA ({IVA_DEFAULT}%)</span>
              <span className="font-medium">{formatearPrecio(ivaMonto, sym)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-primary">{formatearPrecio(total, sym)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Botón enviar ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={enviando}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {enviando ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generando...
            </>
          ) : (
            'Generar y Enviar Proforma'
          )}
        </button>
      </div>

    </div>
  )
}
