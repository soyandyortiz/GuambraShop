export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { 
  TrendingDown, Plus, Filter, Search, 
  DollarSign, ShoppingCart, Users, Home, MoreHorizontal
} from 'lucide-react'
import { TablaEgresos } from '@/components/admin/egresos/tabla-egresos'
import { formatearPrecio } from '@/lib/utils'

export default async function PaginaEgresos() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  // Obtener fecha actual para métricas rápidas
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // 1. Obtener todos los egresos
  const { data: egresos } = await supabase
    .from('egresos')
    .select('*')
    .order('creado_en', { ascending: false })

  // 2. Métricas
  const totalHoy = egresos?.filter(e => e.fecha === hoy).reduce((s, e) => s + Number(e.monto), 0) ?? 0
  const totalMes = egresos?.filter(e => new Date(e.creado_en) >= new Date(inicioMes)).reduce((s, e) => s + Number(e.monto), 0) ?? 0

  return (
    <div className="flex flex-col gap-8 pb-20">
      
      {/* ══ CABECERA ══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Gestión de Egresos</h1>
            <p className="text-sm text-foreground-muted font-medium">Control de gastos y pagos a proveedores</p>
          </div>
        </div>
      </div>

      {/* ══ MÉTRICAS RÁPIDAS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Gastos de Hoy</p>
          <p className="text-2xl font-black text-red-600">{formatearPrecio(totalHoy)}</p>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Total del Mes</p>
          <p className="text-2xl font-black text-foreground">{formatearPrecio(totalMes)}</p>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Nº Registros</p>
          <p className="text-2xl font-black text-foreground">{egresos?.length || 0}</p>
        </div>
        <div className="bg-indigo-600 p-5 rounded-3xl shadow-lg shadow-indigo-100 text-white flex flex-col justify-center">
          <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Balance Sugerido</p>
          <p className="text-sm font-bold">Flujo de caja saludable</p>
        </div>
      </div>

      {/* ══ TABLA Y ACCIONES ══ */}
      <TablaEgresos egresos={egresos || []} />

    </div>
  )
}
