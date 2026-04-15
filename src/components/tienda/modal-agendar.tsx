'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { usarCarrito } from '@/hooks/usar-carrito'
import { cn, formatearPrecio } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  productoId: string
  nombre: string
  slug: string
  imagenUrl: string | null
  precio: number
  onCerrar: () => void
}

interface ConfigCitas {
  hora_apertura: string
  hora_cierre: string
  duracion_cita_minutos: number
}

function calcularHoraFin(horaInicio: string, duracion: number): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + duracion
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function generarSlots(apertura: string, cierre: string, duracion: number): string[] {
  const slots: string[] = []
  let actual = new Date(`1970-01-01T${apertura}`)
  const fin   = new Date(`1970-01-01T${cierre}`)
  while (actual < fin) {
    slots.push(actual.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    actual.setMinutes(actual.getMinutes() + duracion)
  }
  return slots
}

export function ModalAgendar({ productoId, nombre, slug, imagenUrl, precio, onCerrar }: Props) {
  const router = useRouter()
  const { agregar } = usarCarrito()

  const [config, setConfig]               = useState<ConfigCitas | null>(null)
  const [cargandoConfig, setCargandoConfig] = useState(true)
  const [fecha, setFecha]                 = useState('')
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [horaSeleccionada, setHoraSeleccionada] = useState('')

  const hoy = new Date().toISOString().split('T')[0]

  // Cargar configuración de citas al abrir
  useEffect(() => {
    async function cargarConfig() {
      const supabase = crearClienteSupabase()
      const { data } = await supabase
        .from('configuracion_tienda')
        .select('hora_apertura, hora_cierre, duracion_cita_minutos')
        .single()
      setConfig(data ?? { hora_apertura: '09:00', hora_cierre: '18:00', duracion_cita_minutos: 30 })
      setCargandoConfig(false)
    }
    cargarConfig()
  }, [])

  // Cargar horas ocupadas cuando cambia la fecha
  useEffect(() => {
    if (!fecha) return
    setHoraSeleccionada('')
    setCargandoSlots(true)
    const supabase = crearClienteSupabase()
    supabase
      .from('citas')
      .select('hora_inicio')
      .eq('producto_id', productoId)
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'reservada', 'confirmada'])
      .then(({ data }) => {
        setHorasOcupadas((data ?? []).map(c => c.hora_inicio.slice(0, 5)))
        setCargandoSlots(false)
      })
  }, [fecha, productoId])

  const slots = config ? generarSlots(config.hora_apertura, config.hora_cierre, config.duracion_cita_minutos) : []

  function confirmar() {
    if (!fecha || !horaSeleccionada || !config) return
    const horaFin = calcularHoraFin(horaSeleccionada, config.duracion_cita_minutos)
    agregar({
      producto_id: productoId,
      nombre,
      slug,
      tipo_producto: 'servicio',
      imagen_url: imagenUrl,
      precio,
      cantidad: 1,
      cita: { fecha, hora_inicio: horaSeleccionada, hora_fin: horaFin },
    })
    toast.success('Cita agendada y añadida al carrito', {
      action: { label: 'Ver carrito', onClick: () => router.push('/carrito') },
    })
    onCerrar()
  }

  const fechaLegible = fecha
    ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          {imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenUrl} alt={nombre} className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold uppercase tracking-wide">Agendar cita</p>
            <p className="text-sm font-bold text-foreground leading-tight line-clamp-2 mt-0.5">{nombre}</p>
            <p className="text-sm font-black text-emerald-600 mt-0.5">{formatearPrecio(precio)}</p>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground-muted hover:bg-background-subtle hover:text-foreground transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

          {cargandoConfig ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* Selector de fecha */}
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Selecciona el día
                </p>
                <input
                  type="date"
                  value={fecha}
                  min={hoy}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {fecha && (
                  <p className="text-xs text-foreground-muted mt-1 capitalize">{fechaLegible}</p>
                )}
              </div>

              {/* Slots de hora */}
              {fecha && (
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Horario disponible
                  </p>

                  {cargandoSlots ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-foreground-muted italic text-center py-4">
                      No hay horarios configurados
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(hora => {
                        const ocupada = horasOcupadas.includes(hora)
                        const seleccionado = horaSeleccionada === hora
                        return (
                          <button
                            key={hora}
                            type="button"
                            disabled={ocupada}
                            onClick={() => setHoraSeleccionada(hora)}
                            className={cn(
                              'h-10 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1',
                              ocupada
                                ? 'bg-background-subtle text-foreground-muted/40 cursor-not-allowed line-through text-xs'
                                : seleccionado
                                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                                  : 'bg-card border border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                            )}
                          >
                            {seleccionado && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
                            {hora}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Resumen selección */}
              {horaSeleccionada && config && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground capitalize">{fechaLegible}</p>
                    <p className="text-xs text-foreground-muted">
                      {horaSeleccionada} — {calcularHoraFin(horaSeleccionada, config.duracion_cita_minutos)}
                      <span className="ml-1 text-primary font-semibold">({config.duracion_cita_minutos} min)</span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer fijo */}
        <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0">
          <button
            onClick={confirmar}
            disabled={!fecha || !horaSeleccionada || cargandoConfig}
            className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30"
          >
            <ShoppingCart className="w-4 h-4" />
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
