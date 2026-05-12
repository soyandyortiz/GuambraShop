export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { 
  Calculator, History, AlertCircle, CheckCircle2, 
  DollarSign, CreditCard, RefreshCw, ArrowRightLeft,
  Calendar, Clock, Info
} from 'lucide-react'
import { PanelCierreCaja } from '@/components/admin/cierres/panel-cierre-caja'
import { ListaCierres } from '@/components/admin/cierres/lista-cierres'
import { cn } from '@/lib/utils'

export default async function PaginaCierresCaja() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  // Obtener fecha local (Ecuador UTC-5, sin DST)
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })

  // Calcular límites UTC del día Ecuador: medianoche EC = 05:00Z, fin de día EC = +1día 04:59:59Z
  const [y, mo, d] = hoy.split('-').map(Number)
  const inicioUtc = new Date(Date.UTC(y, mo - 1, d, 5, 0, 0)).toISOString()
  const finUtc    = new Date(Date.UTC(y, mo - 1, d + 1, 4, 59, 59)).toISOString()

  // 1. Verificar si ya existe un cierre para hoy
  const { data: cierreHoy } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('fecha', hoy)
    .maybeSingle()

  // 2. Obtener los últimos cierres para el historial
  const { data: historial } = await supabase
    .from('cierres_caja')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(10)

  // 3. Obtener pedidos del día actual y egresos para el cálculo en tiempo real
  const [
    { data: pedidosHoy },
    { data: dataEgresos }
  ] = await Promise.all([
    supabase
      .from('pedidos')
      .select('total, forma_pago, creado_en')
      .gte('creado_en', inicioUtc)
      .lte('creado_en', finUtc)
      .in('estado', ['procesando', 'completado']),
    supabase
      .from('egresos')
      .select('monto')
      .eq('fecha', hoy)
      .eq('metodo_pago', 'efectivo')
  ])

  const totalEgresosHoy = (dataEgresos as { monto: number }[] | null)?.reduce((s, e) => s + Number(e.monto), 0) ?? 0

  // Calcular totales por forma de pago (ingresos brutos, sin descontar egresos)
  const ingEfectivo      = pedidosHoy?.filter(p => p.forma_pago === 'efectivo').reduce((s, p) => s + Number(p.total), 0) ?? 0
  const ingTransferencia = pedidosHoy?.filter(p => p.forma_pago === 'transferencia').reduce((s, p) => s + Number(p.total), 0) ?? 0
  const ingTarjeta       = pedidosHoy?.filter(p => p.forma_pago === 'tarjeta').reduce((s, p) => s + Number(p.total), 0) ?? 0
  const ingPaypal        = pedidosHoy?.filter(p => p.forma_pago === 'paypal').reduce((s, p) => s + Number(p.total), 0) ?? 0
  const ingOtros         = pedidosHoy?.filter(p => !['efectivo', 'transferencia', 'tarjeta', 'paypal'].includes(p.forma_pago || '')).reduce((s, p) => s + Number(p.total), 0) ?? 0
  const ingTotal         = ingEfectivo + ingTransferencia + ingTarjeta + ingPaypal + ingOtros

  const totales = {
    ingresos: {
      efectivo:      ingEfectivo,
      transferencia: ingTransferencia,
      tarjeta:       ingTarjeta,
      paypal:        ingPaypal,
      otros:         ingOtros,
      total:         ingTotal,
    },
    egresos:        totalEgresosHoy,
    efectivo_neto:  ingEfectivo - totalEgresosHoy,
    total:          ingTotal - totalEgresosHoy,
    // campos para guardar en DB (compatibles con schema actual)
    efectivo:       ingEfectivo - totalEgresosHoy
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      
      {/* ══ CABECERA ══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Calculator className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Cierre de Caja</h1>
            <p className="text-sm text-foreground-muted font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Gestión contable diaria · {hoy}
            </p>
          </div>
        </div>
        
        {cierreHoy ? (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" /> Caja Cerrada
          </div>
        ) : (
          <div className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-2 text-sm font-bold animate-pulse">
            <Clock className="w-4 h-4" /> Caja Abierta
          </div>
        )}
      </div>

      {/* ══ GRID PRINCIPAL ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Panel de Cierre (Izquierda) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <PanelCierreCaja 
            totalesSistema={totales} 
            fecha={hoy} 
            yaCerrado={!!cierreHoy} 
            cierreExistente={cierreHoy}
          />
        </div>

        {/* Historial y Alertas (Derecha) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Tarjeta de Información */}
          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
            <h3 className="text-xs font-black opacity-70 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" /> Importante
            </h3>
            <p className="text-sm leading-relaxed font-medium">
              El cierre de caja suma automáticamente todos los pedidos marcados como <b>"Procesando"</b> o <b>"Completado"</b> del día de hoy. 
              Asegúrate de ingresar el efectivo físico real para detectar descuadres.
            </p>
          </div>

          {/* Lista de Cierres Recientes */}
          <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-foreground-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <History className="w-4 h-4" /> Historial de Cierres
            </h3>
            <ListaCierres cierres={historial || []} />
          </div>

        </div>

      </div>

    </div>
  )
}
