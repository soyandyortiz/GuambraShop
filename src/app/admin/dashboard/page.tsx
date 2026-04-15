import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import {
  Package, Tag, Ticket, MessageSquare,
  ShoppingBag, TrendingUp, AlertTriangle, CheckCircle2, Power, ExternalLink, ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import type { MensajeAdmin } from '@/types'
import { PanelSuperadmin } from '@/components/admin/superadmin/panel-superadmin'
import { ContadorPago } from '@/components/admin/superadmin/contador-pago'

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

  // Estadísticas en paralelo
  const [
    { count: totalProductos },
    { count: productosActivos },
    { count: totalCategorias },
    { count: totalCupones },
    { count: totalPedidos },
    { data: mensajes },
    { data: config },
  ] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }),
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('esta_activa', true),
    supabase.from('cupones').select('*', { count: 'exact', head: true }).eq('esta_activo', true),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }),
    supabase.from('mensajes_admin').select('*').order('creado_en', { ascending: false }).limit(5),
    supabase.from('configuracion_tienda').select('id, nombre_tienda, esta_activa, mensaje_suspension, info_pago, cobro_activo, fecha_inicio_sistema, dias_pago').single(),
  ])

  const mensajesNoLeidos = (mensajes as MensajeAdmin[] | null)?.filter(m => !m.leido).length ?? 0
  const tiendaActiva = config?.esta_activa ?? true

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
      etiqueta: 'Pedidos',
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

      {/* Tarjetas de estadísticas */}
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
