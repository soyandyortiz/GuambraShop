'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, Filter, ArrowUpDown, 
  Trash2, Pencil, ShoppingCart, Users, 
  Home, MoreHorizontal, DollarSign, X,
  Save, Loader2, Briefcase, Zap
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import type { Egreso, CategoriaEgreso } from '@/types'

interface Props {
  egresos: Egreso[]
}

const CATEGORIAS: Record<CategoriaEgreso, { label: string; icono: React.ReactNode; color: string }> = {
  proveedores: { label: 'Proveedores', icono: <ShoppingCart className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  servicios:    { label: 'Servicios',    icono: <Zap className="w-3.5 h-3.5" />,          color: 'bg-amber-50 text-amber-700 border-amber-100' },
  nomina:       { label: 'Nómina',       icono: <Users className="w-3.5 h-3.5" />,        color: 'bg-purple-50 text-purple-700 border-purple-100' },
  alquiler:     { label: 'Alquiler',     icono: <Home className="w-3.5 h-3.5" />,         color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  otros:        { label: 'Otros',        icono: <MoreHorizontal className="w-3.5 h-3.5" />, color: 'bg-gray-50 text-gray-700 border-gray-100' },
}

export function TablaEgresos({ egresos: egresosInit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [egresos, setEgresos] = useState<Egreso[]>(egresosInit)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Estado para el formulario
  const [form, setForm] = useState<Omit<Egreso, 'id' | 'creado_por' | 'creado_en'>>({
    descripcion: '',
    monto: 0,
    categoria: 'otros',
    metodo_pago: 'efectivo',
    fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  })

  const filtrados = useMemo(() => {
    return egresos.filter(e => 
      e.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.categoria.toLowerCase().includes(busqueda.toLowerCase())
    )
  }, [egresos, busqueda])

  async function guardarEgreso() {
    if (!form.descripcion || form.monto <= 0) {
      toast.error('Completa la descripción y un monto válido')
      return
    }

    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { data, error } = await supabase
      .from('egresos')
      .insert([form])
      .select()
      .single()

    if (error) {
      toast.error('Error al guardar: ' + error.message)
      setGuardando(false)
      return
    }

    setEgresos([data, ...egresos])
    setModalAbierto(false)
    setForm({
      descripcion: '',
      monto: 0,
      categoria: 'otros',
      metodo_pago: 'efectivo',
      fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
    })
    toast.success('Egreso registrado correctamente')
    startTransition(() => router.refresh())
    setGuardando(false)
  }

  async function eliminarEgreso(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return
    
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('egresos').delete().eq('id', id)
    
    if (error) {
      toast.error('Error al eliminar')
      return
    }

    setEgresos(egresos.filter(e => e.id !== id))
    toast.success('Registro eliminado')
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      
      {/* ══ BARRA DE HERRAMIENTAS ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input 
            type="text"
            placeholder="Buscar egreso por descripción o categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button 
          onClick={() => setModalAbierto(true)}
          className="h-10 px-6 rounded-xl bg-red-600 text-white text-sm font-bold shadow-md shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Egreso
        </button>
      </div>

      {/* ══ TABLA DE EGRESOS ══ */}
      <div className="bg-card rounded-3xl border border-card-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-background-subtle/50 text-[11px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-center">Categoría</th>
                <th className="px-6 py-4 text-center">Método</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center opacity-20">
                    <Briefcase className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm font-bold uppercase tracking-widest">No se encontraron registros</p>
                  </td>
                </tr>
              ) : (
                filtrados.map((egreso) => {
                  const cat = CATEGORIAS[egreso.categoria]
                  return (
                    <tr key={egreso.id} className="group hover:bg-background-subtle/30 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-foreground-muted">
                        {new Date(egreso.fecha + 'T12:00:00').toLocaleDateString('es-EC')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-foreground">{egreso.descripcion}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase", cat.color)}>
                          {cat.icono} {cat.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black text-foreground-muted uppercase tracking-tighter">
                          {egreso.metodo_pago}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-red-600">{formatearPrecio(egreso.monto)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => eliminarEgreso(egreso.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ MODAL DE REGISTRO ══ */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-card-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-border bg-background-subtle/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Nuevo Egreso</h3>
                  <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest">Salida de Dinero</p>
                </div>
              </div>
              <button onClick={() => setModalAbierto(false)} className="p-2 hover:bg-background rounded-xl transition-colors">
                <X className="w-6 h-6 text-foreground-muted" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Descripción / Concepto</label>
                <input 
                  type="text"
                  placeholder="Ej: Pago de luz local, Compra de materia prima..."
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-primary">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={form.monto || ''}
                      onChange={e => setForm({...form, monto: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full h-12 pl-8 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Fecha</label>
                  <input 
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Categoría</label>
                <select 
                  value={form.categoria}
                  onChange={e => setForm({...form, categoria: e.target.value as CategoriaEgreso})}
                  className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none"
                >
                  {Object.entries(CATEGORIAS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {['efectivo', 'transferencia', 'tarjeta'].map((met) => (
                    <button
                      key={met}
                      onClick={() => setForm({...form, metodo_pago: met as any})}
                      className={cn(
                        "h-10 rounded-xl border text-[10px] font-black uppercase transition-all",
                        form.metodo_pago === met ? "bg-primary text-white border-primary shadow-md shadow-primary/20" : "bg-card text-foreground-muted border-border hover:bg-background-subtle"
                      )}
                    >
                      {met}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 bg-background-subtle/50 border-t border-border flex gap-3">
              <button
                onClick={guardarEgreso}
                disabled={guardando}
                className="flex-1 h-12 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                REGISTRAR EGRESO
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
