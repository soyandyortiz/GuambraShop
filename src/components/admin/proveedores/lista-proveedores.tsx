'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, Truck, Pencil, Trash2, 
  DollarSign, ArrowUpCircle, ArrowDownCircle, 
  X, Save, Loader2, Phone, Mail, Building2,
  AlertTriangle, CheckCircle2, History
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import type { Proveedor } from '@/types'

interface Props {
  proveedores: Proveedor[]
}

type ModalTipo = 'nuevo' | 'editar' | 'abono' | 'deuda' | null

export function ListaProveedores({ proveedores: init }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [proveedores, setProveedores] = useState<Proveedor[]>(init)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<ModalTipo>(null)
  const [seleccionado, setSeleccionado] = useState<Proveedor | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Estados de formulario
  const [formProv, setFormProv] = useState<Omit<Proveedor, 'id' | 'creado_en' | 'actualizado_en' | 'saldo_pendiente'>>({
    nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: ''
  })
  const [montoAccion, setMontoAccion] = useState<string>('')
  const [notasAccion, setNotasAccion] = useState('')

  const filtrados = useMemo(() => {
    return proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  }, [proveedores, busqueda])

  const resetForm = () => {
    setFormProv({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' })
    setMontoAccion('')
    setNotasAccion('')
    setSeleccionado(null)
    setModal(null)
  }

  async function guardarProveedor() {
    if (!formProv.nombre) return toast.error('El nombre es obligatorio')
    setGuardando(true)
    const supabase = crearClienteSupabase()
    
    if (modal === 'nuevo') {
      const { data, error } = await supabase.from('proveedores').insert([formProv]).select().single()
      if (error) { toast.error('Error al crear'); setGuardando(false); return }
      setProveedores([data, ...proveedores])
      toast.success('Proveedor creado')
    } else if (modal === 'editar' && seleccionado) {
      const { error } = await supabase.from('proveedores').update(formProv).eq('id', seleccionado.id)
      if (error) { toast.error('Error al actualizar'); setGuardando(false); return }
      setProveedores(proveedores.map(p => p.id === seleccionado.id ? { ...p, ...formProv } : p))
      toast.success('Proveedor actualizado')
    }
    
    resetForm()
    startTransition(() => router.refresh())
    setGuardando(false)
  }

  async function registrarAccionFinanciera() {
    const montoNum = parseFloat(montoAccion)
    if (!montoNum || montoNum <= 0) return toast.error('Ingresa un monto válido')
    if (!seleccionado) return
    
    setGuardando(true)
    const supabase = crearClienteSupabase()

    if (modal === 'deuda') {
      // Incrementar deuda
      const { error } = await supabase.rpc('incrementar_saldo_proveedor', { 
        id_prov: seleccionado.id, 
        monto: montoNum 
      })
      // Si no tienes el RPC, lo hacemos por update simple por ahora para no bloquear
      if (error) {
        await supabase.from('proveedores').update({ saldo_pendiente: seleccionado.saldo_pendiente + montoNum }).eq('id', seleccionado.id)
      }
      toast.success('Deuda registrada')
    } 
    else if (modal === 'abono') {
      // 1. Registrar el pago en pagos_proveedores (el trigger restará el saldo)
      const { data: pago, error: errPago } = await supabase.from('pagos_proveedores').insert([{
        proveedor_id: seleccionado.id,
        monto: montoNum,
        metodo_pago: 'efectivo',
        notas: notasAccion
      }]).select().single()

      if (errPago) { toast.error('Error al registrar pago'); setGuardando(false); return }

      // 2. CREAR AUTOMÁTICAMENTE UN EGRESO
      const { error: errEgreso } = await supabase.from('egresos').insert([{
        descripcion: `ABONO A PROVEEDOR: ${seleccionado.nombre} (${notasAccion || 'Sin notas'})`,
        monto: montoNum,
        categoria: 'proveedores',
        metodo_pago: 'efectivo',
        fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
      }])

      if (errEgreso) toast.warning('Pago registrado, pero no se pudo crear el egreso automático')
      
      // Actualizar estado local
      setProveedores(proveedores.map(p => p.id === seleccionado.id ? { ...p, saldo_pendiente: p.saldo_pendiente - montoNum } : p))
      toast.success('Abono registrado y Egreso generado')
    }

    resetForm()
    startTransition(() => router.refresh())
    setGuardando(false)
  }

  async function eliminarProveedor(id: string, nombre: string) {
    if (!confirm(`¿Eliminar al proveedor "${nombre}"? Se perderá el historial de deudas.`)) return
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('proveedores').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    setProveedores(proveedores.filter(p => p.id !== id))
    toast.success('Proveedor eliminado')
  }

  return (
    <div className="flex flex-col gap-4">
      
      {/* ══ BARRA DE HERRAMIENTAS ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-3xl shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input 
            type="text"
            placeholder="Buscar proveedor..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button 
          onClick={() => setModal('nuevo')}
          className="h-10 px-6 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      {/* ══ GRID DE PROVEEDORES ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtrados.map(p => (
          <div key={p.id} className="bg-card border border-card-border rounded-3xl p-6 shadow-sm group hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100">
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-black text-foreground">{p.nombre}</h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.telefono && <span className="text-[10px] text-foreground-muted flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {p.telefono}</span>}
                    {p.contacto && <span className="text-[10px] text-foreground-muted flex items-center gap-1 font-bold uppercase"><Building2 className="w-2.5 h-2.5" /> {p.contacto}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSeleccionado(p); setFormProv(p); setModal('editar'); }} className="p-2 hover:bg-background rounded-lg text-foreground-muted hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => eliminarProveedor(p.id, p.nombre)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Saldo y Acciones */}
            <div className="flex items-end justify-between pt-4 border-t border-border">
              <div>
                <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Saldo Pendiente</p>
                <p className={cn("text-2xl font-black", p.saldo_pendiente > 0 ? "text-red-600" : "text-emerald-600")}>
                  {formatearPrecio(p.saldo_pendiente)}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSeleccionado(p); setModal('deuda'); }}
                  className="h-10 px-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-tighter hover:bg-amber-100 transition-all flex items-center gap-2"
                >
                  <ArrowUpCircle className="w-4 h-4" /> Deuda
                </button>
                <button 
                  onClick={() => { setSeleccionado(p); setModal('abono'); }}
                  disabled={p.saldo_pendiente <= 0}
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-tighter shadow-md shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" /> Abonar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ MODALES ══ */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-card-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-background-subtle/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{modal === 'nuevo' ? 'Nuevo Proveedor' : 'Editar Proveedor'}</h3>
              <button onClick={resetForm} className="p-2 hover:bg-background rounded-xl transition-colors"><X className="w-6 h-6 text-foreground-muted" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Nombre de la Empresa</label>
                <input type="text" value={formProv.nombre} onChange={e => setFormProv({...formProv, nombre: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Contacto</label>
                  <input type="text" value={formProv.contacto || ''} onChange={e => setFormProv({...formProv, contacto: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Teléfono</label>
                  <input type="text" value={formProv.telefono || ''} onChange={e => setFormProv({...formProv, telefono: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Email</label>
                <input type="email" value={formProv.email || ''} onChange={e => setFormProv({...formProv, email: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-input-border bg-background-subtle text-sm focus:outline-none" />
              </div>
              <button onClick={guardarProveedor} disabled={guardando} className="w-full h-12 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {modal === 'nuevo' ? 'CREAR PROVEEDOR' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'abono' || modal === 'deuda') && seleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-card-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={cn("px-6 py-5 border-b border-border flex items-center justify-between", modal === 'abono' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
              <div>
                <h3 className="text-lg font-bold">{modal === 'abono' ? 'Registrar Abono' : 'Registrar Deuda'}</h3>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{seleccionado.nombre}</p>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1.5 text-center">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Saldo Actual</label>
                <p className="text-2xl font-black">{formatearPrecio(seleccionado.saldo_pendiente)}</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Monto a {modal === 'abono' ? 'Pagar' : 'Debat'}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-primary">$</span>
                  <input type="number" step="0.01" value={montoAccion} onChange={e => setMontoAccion(e.target.value)} autoFocus className="w-full h-14 pl-10 pr-4 rounded-xl border border-input-border bg-background-subtle text-2xl font-black focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-center" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">Observación</label>
                <input type="text" placeholder="Ej: Pago factura #123, Compra mercadería..." value={notasAccion} onChange={e => setNotasAccion(e.target.value)} className="w-full h-10 px-4 rounded-xl border border-input-border bg-background-subtle text-xs focus:outline-none" />
              </div>

              <button 
                onClick={registrarAccionFinanciera} 
                disabled={guardando} 
                className={cn(
                  "w-full h-14 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]",
                  modal === 'abono' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-amber-600 hover:bg-amber-700 shadow-amber-100"
                )}
              >
                {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {modal === 'abono' ? 'CONFIRMAR PAGO' : 'REGISTRAR DEUDA'}
              </button>
              
              {modal === 'abono' && (
                <div className="p-3 rounded-xl bg-background-subtle border border-border flex items-center gap-2 text-[10px] text-foreground-muted font-bold">
                  <InfoIcon className="w-3.5 h-3.5" /> ESTA ACCIÓN GENERARÁ UN EGRESO AUTOMÁTICO
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  )
}
