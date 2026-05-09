export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import {
  Package, Tag, Ticket, MessageSquare,
  ShoppingBag, TrendingUp, AlertTriangle, CheckCircle2, Power, ExternalLink, ClipboardList,
  DollarSign, Clock, BarChart2, Star, ArrowRight, Users, Bell, Zap, LayoutDashboard,
  ShieldCheck, Send
} from 'lucide-react'
import Link from 'next/link'
import type { MensajeAdmin, ItemPedido } from '@/types'
import { PanelSuperadmin } from '@/components/admin/superadmin/panel-superadmin'
import { ContadorPago } from '@/components/admin/superadmin/contador-pago'
import { ContadorEmails } from '@/components/admin/email/contador-emails'
import { GraficoVentasPremium } from '@/components/admin/dashboard/grafico-ventas'
import { formatearPrecio, cn } from '@/lib/utils'
import type { ProveedorEmail } from '@/types'

const COLORES_ESTADO: Record<string, string> = {
  pendiente_pago: 'bg-gray-100 text-gray-600 border-gray-200',
  procesando:     'bg-emerald-50 text-emerald-600 border-emerald-100',
  en_espera:      'bg-amber-50 text-amber-600 border-amber-100',
  completado:     'bg-blue-50 text-blue-600 border-blue-100',
  cancelado:      'bg-red-50 text-red-600 border-red-100',
}

