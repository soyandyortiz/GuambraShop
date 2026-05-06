'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { Plus, Trash2, FileText } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import type { ConfiguracionFacturacion, Pedido, ItemFactura, CompradorFactura } from '@/types'

interface Props {
  config: ConfiguracionFacturacion
  pedidos: Pedido[]
}

const TIPOS_ID = [
  { valor: '05', label: 'Cédula (persona natural)' },
  { valor: '04', label: 'RUC (empresa)' },
  { valor: '06', label: 'Pasaporte' },
  { valor: '07', label: 'Consumidor Final' },
]

function itemVacio(): ItemFactura {
  return { descripcion: '', cantidad: 1, precio_unitario: 0, descuento: 0, subtotal: 0, iva: 15 }
}

export function FormularioNuevaFactura({ config, pedidos }: Props) {
  const router = useRouter()
  const supabase = crearClienteSupabase()

  const [guardando, setGuardando] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<string>('')

  const [comprador, setComprador] = useState<CompradorFactura>({
    tipo_identificacion: '05',
    identificacion: '',
    razon_social: '',
    email: null,
    direccion: null,
    telefono: null,
  })

  const [items, setItems] = useState<ItemFactura[]>([itemVacio()])
  const [notas, setNotas] = useState('')

  function cambiarComprador(campo: keyof CompradorFactura, valor: string | null) {
    setComprador(prev => ({ ...prev, [campo]: valor }))
  }

  function actualizarItem(idx: number, campo: keyof ItemFactura, valor: string | number) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [campo]: typeof valor === 'string' ? valor : Number(valor) }
      const it = next[idx]
      const base = it.cantidad * it.precio_unitario - it.descuento
      next[idx].subtotal = Math.max(0, base)
      return next
    })
  }

  function eliminarItem(idx: number) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function calcularTotales() {
    const subtotal_0  = items.filter(i => i.iva === 0).reduce((s, i) => s + i.subtotal, 0)
    const subtotal_iva = items.filter(i => i.iva > 0).reduce((s, i) => s + i.subtotal, 0)
    const total_iva   = subtotal_iva * (config.tarifa_iva / 100)
    const descuento   = items.reduce((s, i) => s + i.descuento, 0)
    const total       = subtotal_0 + subtotal_iva + total_iva
    return { subtotal_0, subtotal_iva, total_iva, descuento, total }
  }

  function cargarPedido(pedidoId: string) {
    setPedidoSeleccionado(pedidoId)
    const pedido = pedidos.find(p => p.id === pedidoId)
    if (!pedido) return

    // Preferir datos_facturacion si el cliente los proporcionó
    const df = pedido.datos_facturacion
    if (df) {
      setComprador({
        tipo_identificacion: (df.tipo_identificacion ?? '05') as CompradorFactura['tipo_identificacion'],
        identificacion:      df.identificacion ?? '',
        razon_social:        df.razon_social ?? '',
        email:               df.email ?? null,
        direccion:           df.direccion ?? null,
        telefono:            df.telefono ?? null,
      })
    } else {
      setComprador(prev => ({
        ...prev,
        razon_social: pedido.nombres.toUpperCase(),
        email:        pedido.email ?? null,
        telefono:     pedido.whatsapp ?? null,
      }))
    }

    if (pedido.total > 0) {
      const base = pedido.total / (1 + config.tarifa_iva / 100)
      setItems([{
        descripcion:     `Pedido #${pedido.numero_orden}`,
        cantidad:        1,
        precio_unitario: parseFloat(base.toFixed(2)),
        descuento:       0,
        subtotal:        parseFloat(base.toFixed(2)),
        iva:             config.tarifa_iva,
      }])
    }
  }

  async function emitir(e: React.FormEvent) {
    e.preventDefault()

    if (!comprador.identificacion && comprador.tipo_identificacion !== '07') {
      toast.error('Ingresa la identificación del comprador')
      return
    }
    if (!comprador.razon_social && comprador.tipo_identificacion !== '07') {
      toast.error('Ingresa el nombre o razón social del comprador')
      return
    }
    if (items.some(i => !i.descripcion || i.cantidad <= 0)) {
      toast.error('Completa todos los ítems de la factura')
      return
    }

    setGuardando(true)
    try {
      const totales = calcularTotales()
      const seq = config.secuencial_actual
      const seqStr = String(seq).padStart(9, '0')
      const numFactura = `${config.codigo_establecimiento.padStart(3,'0')}-${config.punto_emision.padStart(3,'0')}-${seqStr}`

      const compradorFinal: CompradorFactura = comprador.tipo_identificacion === '07'
        ? { tipo_identificacion: '07', identificacion: '9999999999999', razon_social: 'CONSUMIDOR FINAL', email: null, direccion: null, telefono: null }
        : comprador

      const { error } = await supabase.from('facturas').insert({
        pedido_id:         pedidoSeleccionado || null,
        numero_secuencial: seqStr,
        numero_factura:    numFactura,
        fecha_emision:     new Date().toISOString().slice(0, 10),
        estado:            'borrador',
        datos_comprador:   compradorFinal,
        items,
        totales,
        notas:             notas || null,
      })

      if (error) throw error

      await supabase
        .from('configuracion_facturacion')
        .update({ secuencial_actual: seq + 1 })
        .eq('id', config.id)

      toast.success(`Factura ${numFactura} creada como borrador`)
      router.push('/admin/dashboard/facturacion')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Error al crear la factura')
    } finally {
      setGuardando(false)
    }
  }

  const totales = calcularTotales()

  return (
    <form onSubmit={emitir} className="space-y-5">

      {/* Vincular pedido (opcional) */}
      {pedidos.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Vincular a pedido <span className="text-foreground-muted font-normal">(opcional)</span></h2>
          <select
            value={pedidoSeleccionado}
            onChange={e => cargarPedido(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Sin vincular —</option>
            {pedidos.map(p => (
              <option key={p.id} value={p.id}>
                #{p.numero_orden} · {p.nombres} · {formatearPrecio(p.total ?? 0)}{p.datos_facturacion ? ' ✓ datos factura' : ''}
              </option>
            ))}
          </select>
          {pedidoSeleccionado && (() => {
            const pd = pedidos.find(p => p.id === pedidoSeleccionado)
            return pd?.datos_facturacion
              ? <p className="text-xs text-green-700 font-medium">✓ El cliente proporcionó sus datos de facturación. Cargados automáticamente.</p>
              : <p className="text-xs text-foreground-muted">Datos de contacto del pedido cargados. Puedes editarlos.</p>
          })()}
        </section>
      )}

      {/* Datos del comprador */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Datos del comprador</h2>

        <div>
          <label className="text-xs font-medium text-foreground-muted block mb-1">Tipo de identificación</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_ID.map(t => (
              <button
                key={t.valor}
                type="button"
                onClick={() => cambiarComprador('tipo_identificacion', t.valor as CompradorFactura['tipo_identificacion'])}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
                  comprador.tipo_identificacion === t.valor
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground-muted hover:bg-background-subtle'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {comprador.tipo_identificacion !== '07' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">
                {comprador.tipo_identificacion === '04' ? 'RUC' : comprador.tipo_identificacion === '05' ? 'Cédula' : 'Pasaporte'}
              </label>
              <input
                type="text"
                value={comprador.identificacion}
                onChange={e => cambiarComprador('identificacion', e.target.value)}
                placeholder="Número de identificación"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Nombre / Razón social</label>
              <input
                type="text"
                value={comprador.razon_social}
                onChange={e => cambiarComprador('razon_social', e.target.value.toUpperCase())}
                placeholder="NOMBRE COMPLETO O EMPRESA"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Email <span className="text-foreground-muted/60">(para envío RIDE)</span></label>
              <input
                type="email"
                value={comprador.email ?? ''}
                onChange={e => cambiarComprador('email', e.target.value || null)}
                placeholder="cliente@correo.com"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1">Teléfono</label>
              <input
                type="tel"
                value={comprador.telefono ?? ''}
                onChange={e => cambiarComprador('telefono', e.target.value || null)}
                placeholder="0999999999"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground-muted block mb-1">Dirección</label>
              <input
                type="text"
                value={comprador.direccion ?? ''}
                onChange={e => cambiarComprador('direccion', e.target.value || null)}
                placeholder="Av. Principal 123, Ciudad"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}
      </section>

      {/* Ítems */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Detalle de productos / servicios</h2>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-muted">Ítem {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => eliminarItem(idx)} className="text-foreground-muted hover:text-danger">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={item.descripcion}
                onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                placeholder="Descripción del producto o servicio"
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-foreground-muted block mb-1">Cant.</label>
                  <input
                    type="number" min={1} step={1}
                    value={item.cantidad}
                    onChange={e => actualizarItem(idx, 'cantidad', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-foreground-muted block mb-1">P. unitario</label>
                  <input
                    type="number" min={0} step={0.01}
                    value={item.precio_unitario}
                    onChange={e => actualizarItem(idx, 'precio_unitario', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-foreground-muted block mb-1">Descuento</label>
                  <input
                    type="number" min={0} step={0.01}
                    value={item.descuento}
                    onChange={e => actualizarItem(idx, 'descuento', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-foreground-muted block mb-1">IVA %</label>
                  <select
                    value={item.iva}
                    onChange={e => actualizarItem(idx, 'iva', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value={0}>0% (exento)</option>
                    <option value={config.tarifa_iva}>{config.tarifa_iva}%</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-right text-foreground-muted">
                Subtotal: <span className="font-semibold text-foreground">{formatearPrecio(item.subtotal)}</span>
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setItems(prev => [...prev, itemVacio()])}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-foreground-muted hover:text-primary hover:border-primary transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar ítem
        </button>
      </section>

      {/* Totales */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-foreground mb-3">Resumen</h2>
        {totales.subtotal_0 > 0 && (
          <div className="flex justify-between text-sm"><span className="text-foreground-muted">Subtotal 0%</span><span>{formatearPrecio(totales.subtotal_0)}</span></div>
        )}
        {totales.subtotal_iva > 0 && (
          <div className="flex justify-between text-sm"><span className="text-foreground-muted">Subtotal {config.tarifa_iva}%</span><span>{formatearPrecio(totales.subtotal_iva)}</span></div>
        )}
        {totales.descuento > 0 && (
          <div className="flex justify-between text-sm text-danger"><span>Descuento</span><span>-{formatearPrecio(totales.descuento)}</span></div>
        )}
        <div className="flex justify-between text-sm"><span className="text-foreground-muted">IVA {config.tarifa_iva}%</span><span>{formatearPrecio(totales.total_iva)}</span></div>
        <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
          <span>TOTAL</span>
          <span className="text-primary">{formatearPrecio(totales.total)}</span>
        </div>
      </section>

      {/* Notas */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <label className="text-xs font-medium text-foreground-muted block mb-2">Notas adicionales <span className="text-foreground-muted/60">(opcional)</span></label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          placeholder="Información adicional para el comprador..."
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </section>

      {/* Botones */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm"
        >
          <FileText className="w-4 h-4" />
          {guardando ? 'Creando…' : 'Crear borrador'}
        </button>
      </div>

      <p className="text-xs text-foreground-muted text-center">
        La factura se crea como <strong>borrador</strong>. Luego podrás firmarla y enviarla al SRI desde el panel de facturas.
      </p>
    </form>
  )
}
