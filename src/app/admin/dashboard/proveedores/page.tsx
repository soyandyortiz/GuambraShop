export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { 
  Truck, Plus, Search, Filter, 
  DollarSign, Clock, AlertCircle, TrendingUp,
  ChevronRight, Building2, Phone, Mail
} from 'lucide-react'
import { ListaProveedores } from '@/components/admin/proveedores/lista-proveedores'
import { formatearPrecio } from '@/lib/utils'

export default async function PaginaProveedores() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  // 1. Obtener todos los proveedores
  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre', { ascending: true })

  // 2. Obtener pagos recientes
  const { data: pagosRecientes } = await supabase
    .from('pagos_proveedores')
    .select('*, proveedores(nombre)')
    .order('creado_en', { ascending: false })
    .limit(5)

  // 3. Métricas
  const deudaTotal = proveedores?.reduce((s, p) => s + Number(p.saldo_pendiente), 0) ?? 0
  const proveedoresConDeuda = proveedores?.filter(p => p.saldo_pendiente > 0).length ?? 0

  return (
    <div className="flex flex-col gap-8 pb-20">
      
      {/* ══ CABECERA ══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Gestión de Proveedores</h1>
            <p className="text-sm text-foreground-muted font-medium">Control de deudas, abonos y relaciones comerciales</p>
          </div>
        </div>
      </div>

      {/* ══ MÉTRICAS DE DEUDA ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-card-border p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <DollarSign className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Deuda Total a Pagar</p>
          <p className="text-3xl font-black text-red-600">{formatearPrecio(deudaTotal)}</p>
          <p className="text-[10px] text-foreground-muted font-bold mt-2 uppercase">Pendiente con {proveedoresConDeuda} proveedores</p>
        </div>

        <div className="bg-card border border-card-border p-6 rounded-3xl shadow-sm">
          <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Total Proveedores</p>
          <p className="text-3xl font-black text-foreground">{proveedores?.length || 0}</p>
          <p className="text-[10px] text-foreground-muted font-bold mt-2 uppercase">Registrados en el sistema</p>
        </div>

        <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 text-white flex flex-col justify-center">
          <h3 className="text-xs font-black opacity-70 uppercase tracking-widest mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Pagos del Mes
          </h3>
          <p className="text-2xl font-black">Historial Activo</p>
          <p className="text-[10px] opacity-70 font-bold mt-1 uppercase">Sincronizado con Egresos diarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lista Principal (8 columnas) */}
        <div className="lg:col-span-8">
          <ListaProveedores proveedores={proveedores || []} />
        </div>

        {/* Lateral: Pagos Recientes (4 columnas) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-foreground-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Abonos Recientes
            </h3>
            <div className="flex flex-col gap-4">
              {pagosRecientes?.length === 0 ? (
                <p className="text-xs text-foreground-muted text-center py-4 italic">No hay abonos registrados</p>
              ) : (
                pagosRecientes?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-background-subtle border border-border">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground truncate">{p.proveedores?.nombre}</p>
                      <p className="text-[9px] text-foreground-muted font-bold uppercase">{new Date(p.fecha + 'T12:00:00').toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600">{formatearPrecio(p.monto)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 text-amber-900">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-widest">Recordatorio</h3>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              Al registrar un abono a un proveedor, el sistema creará automáticamente un **Egreso en Efectivo** para que tu cierre de caja de hoy sea exacto.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
