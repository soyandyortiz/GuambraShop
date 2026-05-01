'use client'

import { useState, useTransition } from 'react'
import {
  Search, Calendar, Package,
  Phone, CheckCircle2, KeyRound, RotateCcw, XCircle
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn, formatearPrecio } from '@/lib/utils'

const ESTADOS: Record<string, { etiqueta: string; color: string }> = {
  reservado: { etiqueta: 'Reservado',  color: 'bg-blue-500/15 text-blue-600 border-blue-300' },
  activo:    { etiqueta: 'Activo',     color: 'bg-success/15 text-success border-success/30' },
  devuelto:  { etiqueta: 'Devuelto',   color: 'bg-foreground/10 text-foreground-muted border-border' },
  cancelado: { etiqueta: 'Cancelado',  color: 'bg-danger/15 text-danger border-danger/30' },
}

interface AlquilerExt {
  id: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  cantidad: number
  hora_recogida: string | null
  estado: string
  creado_en: string
  producto: {
    id: string
    nombre: string
    precio: number
    imagenes_producto: { url: string; orden: number }[]
  }
  pedido: {
    numero_orden: string
    nombres: string
    email: string
    whatsapp: string
  } | null
}

interface Props { alquileres: AlquilerExt[] }

export function TablaAlquileres({ alquileres: alqInit }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [alquileres, setAlquileres] = useState<AlquilerExt[]>(alqInit)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'reservado' | 'activo' | 'devuelto' | 'cancelado'>('todos')
  const [actualizando, setActualizando] = useState<string | null>(null)

  const filtrados = alquileres.filter(a => {
    const coincideFiltro = filtro === 'todos' || a.estado === filtro
    const texto = busqueda.toLowerCase()
    const coincideBusqueda =
      !texto ||
      (a.pedido?.numero_orden ?? '').toLowerCase().includes(texto) ||
      (a.pedido?.nombres ?? '').toLowerCase().includes(texto) ||
      a.producto.nombre.toLowerCase().includes(texto)
    return coincideFiltro && coincideBusqueda
  })

  async function cambiarEstado(id: string, nuevoEstado: string) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('alquileres')
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq('id', id)
    setActualizando(null)
    if (error) { toast.error('Error al actualizar el alquiler'); return }
    setAlquileres(prev => prev.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a))
    toast.success('Alquiler actualizado')
    startTransition(() => router.refresh())
  }

  const fmtFecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por orden, cliente o artículo…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['todos', 'reservado', 'activo', 'devuelto', 'cancelado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                'h-10 px-3 rounded-xl text-xs font-semibold border transition-all',
                filtro === f
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-foreground-muted border-border hover:border-primary/40'
              )}
            >
              {f === 'todos' ? 'Todos' : ESTADOS[f]?.etiqueta ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-foreground-muted">
        {filtrados.length} alquiler{filtrados.length !== 1 ? 'es' : ''}
        {filtro !== 'todos' ? ` · ${ESTADOS[filtro]?.etiqueta}` : ''}
      </p>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-background-subtle flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-7 h-7 text-foreground-muted/30" />
          </div>
          <p className="text-sm font-semibold text-foreground-muted">Sin alquileres</p>
          <p className="text-xs text-foreground-muted mt-1">No hay registros que coincidan con el filtro.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map(alq => {
            const imagen = [...(alq.producto.imagenes_producto ?? [])].sort((a: { url: string; orden: number }, b: { url: string; orden: number }) => a.orden - b.orden)[0]?.url ?? null
            const esBadge = ESTADOS[alq.estado] ?? { etiqueta: alq.estado, color: 'bg-border text-foreground-muted border-border' }
            const totalAlquiler = alq.producto.precio * alq.dias * alq.cantidad

            return (
              <div key={alq.id} className="bg-card border border-card-border rounded-2xl p-4 flex flex-col gap-3">

                {/* Cabecera */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-background-subtle border border-border flex-shrink-0">
                    {imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagen} alt={alq.producto.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-foreground-muted/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{alq.producto.nombre}</p>
                    {alq.pedido && (
                      <p className="text-xs text-foreground-muted">
                        Orden <span className="font-semibold text-primary">{alq.pedido.numero_orden}</span>
                        {' · '}{alq.pedido.nombres}
                      </p>
                    )}
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border flex-shrink-0', esBadge.color)}>
                    {esBadge.etiqueta}
                  </span>
                </div>

                {/* Período y detalles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 bg-background-subtle rounded-xl px-3 py-2">
                    <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-foreground-muted">Retiro</p>
                      <p className="text-xs font-semibold text-foreground">{fmtFecha(alq.fecha_inicio)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-background-subtle rounded-xl px-3 py-2">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-foreground-muted">Devolución</p>
                      <p className="text-xs font-semibold text-foreground">{fmtFecha(alq.fecha_fin)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-background-subtle rounded-xl px-3 py-2">
                    <KeyRound className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-foreground-muted">Días · Piezas</p>
                      <p className="text-xs font-semibold text-foreground">{alq.dias} día{alq.dias !== 1 ? 's' : ''} · {alq.cantidad} ud.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-[10px] text-foreground-muted">Total alquiler</p>
                      <p className="text-xs font-bold text-primary">{formatearPrecio(totalAlquiler)}</p>
                    </div>
                  </div>
                </div>

                {/* Contacto + hora recogida */}
                <div className="flex flex-wrap items-center gap-3">
                  {alq.hora_recogida && (
                    <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                      Hora retiro: {alq.hora_recogida.slice(0, 5)}
                    </span>
                  )}
                  {alq.pedido?.whatsapp && (
                    <a
                      href={`https://wa.me/${alq.pedido.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-[#25D366] font-semibold hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {alq.pedido.whatsapp}
                    </a>
                  )}
                </div>

                {/* Acciones de estado */}
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <span className="text-[10px] text-foreground-muted mr-1">Cambiar estado:</span>
                  {alq.estado !== 'activo' && alq.estado !== 'devuelto' && alq.estado !== 'cancelado' && (
                    <button
                      disabled={actualizando === alq.id}
                      onClick={() => cambiarEstado(alq.id, 'activo')}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-success/10 text-success text-[11px] font-semibold hover:bg-success/20 disabled:opacity-50 transition-all"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Activar
                    </button>
                  )}
                  {alq.estado !== 'devuelto' && alq.estado !== 'cancelado' && (
                    <button
                      disabled={actualizando === alq.id}
                      onClick={() => cambiarEstado(alq.id, 'devuelto')}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-foreground/10 text-foreground-muted text-[11px] font-semibold hover:bg-foreground/20 disabled:opacity-50 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" /> Devuelto
                    </button>
                  )}
                  {alq.estado !== 'cancelado' && alq.estado !== 'devuelto' && (
                    <button
                      disabled={actualizando === alq.id}
                      onClick={() => cambiarEstado(alq.id, 'cancelado')}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-danger/10 text-danger text-[11px] font-semibold hover:bg-danger/20 disabled:opacity-50 transition-all"
                    >
                      <XCircle className="w-3 h-3" /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
