'use client'

import { useState, useMemo, useTransition } from 'react'
import { 
  Truck, Plus, Pencil, Trash2, Eye, EyeOff, 
  Check, X, ChevronDown, Search, Filter, 
  MapPin, DollarSign, Clock, MoreHorizontal,
  ArrowUpDown, Loader2
} from 'lucide-react'
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

const INPUT = 'w-full h-10 px-3 rounded-xl border border-input-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm'
const SELECT = 'w-full h-10 px-3 rounded-xl border border-input-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer transition-all shadow-sm'

// ─── Componente de Formulario (Modal) ──────────────────────────────────────────

function ModalFormZona({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: ZonaEnvio
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-background-subtle/50">
          <h3 className="text-lg font-bold text-foreground">{inicial ? 'Editar Zona' : 'Nueva Zona de Envío'}</h3>
          <p className="text-xs text-foreground-muted mt-0.5">Define la tarifa para una ciudad específica</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1.5">Provincia</label>
              <div className="relative">
                <select
                  value={provincia}
                  onChange={e => { setProvincia(e.target.value); setCiudad('') }}
                  className={SELECT}
                  disabled={!!inicial}
                >
                  <option value="">Selecciona una provincia...</option>
                  {PROVINCIAS_ECUADOR.map(p => (
                    <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1.5">Ciudad</label>
              <div className="relative">
                <select
                  value={ciudad}
                  onChange={e => setCiudad(e.target.value)}
                  disabled={!provincia || !!inicial}
                  className={cn(SELECT, (!provincia || !!inicial) && 'opacity-50 cursor-not-allowed bg-background-subtle')}
                >
                  <option value="">Selecciona una ciudad...</option>
                  {ciudades.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1.5">Precio de envío</label>
              <div className="relative shadow-sm rounded-xl overflow-hidden">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  placeholder="0.00"
                  className={cn(INPUT, 'pl-7 font-bold')}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1.5">Tiempo estimado</label>
              <input
                type="text"
                value={tiempo}
                onChange={e => setTiempo(e.target.value)}
                placeholder="Ej: 24-48 horas"
                className={INPUT}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-background-subtle/50 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 h-10 rounded-xl border border-border text-sm font-semibold text-foreground-muted hover:bg-card transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-6 h-10 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {inicial ? 'Actualizar tarifa' : 'Crear zona'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function ListaZonasEnvio({ zonas: zonasServidor }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [zonas, setZonas] = useState<ZonaEnvio[]>(zonasServidor)
  const [busqueda, setBusqueda] = useState('')
  const [filtroProvincia, setFiltroProvincia] = useState<string | 'todas'>('todas')
  const [modalAbierto, setModalAbierto] = useState<boolean>(false)
  const [editando, setEditando] = useState<ZonaEnvio | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)

  // Filtrado
  const filtradas = useMemo(() => {
    let result = zonas
    if (filtroProvincia !== 'todas') {
      result = result.filter(z => z.provincia === filtroProvincia)
    }
    const texto = busqueda.toLowerCase().trim()
    if (texto) {
      result = result.filter(z => 
        z.ciudad.toLowerCase().includes(texto) ||
        z.provincia.toLowerCase().includes(texto)
      )
    }
    return result
  }, [zonas, filtroProvincia, busqueda])

  // Provincias con zonas para el filtro
  const provinciasConZonas = useMemo(() => {
    const set = new Set(zonas.map(z => z.provincia))
    return Array.from(set).sort()
  }, [zonas])

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
    setZonas(prev => [...prev, nueva].sort((a, b) => a.provincia.localeCompare(b.provincia) || a.ciudad.localeCompare(b.ciudad)))
    setModalAbierto(false)
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
    setEditando(null)
    toast.success('Zona actualizada')
    startTransition(() => router.refresh())
  }

  async function toggleActiva(id: string, activa: boolean) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    await supabase.from('zonas_envio').update({ esta_activa: !activa }).eq('id', id)
    setZonas(prev => prev.map(z => z.id === id ? { ...z, esta_activa: !activa } : z))
    setActualizando(null)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, ciudad: string) {
    if (!confirm(`¿Eliminar definitivamente la zona de envío para "${ciudad}"?`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('zonas_envio').delete().eq('id', id)
    setZonas(prev => prev.filter(z => z.id !== id))
    toast.success(`Zona ${ciudad} eliminada`)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      
      {/* ══ BARRA DE FILTROS ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar ciudad o provincia..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative w-48 hidden sm:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
            <select
              value={filtroProvincia}
              onChange={e => setFiltroProvincia(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-input-border bg-background-subtle text-xs font-medium focus:outline-none appearance-none cursor-pointer"
            >
              <option value="todas">Todas las provincias</option>
              {provinciasConZonas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
          </div>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="h-10 px-6 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Zona
        </button>
      </div>

      {/* ══ TABLA DE ZONAS ══ */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Provincia / Ciudad</th>
                <th className="px-6 py-4">Precio Envío</th>
                <th className="px-6 py-4">Tiempo Estimado</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Truck className="w-12 h-12" />
                      <p className="text-sm font-bold">No se encontraron zonas de envío</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map(zona => (
                  <tr key={zona.id} className={cn(
                    'group transition-colors hover:bg-background-subtle/30',
                    !zona.esta_activa && 'opacity-60'
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                          zona.esta_activa ? 'bg-primary/10 text-primary' : 'bg-background-subtle text-foreground-muted'
                        )}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{zona.ciudad}</span>
                          <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{zona.provincia}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-primary">
                      {formatearPrecio(zona.precio)}
                    </td>
                    <td className="px-6 py-4">
                      {zona.tiempo_entrega ? (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Clock className="w-3.5 h-3.5 text-foreground-muted" />
                          {zona.tiempo_entrega}
                        </div>
                      ) : (
                        <span className="text-xs text-foreground-muted italic">No definido</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActiva(zona.id, zona.esta_activa)}
                        disabled={actualizando === zona.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all',
                          zona.esta_activa 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                        )}
                      >
                        {actualizando === zona.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : zona.esta_activa ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                        {zona.esta_activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditando(zona)}
                          className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => eliminar(zona.id, zona.ciudad)}
                          className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ MODALES ══ */}
      {modalAbierto && (
        <ModalFormZona
          onGuardar={crearZona}
          onCancelar={() => setModalAbierto(false)}
        />
      )}
      {editando && (
        <ModalFormZona
          inicial={editando}
          onGuardar={(data) => editarZona(editando.id, data)}
          onCancelar={() => setEditando(null)}
        />
      )}

      {/* ══ FOOTER INFO ══ */}
      {filtradas.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-xs text-foreground-muted mt-2">
          <p>{filtradas.length} zonas configuradas</p>
          <span>•</span>
          <p>{provinciasConZonas.length} provincias cubiertas</p>
        </div>
      )}
    </div>
  )
}
