import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import {
  Package, Tag, Ticket, MessageSquare,
  ShoppingBag, TrendingUp, AlertTriangle, CheckCircle2, Power, ExternalLink, ClipboardList,
  DollarSign, Clock, BarChart2, Star, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import type { MensajeAdmin, ItemPedido } from '@/types'
import { PanelSuperadmin } from '@/components/admin/superadmin/panel-superadmin'
import { ContadorPago } from '@/components/admin/superadmin/contador-pago'
import { formatearPrecio } from '@/lib/utils'

const COLORES_ESTADO: Record<string, string> = {
  pendiente:   'bg-warning/10 text-warning',
  confirmado:  'bg-blue-500/10 text-blue-500',
  en_proceso:  'bg-violet-500/10 text-violet-500',
  enviado:     'bg-primary/10 text-primary',
  entregado:   'bg-success/10 text-success',
  cancelado:   'bg-danger/10 text-danger',
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  en_proceso: 'En proceso',
  enviado:    'Enviado',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
}

export default async function PáginaDashboard() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  const esSuperadmin = perfil?.rol === 'superadmin'

  // Rangos de tiempo
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const hace28Dias = new Date(ahora.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString()

  // Todas las queries en paralelo
  const [
    { count: totalProductos },
    { count: productosActivos },
    { count: totalCategorias },
    { count: totalCupones },
    { count: totalPedidos },
    { data: mensajes },
    { data: config },
    { data: pedidosMes },
    { data: pedidosPendientes },
    { data: pedidosRecientes },
    { data: pedidosSemanas },
    { data: pedidosItems },
    { data: productosStockBajo },
  ] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }),
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('esta_activa', true),
    supabase.from('cupones').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }),
    supabase.from('mensajes_admin').select('*').order('creado_en', { ascending: false }).limit(5),
    supabase.from('configuracion_tienda').select('id, nombre_tienda, esta_activa, mensaje_suspension, info_pago, cobro_activo, fecha_inicio_sistema, dias_pago').single(),
    // Pedidos del mes (no cancelados)
    supabase.from('pedidos')
      .select('total, estado, creado_en')
      .gte('creado_en', inicioMes)
      .neq('estado', 'cancelado'),
    // Pedidos pendientes
    supabase.from('pedidos')
      .select('id', { count: 'exact', head: false })
      .eq('estado', 'pendiente'),
    // Últimos 5 pedidos
    supabase.from('pedidos')
      .select('id, numero_orden, nombres, total, estado, creado_en, tipo')
      .order('creado_en', { ascending: false })
      .limit(5),
    // Pedidos de últimas 4 semanas (para gráfico)
    supabase.from('pedidos')
      .select('creado_en, total')
      .gte('creado_en', hace28Dias)
      .neq('estado', 'cancelado'),
    // Items de pedidos últimas 4 semanas (para top productos)
    supabase.from('pedidos')
      .select('items')
      .gte('creado_en', hace28Dias)
      .neq('estado', 'cancelado'),
    // Productos con stock bajo
    supabase.from('productos')
      .select('id, nombre, slug, stock')
      .eq('esta_activo', true)
      .not('stock', 'is', null)
      .lte('stock', 5)
      .order('stock', { ascending: true })
      .limit(8),
  ])

  const mensajesNoLeidos = (mensajes as MensajeAdmin[] | null)?.filter(m => !m.leido).length ?? 0
  const tiendaActiva = config?.esta_activa ?? true

  // Métricas del mes
  const ingresosMes = pedidosMes?.reduce((s, p) => s + (p.total ?? 0), 0) ?? 0
  const cantidadPedidosMes = pedidosMes?.length ?? 0
  const cantidadPendientes = pedidosPendientes?.length ?? 0

  // Gráfico de barras — últimas 4 semanas
  const semanas = [3, 2, 1, 0].map(i => {
    const inicioSem = new Date(ahora.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const finSem    = new Date(ahora.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const pedsSem   = pedidosSemanas?.filter(p => {
      const f = new Date(p.creado_en)
      return f >= inicioSem && f < finSem
    }) ?? []
    const labels = ['Hace 4 sem', 'Hace 3 sem', 'Hace 2 sem', 'Esta sem.']
    return {
      etiqueta: labels[3 - i],
      cantidad: pedsSem.length,
      total: pedsSem.reduce((s, p) => s + (p.total ?? 0), 0),
    }
  })
  const maxCantidadSem = Math.max(...semanas.map(s => s.cantidad), 1)

  // Top 5 productos más pedidos
  const conteoProductos: Record<string, { nombre: string; cantidad: number }> = {}
  pedidosItems?.forEach(p => {
    if (!Array.isArray(p.items)) return
    ;(p.items as ItemPedido[]).forEach(item => {
      if (!conteoProductos[item.producto_id]) {
        conteoProductos[item.producto_id] = { nombre: item.nombre, cantidad: 0 }
      }
      conteoProductos[item.producto_id].cantidad += item.cantidad
    })
  })
  const topProductos = Object.values(conteoProductos)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
  const maxTopCantidad = Math.max(...topProductos.map(p => p.cantidad), 1)

  const stats = [
    {
      etiqueta: 'Productos activos',
      valor: productosActivos ?? 0,
      total: totalProductos ?? 0,
      icono: <Package className="w-5 h-5" />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      href: '/admin/dashboard/productos',
    },
    {
      etiqueta: 'Categorías',
      valor: totalCategorias ?? 0,
      total: null,
      icono: <Tag className="w-5 h-5" />,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      href: '/admin/dashboard/categorias',
    },
    {
      etiqueta: 'Cupones activos',
      valor: totalCupones ?? 0,
      total: null,
      icono: <Ticket className="w-5 h-5" />,
      color: 'text-success',
      bg: 'bg-success/10',
      href: '/admin/dashboard/cupones',
    },
    {
      etiqueta: 'Pedidos totales',
      valor: totalPedidos ?? 0,
      total: null,
      icono: <ClipboardList className="w-5 h-5" />,
      color: 'text-warning',
      bg: 'bg-warning/10',
      href: '/admin/dashboard/pedidos',
    },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Alerta si tienda suspendida */}
      {!tiendaActiva && (
        <div className="rounded-2xl bg-danger/10 border border-danger/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">Tienda suspendida</p>
            <p className="text-xs text-foreground-muted mt-0.5">{config?.mensaje_suspension}</p>
            {config?.info_pago && (
              <p className="text-xs text-foreground mt-2 font-medium">{config.info_pago}</p>
            )}
          </div>
        </div>
      )}

      {/* Bienvenida */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hola, {perfil?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {config?.nombre_tienda ?? 'Tu tienda'} —{' '}
            {tiendaActiva ? (
              <span className="text-success font-medium">Tienda activa</span>
            ) : (
              <span className="text-danger font-medium">Tienda suspendida</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary flex-shrink-0">
          {tiendaActiva
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> En línea</>
            : <><Power className="w-3.5 h-3.5" /> Suspendida</>
          }
        </div>
      </div>

      {/* Botón Ver tienda */}
      <Link
        href="/"
        target="_blank"
        className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all"
      >
        <ExternalLink className="w-4 h-4" />
        VER TIENDA ONLINE
      </Link>

      {/* ── Métricas del mes ──────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          Este mes
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Pedidos del mes */}
          <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{cantidadPedidosMes}</p>
            <p className="text-[11px] text-foreground-muted leading-tight">Pedidos del mes</p>
          </div>

          {/* Ingresos del mes */}
          <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
            <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <p className="text-xl font-bold text-foreground leading-tight">{formatearPrecio(ingresosMes)}</p>
            <p className="text-[11px] text-foreground-muted leading-tight">Ingresos del mes</p>
          </div>

          {/* Pendientes */}
          <Link
            href="/admin/dashboard/pedidos"
            className={`rounded-2xl border p-4 flex flex-col gap-1 transition-all active:scale-[0.98] hover:shadow-sm ${
              cantidadPendientes > 0 ? 'bg-warning/10 border-warning/30' : 'bg-card border-card-border'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${cantidadPendientes > 0 ? 'bg-warning/20' : 'bg-warning/10'}`}>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">{cantidadPendientes}</p>
            <p className="text-[11px] text-foreground-muted leading-tight">Pendientes</p>
          </Link>
        </div>
      </div>

      {/* ── Gráfico de barras semanal ─────────────────── */}
      <div className="rounded-2xl bg-card border border-card-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Pedidos por semana</h2>
          <span className="text-[10px] text-foreground-muted">Últimas 4 semanas</span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {semanas.map((sem, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              {/* Valor */}
              <span className="text-xs font-bold text-foreground">{sem.cantidad}</span>
              {/* Barra */}
              <div className="w-full rounded-t-lg bg-primary/10 flex items-end overflow-hidden" style={{ height: '72px' }}>
                <div
                  className="w-full rounded-t-lg bg-primary transition-all duration-500"
                  style={{ height: `${(sem.cantidad / maxCantidadSem) * 100}%`, minHeight: sem.cantidad > 0 ? '4px' : '0' }}
                />
              </div>
              {/* Etiqueta */}
              <span className="text-[10px] text-foreground-muted text-center leading-tight">{sem.etiqueta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjetas de estadísticas totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="rounded-2xl bg-card border border-card-border p-4 hover:border-border-strong hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <span className={stat.color}>{stat.icono}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.valor}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{stat.etiqueta}</p>
            {stat.total !== null && (
              <p className="text-[10px] text-foreground-muted mt-1">
                de {stat.total} en total
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* ── Top 5 productos más pedidos ──────────────── */}
      {topProductos.length > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-star fill-star" />
              Top productos (28 días)
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {topProductos.map((prod, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-foreground-muted text-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{prod.nombre}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-background-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(prod.cantidad / maxTopCantidad) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-primary flex-shrink-0">{prod.cantidad} uds.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Últimos 5 pedidos ────────────────────────── */}
      {(pedidosRecientes?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Últimos pedidos
            </h2>
            <Link href="/admin/dashboard/pedidos" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {pedidosRecientes!.map(p => (
              <Link
                key={p.id}
                href="/admin/dashboard/pedidos"
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border hover:border-border-strong transition-all active:scale-[0.98]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground font-mono">#{p.numero_orden}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${COLORES_ESTADO[p.estado] ?? 'bg-card text-foreground-muted'}`}>
                      {ETIQUETAS_ESTADO[p.estado] ?? p.estado}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5 truncate">{p.nombres}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatearPrecio(p.total)}</p>
                  <p className="text-[10px] text-foreground-muted">
                    {new Date(p.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Stock bajo ───────────────────────────────── */}
      {(productosStockBajo?.length ?? 0) > 0 && (
        <div className="rounded-2xl bg-warning/5 border border-warning/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-warning flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Stock bajo
            </h2>
            <Link href="/admin/dashboard/productos" className="text-xs text-primary hover:underline">
              Ver productos
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {productosStockBajo!.map(prod => (
              <div key={prod.id} className="flex items-center justify-between gap-3">
                <p className="text-xs text-foreground truncate">{prod.nombre}</p>
                <span className={`text-xs font-bold flex-shrink-0 ${(prod.stock ?? 0) <= 2 ? 'text-danger' : 'text-warning'}`}>
                  {prod.stock} uds.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: '/admin/dashboard/productos/nuevo', etiqueta: 'Nuevo producto', icono: <Package className="w-4 h-4" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { href: '/admin/dashboard/categorias',      etiqueta: 'Categorías',     icono: <Tag className="w-4 h-4" />,     color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { href: '/admin/dashboard/cupones',         etiqueta: 'Cupones',        icono: <Ticket className="w-4 h-4" />,  color: 'text-success', bg: 'bg-success/10' },
            { href: '/admin/dashboard/promociones',     etiqueta: 'Promociones',    icono: <TrendingUp className="w-4 h-4" />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { href: '/admin/dashboard/pedidos',         etiqueta: 'Ver pedidos',    icono: <ClipboardList className="w-4 h-4" />, color: 'text-warning', bg: 'bg-warning/10' },
            { href: '/admin/dashboard/perfil',          etiqueta: 'Perfil tienda',  icono: <ShoppingBag className="w-4 h-4" />, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border hover:border-border-strong hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
            >
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={item.color}>{item.icono}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{item.etiqueta}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Mensajes del superadmin */}
      {(mensajes && mensajes.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensajes
              {mensajesNoLeidos > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {mensajesNoLeidos}
                </span>
              )}
            </h2>
            <Link href="/admin/dashboard/mensajes" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {(mensajes as MensajeAdmin[]).slice(0, 3).map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl border p-4 transition-all ${
                  msg.leido
                    ? 'bg-card border-card-border'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                {msg.asunto && (
                  <p className="text-sm font-semibold text-foreground">{msg.asunto}</p>
                )}
                <p className="text-sm text-foreground-muted mt-0.5 line-clamp-2">{msg.cuerpo}</p>
                <p className="text-[10px] text-foreground-muted mt-2">
                  {new Date(msg.creado_en).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                  {!msg.leido && <span className="ml-2 text-primary font-semibold">• Nuevo</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contador de pago — solo admin (no superadmin) */}
      {!esSuperadmin && config?.cobro_activo && config?.fecha_inicio_sistema && (
        <ContadorPago
          fechaInicio={config.fecha_inicio_sistema}
          diasPago={config.dias_pago ?? 30}
          compacto
        />
      )}

      {/* Panel exclusivo superadmin */}
      {esSuperadmin && config && (
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
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
