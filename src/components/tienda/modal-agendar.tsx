'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, ShoppingCart, Loader2, CheckCircle2, User, Check } from 'lucide-react'
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
  simboloMoneda?: string
  onCerrar: () => void
}

interface ConfigCitas {
  hora_apertura: string
  hora_cierre: string
  duracion_cita_minutos: number
  capacidad_citas_simultaneas: number
}

interface Empleado {
  id: string
  nombre_completo: string
}

function calcularHoraFin(horaInicio: string, duracion: number): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + duracion
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function generarSlots(apertura: string, cierre: string, duracion: number): string[] {
  const slots: string[] = []
  let actual = new Date(`1970-01-01T${apertura}`)
  const fin = new Date(`1970-01-01T${cierre}`)
  while (actual < fin) {
    slots.push(actual.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    actual.setMinutes(actual.getMinutes() + duracion)
  }
  return slots
}

type Paso = 'datetime' | 'empleado'

export function ModalAgendar({ productoId, nombre, slug, imagenUrl, precio, simboloMoneda = '$', onCerrar }: Props) {
  const router = useRouter()
  const { agregar } = usarCarrito()

  const [config, setConfig] = useState<ConfigCitas | null>(null)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [cargando, setCargando] = useState(true)

  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)

  const [empleadoId, setEmpleadoId] = useState<string>('cualquiera')
  const [empleadosOcupados, setEmpleadosOcupados] = useState<string[]>([])
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false)

  const [paso, setPaso] = useState<Paso>('datetime')

  const hoy = new Date().toISOString().split('T')[0]

  // Cargar config + empleados al abrir
  useEffect(() => {
    async function cargarDatos() {
      try {
        const supabase = crearClienteSupabase()
        const [{ data: cfg }, { data: emps }] = await Promise.all([
          supabase
            .from('configuracion_tienda')
            .select('hora_apertura, hora_cierre, duracion_cita_minutos, capacidad_citas_simultaneas')
            .single(),
          supabase
            .from('empleados_cita')
            .select('id, nombre_completo')
            .eq('activo', true)
            .order('orden'),
        ])
        setConfig(cfg ?? { hora_apertura: '09:00', hora_cierre: '18:00', duracion_cita_minutos: 30, capacidad_citas_simultaneas: 1 })
        setEmpleados(emps ?? [])
      } catch (error) {
        console.error('Error cargando configuración de citas:', error)
        // Valores por defecto en caso de error
        setConfig({ hora_apertura: '09:00', hora_cierre: '18:00', duracion_cita_minutos: 30, capacidad_citas_simultaneas: 1 })
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [])

  // Resetear hora SOLO cuando cambia la fecha
  useEffect(() => {
    setHora('')
  }, [fecha])

  // Recargar horas ocupadas cuando cambia la fecha (sin resetear hora)
  useEffect(() => {
    if (!fecha || !config) return
    setCargandoSlots(true)
    const supabase = crearClienteSupabase()

    supabase
      .from('citas')
      .select('hora_inicio')
      .eq('fecha', fecha)
      .in('estado', ['reservada', 'confirmada'])
      .then(({ data }) => {
        if (data) {
          const counts: Record<string, number> = {}
          data.forEach(c => {
            const h = c.hora_inicio.slice(0, 5)
            counts[h] = (counts[h] || 0) + 1
          })
          const capacidad = empleados.length > 0 ? empleados.length : (config.capacidad_citas_simultaneas ?? 1)
          setHorasOcupadas(
            Object.entries(counts).filter(([, n]) => n >= capacidad).map(([h]) => h)
          )
        } else {
          setHorasOcupadas([])
        }
        setCargandoSlots(false)
      })
  }, [fecha, config, empleados.length])

  const slots = config ? generarSlots(config.hora_apertura, config.hora_cierre, config.duracion_cita_minutos) : []

  const fechaLegible = fecha
    ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  const empleadoSeleccionado = empleados.find(e => e.id === empleadoId)
  const iniciales = (n: string) => n.split(' ').slice(0, 2).map(x => x[0]?.toUpperCase() ?? '').join('')

  // Avanzar al paso 2: consulta qué empleados están ocupados en esa fecha+hora
  async function avanzarAEmpleado() {
    if (!fecha || !hora) return
    if (empleados.length === 0) {
      confirmar()
      return
    }

    setCargandoEmpleados(true)
    try {
      const supabase = crearClienteSupabase()
      const { data } = await supabase
        .from('citas')
        .select('empleado_id, hora_inicio')
        .eq('fecha', fecha)
        .in('estado', ['reservada', 'confirmada'])

      const ocupados = (data ?? [])
        .filter(c => c.hora_inicio?.slice(0, 5) === hora && c.empleado_id)
        .map(c => c.empleado_id as string)

      setEmpleadosOcupados(ocupados)
    } catch {
      setEmpleadosOcupados([])
    }

    setCargandoEmpleados(false)
    setPaso('empleado')
  }

  function confirmar() {
    if (!fecha || !hora || !config) return
    const horaFin = calcularHoraFin(hora, config.duracion_cita_minutos)
    agregar({
      producto_id: productoId,
      nombre,
      slug,
      tipo_producto: 'servicio',
      imagen_url: imagenUrl,
      precio,
      cantidad: 1,
      cita: {
        fecha,
        hora_inicio: hora,
        hora_fin: horaFin,
        empleado_id: empleadoId !== 'cualquiera' ? empleadoId : null,
        empleado_nombre: empleadoId !== 'cualquiera' ? (empleadoSeleccionado?.nombre_completo ?? undefined) : undefined,
      },
    })
    toast.success('Cita agendada y añadida al carrito', {
      action: { label: 'Ver carrito', onClick: () => router.push('/carrito') },
    })
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          {imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenUrl} alt={nombre} className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold uppercase tracking-wide">
              {paso === 'datetime' ? 'Agendar cita' : 'Seleccionar personal'}
            </p>
            <p className="text-sm font-bold text-foreground leading-tight line-clamp-2 mt-0.5">{nombre}</p>
            <p className="text-sm font-black text-primary mt-0.5">{formatearPrecio(precio, simboloMoneda)}</p>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground-muted hover:bg-background-subtle hover:text-foreground transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador de pasos */}
        {empleados.length > 0 && !cargando && (
          <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 flex-shrink-0">
            {(['datetime', 'empleado'] as Paso[]).map((p, i) => (
              <div key={p} className="flex items-center gap-1.5 flex-1">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  paso === p ? 'bg-primary text-white' :
                  (paso === 'empleado' && p === 'datetime') ? 'bg-primary/20 text-primary' :
                  'bg-background-subtle text-foreground-muted'
                )}>
                  {paso === 'empleado' && p === 'datetime' ? '✓' : i + 1}
                </div>
                <span className={cn('text-[11px] font-medium', paso === p ? 'text-foreground' : 'text-foreground-muted')}>
                  {p === 'datetime' ? 'Fecha y hora' : 'Personal'}
                </span>
                {i < 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>
        )}

        {/* ─── PASO 1: Fecha y hora ─── */}
        {paso === 'datetime' && (
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">
            {cargando ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : (
              <>
                {/* Fecha */}
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

                {/* Slots */}
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
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map(s => {
                          const ocupada = horasOcupadas.includes(s)
                          const seleccionado = hora === s
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={ocupada}
                              onClick={() => setHora(s)}
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
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen selección */}
                {hora && config && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground capitalize">{fechaLegible}</p>
                      <p className="text-xs text-foreground-muted">
                        {hora} — {calcularHoraFin(hora, config.duracion_cita_minutos)}
                        <span className="ml-1 text-primary font-semibold">({config.duracion_cita_minutos} min)</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── PASO 2: Selección de empleado ─── */}
        {paso === 'empleado' && (
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
            {/* Resumen fecha/hora */}
            <div className="bg-background-subtle rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <p className="text-xs text-foreground capitalize">
                <span className="font-semibold">{fechaLegible}</span> · {hora}
              </p>
              <button
                onClick={() => { setPaso('datetime'); setEmpleadosOcupados([]) }}
                className="ml-auto text-xs text-primary font-semibold hover:underline"
              >
                Cambiar
              </button>
            </div>

            <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> ¿Con quién prefieres tu cita?
            </p>

            {/* Opción: cualquiera */}
            <button
              type="button"
              onClick={() => setEmpleadoId('cualquiera')}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all',
                empleadoId === 'cualquiera'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background-subtle hover:border-primary/40'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                empleadoId === 'cualquiera' ? 'bg-primary/20' : 'bg-border/60'
              )}>
                <User className={cn('w-5 h-5', empleadoId === 'cualquiera' ? 'text-primary' : 'text-foreground-muted')} />
              </div>
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', empleadoId === 'cualquiera' ? 'text-primary' : 'text-foreground')}>
                  Cualquier persona disponible
                </p>
                <p className="text-xs text-foreground-muted">Se asignará automáticamente</p>
              </div>
              {empleadoId === 'cualquiera' && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>

            {/* Empleados */}
            {empleados.map(emp => {
              const sel = empleadoId === emp.id
              const ocupado = empleadosOcupados.includes(emp.id)
              return (
                <button
                  key={emp.id}
                  type="button"
                  disabled={ocupado}
                  onClick={() => !ocupado && setEmpleadoId(emp.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all',
                    ocupado
                      ? 'border-border bg-background-subtle opacity-50 cursor-not-allowed'
                      : sel
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
                    ocupado ? 'bg-border/60 text-foreground-muted' :
                    sel ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                  )}>
                    {iniciales(emp.nombre_completo)}
                  </div>
                  <div className="flex-1">
                    <p className={cn('text-sm font-semibold', ocupado ? 'text-foreground-muted' : sel ? 'text-primary' : 'text-foreground')}>
                      {emp.nombre_completo}
                    </p>
                    <p className={cn('text-xs', ocupado ? 'text-red-400 font-medium' : 'text-foreground-muted')}>
                      {ocupado ? 'Ocupado en este horario' : 'Disponible'}
                    </p>
                  </div>
                  {sel && !ocupado && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Footer fijo */}
        <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 flex flex-col gap-2">
          {paso === 'datetime' ? (
            <button
              onClick={avanzarAEmpleado}
              disabled={!fecha || !hora || cargando || cargandoEmpleados}
              className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2.5 px-6 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/30"
            >
              {cargando || cargandoEmpleados ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : empleados.length > 0 ? (
                <>
                  <User className="w-4 h-4 flex-shrink-0" />
                  Seleccionar personal
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                  AGREGAR AL CARRITO
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={confirmar}
                className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2.5 px-6 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/30"
              >
                <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                AGREGAR AL CARRITO
              </button>
              <button
                onClick={() => { setPaso('datetime'); setEmpleadosOcupados([]) }}
                className="w-full h-10 rounded-2xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:border-primary/30 transition-all"
              >
                ← Cambiar horario
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
