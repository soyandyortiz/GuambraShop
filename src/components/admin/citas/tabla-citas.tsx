'use client'

import { useState, useTransition } from 'react'
import {
  Search, Calendar, Clock, ChevronDown, 
  Menu, User, Phone, CheckCircle2, MessageCircle
} from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ESTADOS: Record<string, { etiqueta: string; color: string }> = {
  pendiente:   { etiqueta: 'Pendiente',   color: 'bg-warning/15 text-warning border-warning/30' },
  reservada:   { etiqueta: 'Reservada',   color: 'bg-blue-500/15 text-blue-600 border-blue-300' },
  confirmada:  { etiqueta: 'Confirmada',  color: 'bg-success/15 text-success border-success/30' },
  cancelada:   { etiqueta: 'Cancelada',   color: 'bg-danger/15 text-danger border-danger/30' },
}

interface CitaExt {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: string
  producto: {
    nombre: string
    imagenes: { url: string }[]
  }
  pedido: {
    numero_orden: string
    nombres: string
    email: string
    whatsapp: string
  } | null
}

interface Props { citas: CitaExt[] }

export function TablaCitas({ citas: citasInic }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [citas, setCitas] = useState<CitaExt[]>(citasInic)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'confirmada' | 'cancelada'>('todos')
  const [actualizando, setActualizando] = useState<string | null>(null)

  const filtrados = citas.filter(c => {
    const coincideFiltro = filtro === 'todos' || c.estado === filtro
    const texto = busqueda.toLowerCase()
    const coincideBusqueda =
      !texto ||
      (c.pedido?.numero_orden || '').toLowerCase().includes(texto) ||
      (c.pedido?.nombres || '').toLowerCase().includes(texto) ||
      c.producto.nombre.toLowerCase().includes(texto)
    return coincideFiltro && coincideBusqueda
  })

  async function cambiarEstado(id: string, nuevoEstado: string) {
    setActualizando(id)
    const supabase = crearClienteSupabase()
    
    // Aquí el estado es modificado directamente.
    // Ojo: Si cambia a cancelada podríamos restaurar el stock, 
    // pero eso es una capa adicional. Por lo pronto actualizamos el estado.
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      
    setActualizando(null)

    if (error) { toast.error('Error al actualizar la cita'); return }
    setCitas(cs => cs.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c))
    toast.success('Cita actualizada')
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Filtro estado */}
        <div className="flex rounded-xl border border-border overflow-hidden flex-shrink-0">
          {(['todos', 'pendiente', 'confirmada', 'cancelada'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn(
                'px-3 py-2 text-xs font-semibold capitalize transition-all',
                filtro === f
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground-muted hover:text-foreground hover:bg-background-subtle'
              )}>
              {f}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar por orden, cliente, servicio…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Lista de Citas */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Calendar className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin citas agendas</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda || filtro !== 'todos'
              ? 'Ningún resultado coincide'
              : 'Las reservas de servicios aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map(cita => {
            const estado = ESTADOS[cita.estado] || ESTADOS.pendiente
            const date = new Date(`${cita.fecha}T00:00:00`)
            
            return (
              <div key={cita.id} className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3 transition-all hover:bg-background-subtle/40">
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background-subtle border border-border overflow-hidden flex-shrink-0">
                      {cita.producto.imagenes?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cita.producto.imagenes[0].url} alt={cita.producto.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-foreground-muted/40" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{cita.producto.nombre}</p>
                      {cita.pedido ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-[1px] rounded font-bold uppercase">
                            Orden {cita.pedido.numero_orden}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-warning mt-0.5 font-medium">Borrador / Sin Confirmar</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Selector Estado */}
                  <div className="flex-shrink-0 relative">
                    {actualizando === cita.id ? (
                      <div className="w-[100px] h-7 rounded-md bg-background-subtle flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={cita.estado}
                          onChange={e => cambiarEstado(cita.id, e.target.value)}
                          className={cn(
                            'text-[10px] font-bold px-2 pr-6 py-1 rounded-md border appearance-none cursor-pointer focus:outline-none uppercase tracking-wide',
                            estado.color
                          )}
                        >
                          {Object.entries(ESTADOS).map(([val, { etiqueta }]) => (
                            <option key={val} value={val}>{etiqueta}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Fecha y Hora */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {date.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-lg border border-border shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-foreground-muted" />
                    <span className="text-sm font-bold text-foreground font-mono">
                      {cita.hora_inicio.slice(0, 5)}
                    </span>
                  </div>
                </div>

                {/* Datos del Cliente */}
                {cita.pedido ? (
                  <div className="mt-1 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground-muted">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{cita.pedido.nombres}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{cita.pedido.whatsapp}</span>
                      </div>
                      <a href={`https://wa.me/${cita.pedido.whatsapp?.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
                        className="text-[#25D366] hover:bg-[#25D366]/10 p-1 rounded transition-colors"
                        title="Contactar por WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 pt-3 border-t border-border text-xs text-foreground-muted text-center italic">
                    Sin datos de cliente
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
