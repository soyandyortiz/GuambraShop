'use client'

import { useState, useTransition } from 'react'
import { Trash2, Download, Phone, Search, Users } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDemoDatos } from '@/hooks/usar-demo-datos'

interface Lead {
  id: string
  telefono: string
  creado_en: string
}

interface Props { leads: Lead[] }

export function TablaLeads({ leads: leadsInic }: Props) {
  const leadsDemo = useDemoDatos<Lead>('leads', leadsInic)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leads, setLeads] = useState<Lead[]>(leadsDemo)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const filtrados = leads.filter(l =>
    l.telefono.includes(busqueda)
  )

  const todosSeleccionados = filtrados.length > 0 && filtrados.every(l => seleccionados.has(l.id))

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(filtrados.map(l => l.id)))
    }
  }

  async function eliminarSeleccionados() {
    if (seleccionados.size === 0) return
    if (!confirm(`¿Eliminar ${seleccionados.size} lead(s)?`)) return
    const supabase = crearClienteSupabase()
    const ids = [...seleccionados]
    await supabase.from('leads').delete().in('id', ids)
    setLeads(ls => ls.filter(l => !seleccionados.has(l.id)))
    setSeleccionados(new Set())
    toast.success(`${ids.length} lead(s) eliminados`)
    startTransition(() => router.refresh())
  }

  async function eliminarUno(id: string, telefono: string) {
    if (!confirm(`¿Eliminar el lead "${telefono}"?`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('leads').delete().eq('id', id)
    setLeads(ls => ls.filter(l => l.id !== id))
    setSeleccionados(prev => { const s = new Set(prev); s.delete(id); return s })
    toast.success('Lead eliminado')
  }

  function exportarCSV() {
    const datos = filtrados.map(l => ({
      telefono: l.telefono,
      fecha: new Date(l.creado_en).toLocaleDateString('es-EC'),
      hora: new Date(l.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    }))

    const cabeceras = ['Teléfono', 'Fecha', 'Hora']
    const filas = datos.map(d => [d.telefono, d.fecha, d.hora].join(','))
    const csv = [cabeceras.join(','), ...filas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${datos.length} leads exportados`)
  }

  // Agrupar por mes
  const porMes = filtrados.reduce<Record<string, Lead[]>>((acc, l) => {
    const mes = new Date(l.creado_en).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(l)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar por teléfono..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {seleccionados.size > 0 && (
          <button onClick={eliminarSeleccionados}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-danger/10 text-danger text-sm font-medium hover:bg-danger/20 transition-all">
            <Trash2 className="w-4 h-4" />
            Eliminar ({seleccionados.size})
          </button>
        )}
        <button onClick={exportarCSV}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-foreground-muted text-sm font-medium hover:text-foreground hover:border-primary/40 transition-all">
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border border-card-border p-3 text-center">
          <p className="text-xl font-bold text-foreground">{leads.length}</p>
          <p className="text-xs text-foreground-muted mt-0.5">Total</p>
        </div>
        <div className="rounded-xl bg-card border border-card-border p-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {leads.filter(l => {
              const d = new Date(l.creado_en)
              const hoy = new Date()
              return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
            }).length}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">Este mes</p>
        </div>
        <div className="rounded-xl bg-card border border-card-border p-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {leads.filter(l => {
              const d = new Date(l.creado_en)
              const hoy = new Date()
              const diff = (hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
              return diff <= 7
            }).length}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">Últimos 7 días</p>
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Users className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin leads</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda ? 'Ningún resultado para esa búsqueda' : 'Los teléfonos de clientes aparecerán aquí cuando agreguen al carrito'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          {/* Cabecera tabla */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-background-subtle border-b border-border">
            <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
              className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide flex-1">Teléfono</p>
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide hidden sm:block">Fecha</p>
            <div className="w-8" />
          </div>

          {/* Filas agrupadas por mes */}
          {Object.entries(porMes).map(([mes, items]) => (
            <div key={mes}>
              <div className="px-4 py-1.5 bg-background-subtle/50 border-y border-border">
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider capitalize">{mes} · {items.length}</p>
              </div>
              {items.map((lead, i) => (
                <div key={lead.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-background-subtle/50 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                  <input
                    type="checkbox"
                    checked={seleccionados.has(lead.id)}
                    onChange={() => toggleSeleccion(lead.id)}
                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{lead.telefono}</p>
                  </div>
                  <p className="text-xs text-foreground-muted hidden sm:block">
                    {new Date(lead.creado_en).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <button onClick={() => eliminarUno(lead.id, lead.telefono)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground-muted text-center">
        {filtrados.length} de {leads.length} leads
      </p>
    </div>
  )
}
