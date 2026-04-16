'use client'

import { useState, useTransition } from 'react'
import { Truck, Plus, Pencil, Trash2, Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PROVINCIAS_ECUADOR } from '@/lib/ecuador'

interface ZonaEnvio {
  id: string
  provincia: string
  ciudad: string
  precio: number
  tiempo_entrega: string | null
  esta_activa: boolean
}

interface Props { zonas: ZonaEnvio[] }

const INPUT = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const SELECT = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer transition-all'

function FormZona({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: Partial<ZonaEnvio>
  onGuardar: (data: Omit<ZonaEnvio, 'id' | 'esta_activa'>) => Promise<void>
  onCancelar: () => void
}) {
  const [provincia, setProvincia] = useState(inicial?.provincia ?? '')
  const [ciudad, setCiudad] = useState(inicial?.ciudad ?? '')
  const [precio, setPrecio] = useState(inicial?.precio?.toString() ?? '')
  const [tiempo, setTiempo] = useState(inicial?.tiempo_entrega ?? '')
  const [guardando, setGuardando] = useState(false)

  const ciudades = PROVINCIAS_ECUADOR.find(p => p.nombre === provincia)?.ciudades ?? []

  async function handleGuardar() {
    if (!provincia) { toast.error('Selecciona la provincia'); return }
    if (!ciudad) { toast.error('Selecciona la ciudad'); return }
    const precioNum = parseFloat(precio)
    if (isNaN(precioNum) || precioNum < 0) { toast.error('Precio inválido'); return }
    setGuardando(true)
    await onGuardar({ provincia, ciudad, precio: precioNum, tiempo_entrega: tiempo.trim() || null })
    setGuardando(false)
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Provincia */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Provincia *</label>
          <div className="relative">
            <select
              value={provincia}
              onChange={e => { setProvincia(e.target.value); setCiudad('') }}
              className={SELECT}
              disabled={!!inicial?.ciudad} // no cambiar ciudad en edición
            >
              <option value="">Selecciona...</option>
              {PROVINCIAS_ECUADOR.map(p => (
                <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
          </div>
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Ciudad *</label>
          <div className="relative">
            <select
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              disabled={!provincia || !!inicial?.ciudad}
              className={cn(SELECT, (!provincia || !!inicial?.ciudad) && 'opacity-50 cursor-not-allowed')}
            >
              <option value="">Selecciona...</option>
              {ciudades.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Precio */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Precio de envío *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted font-medium">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="0.00"
              className={cn(INPUT, 'pl-7')}
            />
          </div>
        </div>

        {/* Tiempo entrega */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Tiempo entrega</label>
          <input
            type="text"
            value={tiempo}
            onChange={e => setTiempo(e.target.value)}
            placeholder="Ej: 1-2 días hábiles"
            className={INPUT}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancelar}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:bg-background-subtle transition-all"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-all"
        >
          <Check className="w-3.5 h-3.5" /> {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export function ListaZonasEnvio({ zonas: zonasServidor }: Props) {
  const [zonas, setZonas] = useState<ZonaEnvio[]>(zonasServidor)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtradas = zonas.filter(z =>
    z.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
    z.provincia.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Agrupar por provincia
  const porProvincia = filtradas.reduce<Record<string, ZonaEnvio[]>>((acc, z) => {
    if (!acc[z.provincia]) acc[z.provincia] = []
    acc[z.provincia].push(z)
    return acc
  }, {})

  async function crearZona(data: Omit<ZonaEnvio, 'id' | 'esta_activa'>) {
    const supabase = crearClienteSupabase()
    const { data: nueva, error } = await supabase
      .from('zonas_envio')
      .insert({ ...data, esta_activa: true })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') toast.error(`Ya existe una zona para ${data.ciudad}`)
      else toast.error('Error al crear la zona')
      return
    }
    setZonas(prev => [...prev, nueva])
    setMostrarForm(false)
    toast.success(`Zona ${data.ciudad} creada`)
    startTransition(() => router.refresh())
  }

  async function editarZona(id: string, data: Omit<ZonaEnvio, 'id' | 'esta_activa'>) {
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('zonas_envio')
      .update({ precio: data.precio, tiempo_entrega: data.tiempo_entrega })
      .eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    setZonas(prev => prev.map(z => z.id === id ? { ...z, ...data } : z))
    setEditandoId(null)
    toast.success('Zona actualizada')
    startTransition(() => router.refresh())
  }

  async function toggleActiva(id: string, activa: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('zonas_envio').update({ esta_activa: !activa }).eq('id', id)
    setZonas(prev => prev.map(z => z.id === id ? { ...z, esta_activa: !activa } : z))
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, ciudad: string) {
    if (!confirm(`¿Eliminar la zona de envío para "${ciudad}"?`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('zonas_envio').delete().eq('id', id)
    setZonas(prev => prev.filter(z => z.id !== id))
    toast.success(`Zona ${ciudad} eliminada`)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar ciudad o provincia..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 h-10 px-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Nueva zona
          </button>
        )}
      </div>

      {/* Formulario nueva zona */}
      {mostrarForm && (
        <FormZona
          onGuardar={crearZona}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {/* Lista vacía */}
      {filtradas.length === 0 && !mostrarForm && (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Truck className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin zonas de envío</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda ? 'No se encontraron resultados' : 'Agrega ciudades con sus precios de envío'}
          </p>
        </div>
      )}

      {/* Zonas agrupadas por provincia */}
      {Object.entries(porProvincia).sort(([a], [b]) => a.localeCompare(b)).map(([provincia, ciudades]) => (
        <div key={provincia} className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide px-1">{provincia}</p>
          {ciudades.map(zona => (
            <div key={zona.id}>
              {editandoId === zona.id ? (
                <FormZona
                  inicial={zona}
                  onGuardar={(data) => editarZona(zona.id, data)}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border bg-card transition-all',
                  zona.esta_activa ? 'border-card-border' : 'border-border opacity-60'
                )}>
                  {/* Icono */}
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    zona.esta_activa ? 'bg-primary/10 text-primary' : 'bg-background-subtle text-foreground-muted'
                  )}>
                    <Truck className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{zona.ciudad}</p>
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        zona.esta_activa ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted'
                      )}>
                        {zona.esta_activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-sm font-bold text-primary">{formatearPrecio(zona.precio)}</p>
                      {zona.tiempo_entrega && (
                        <p className="text-xs text-foreground-muted">{zona.tiempo_entrega}</p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActiva(zona.id, zona.esta_activa)}
                      title={zona.esta_activa ? 'Desactivar' : 'Activar'}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        zona.esta_activa ? 'text-success hover:bg-success/10' : 'text-foreground-muted hover:bg-background-subtle'
                      )}
                    >
                      {zona.esta_activa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditandoId(zona.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminar(zona.id, zona.ciudad)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {filtradas.length > 0 && (
        <p className="text-xs text-foreground-muted text-center">
          {filtradas.length} zona{filtradas.length !== 1 ? 's' : ''} · {Object.keys(porProvincia).length} provincia{Object.keys(porProvincia).length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