export default async function PáginaDashboard() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { data: perfil } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single()
  const esSuperadmin = perfil?.rol === 'superadmin'

  const ahora      = new Date()
  const inicioMes  = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const hace28Dias = new Date(ahora.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString()
  const hoy        = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()

  const [
    { count: totalProductos },
    { count: productosActivos },
    { count: totalCategorias },
    { count: totalClientes },
    { count: totalPedidos },
    { data: mensajes },
    { data: config },
    { data: pedidosMes },
    { data: pedidosPendientes },
    { data: pedidosRecientes },
    { data: pedidosDiarios },
    { data: pedidosItems },
    { data: productosStockBajo },
    { data: cfgEmail },
    { count: countEmailHoy },
    { count: countEmailMes },
  ] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }),
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('esta_activa', true),
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }),
    supabase.from('mensajes_admin').select('*').order('creado_en', { ascending: false }).limit(3),
    supabase.from('configuracion_tienda').select('*').single(),
    supabase.from('pedidos').select('total, estado, creado_en').gte('creado_en', inicioMes).in('estado', ['procesando', 'completado']),
    supabase.from('pedidos').select('id').eq('estado', 'pendiente_pago'),
    supabase.from('pedidos').select('id, numero_orden, nombres, total, estado, creado_en, tipo').order('creado_en', { ascending: false }).limit(6),
    supabase.from('pedidos').select('creado_en, total').gte('creado_en', hace28Dias).in('estado', ['procesando', 'completado']),
    supabase.from('pedidos').select('items').gte('creado_en', hace28Dias).in('estado', ['procesando', 'completado']),
    supabase.from('productos').select('id, nombre, stock').eq('esta_activo', true).not('stock', 'is', null).lte('stock', 5).order('stock', { ascending: true }).limit(5),
    supabase.from('configuracion_email').select('proveedor, activo').maybeSingle(),
    supabase.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy),
    supabase.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', inicioMes),
  ])

  const ingresosMes = pedidosMes?.reduce((s, p) => s + Number(p.total ?? 0), 0) ?? 0
  const tiendaActiva = config?.esta_activa ?? true

  // Procesar datos para el gráfico (Lógica directa de servidor, sin useMemo)
  const diasMap: Record<string, number> = {}
  for (let i = 27; i >= 0; i--) {
    const d = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000)
    diasMap[d.toISOString().split('T')[0]] = 0
  }
  pedidosDiarios?.forEach(p => {
    const fecha = p.creado_en.split('T')[0]
    if (diasMap[fecha] !== undefined) diasMap[fecha] += Number(p.total || 0)
  })
  
  const datosGrafico = Object.entries(diasMap).map(([fecha, valor]) => {
    const d = new Date(fecha)
    return {
      etiqueta: d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }),
      valor
    }
  })

  // Top productos
  const conteoProductos: Record<string, { nombre: string; cantidad: number }> = {}
  pedidosItems?.forEach(p => {
    if (!Array.isArray(p.items)) return
    ;(p.items as ItemPedido[]).forEach(item => {
      if (!conteoProductos[item.producto_id]) conteoProductos[item.producto_id] = { nombre: item.nombre, cantidad: 0 }
      conteoProductos[item.producto_id].cantidad += item.cantidad
    })
  })
  const topProductos = Object.values(conteoProductos).sort((a, b) => b.cantidad - a.cantidad).slice(0, 4)

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* ══ CABECERA DE BIENVENIDA ══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 shadow-inner">
            <LayoutDashboard className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Panel de Control</h1>
            <p className="text-sm text-foreground-muted font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {config?.nombre_tienda || 'Administración'} · {perfil?.nombre || 'Admin'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" target="_blank" className="flex items-center gap-2 h-10 px-5 rounded-xl border border-border bg-card text-xs font-bold hover:bg-background-subtle transition-all">
            <ExternalLink className="w-4 h-4" /> Ver Tienda
          </Link>
          <button className="relative w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-background-subtle transition-all">
            <Bell className="w-5 h-5 text-foreground-muted" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
          </button>
        </div>
      </div>

      {/* ══ GRID DE MÉTRICAS PRINCIPALES (BENTO) ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Gráfico Principal (8 columnas) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <GraficoVentasPremium 
            datos={datosGrafico} 
            titulo="Ingresos Diarios" 
            subtitulo="Rendimiento de los últimos 28 días"
          />
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Ventas Mes</p>
              <p className="text-xl font-black text-foreground">{pedidosMes?.length || 0}</p>
            </div>
            <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Ingresos</p>
              <p className="text-xl font-black text-primary">{formatearPrecio(ingresosMes)}</p>
            </div>
            <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Pendientes</p>
              <p className="text-xl font-black text-amber-600">{pedidosPendientes?.length || 0}</p>
            </div>
            <div className="bg-card border border-card-border p-5 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-1">Clientes</p>
              <p className="text-xl font-black text-indigo-600">{totalClientes || 0}</p>
            </div>
          </div>
        </div>

        {/* Panel Lateral (4 columnas) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Top Productos */}
          <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-foreground-muted uppercase tracking-widest mb-5 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Top Productos
            </h3>
            <div className="flex flex-col gap-4">
              {topProductos.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background-subtle flex items-center justify-center text-xs font-black text-foreground-muted">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{p.nombre}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-background-subtle overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(p.cantidad / (topProductos[0]?.cantidad || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-black text-primary">{p.cantidad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Accesos Rápidos */}
          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
            <h3 className="text-xs font-black opacity-60 uppercase tracking-widest mb-4">Gestión Rápida</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/dashboard/productos/nuevo" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all">
                <Package className="w-5 h-5" />
                <span className="text-[10px] font-bold">Nuevo Item</span>
              </Link>
              <Link href="/admin/dashboard/pedidos" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-[10px] font-bold">Pedidos</span>
              </Link>
              <Link href="/admin/dashboard/clientes" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all">
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-bold">Clientes</span>
              </Link>
              <Link href="/admin/dashboard/promociones" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all">
                <Zap className="w-5 h-5" />
                <span className="text-[10px] font-bold">Campañas</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECCIÓN INFERIOR ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Actividad Reciente
            </h2>
            <Link href="/admin/dashboard/pedidos" className="text-xs font-bold text-primary hover:underline">Ver todo</Link>
          </div>
          <div className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {pedidosRecientes?.map(p => (
                <Link key={p.id} href="/admin/dashboard/pedidos" className="flex items-center gap-4 p-4 hover:bg-background-subtle/50 transition-colors">
                  <div className={cn("w-2 h-2 rounded-full", p.estado === 'pendiente_pago' ? 'bg-amber-500' : 'bg-emerald-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground font-mono">#{p.numero_orden} · {p.nombres}</p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">{new Date(p.creado_en).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{formatearPrecio(p.total)}</p>
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase", COLORES_ESTADO[p.estado])}>
                      {p.estado.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas de Stock
          </h2>
          <div className="bg-card border border-card-border rounded-3xl p-5 shadow-sm">
            {productosStockBajo?.length === 0 ? (
              <div className="py-6 text-center opacity-40">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-bold">Inventario en orden</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productosStockBajo?.map(prod => (
                  <div key={prod.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{prod.nombre}</p>
                      <div className="mt-1.5 h-1 rounded-full bg-background-subtle">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(prod.stock || 0) * 20}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      {prod.stock}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Exclusivo Superadmin */}
      {esSuperadmin && config && (
        <div className="rounded-3xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-black text-primary uppercase tracking-widest">Control del Sistema</h2>
          </div>
          <PanelSuperadmin config={{
            id: config.id!,
            esta_activa: config.esta_activa ?? true,
            mensaje_suspension: config.mensaje_suspension ?? '',
            info_pago: config.info_pago ?? null,
            cobro_activo: config.cobro_activo ?? false,
            fecha_inicio_sistema: config.fecha_inicio_sistema ?? null,
            dias_pago: config.dias_pago ?? 30,
          }} />
        </div>
      )}

    </div>
  )
}
