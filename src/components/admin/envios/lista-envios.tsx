'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, EyeOff, Truck, Search } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'

interface ZonaEnvio {
  id: string
  provincia: string
  ciudad: string | null
  empresa_envio: string
  precio: number
  tiempo_entrega: string | null
  esta_activa: boolean
  orden: number
}

interface Props { zonas: ZonaEnvio[] }

export function ListaEnviosAdmin({ zonas }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busqueda, setBusqueda] = useState('')

  const filtradas = zonas
    .filter(z =>
      z.provincia.toLowerCase().includes(busqueda.toLowerCase()) ||
      (z.ciudad ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      z.empresa_envio.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => a.orden - b.orden || a.provincia.localeCompare(b.provincia))

  // Agrupar por provincia
  const porProvincia = filtradas.reduce<Record<string, ZonaEnvio[]>>((acc, z) => {
    if (!acc[z.provincia]) acc[z.provincia] = []
    acc[z.provincia].push(z)
    return acc
  }, {})

  async function toggleActiva(id: string, activa: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('zonas_envio').update({ esta_activa: !activa }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, provincia: string) {
    if (!confirm(`¿Eliminar la zona de envío "${provincia}"?`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('zonas_envio').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Buscar por provincia, ciudad o empresa..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Truck className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin zonas de envío</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda ? 'Intenta con otra búsqueda' : 'Agrega las provincias y ciudades a las que haces envíos'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(porProvincia).map(([provincia, items]) => (
            <div key={provincia} className="rounded-2xl border border-card-border bg-card overflow-hidden">
              {/* Header provincia */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-background-subtle border-b border-border">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">{provincia}</p>
                <span className="ml-auto text-xs text-foreground-muted">{items.length} zona{items.length > 1 ? 's' : ''}</span>
              </div>

              {/* Filas */}
              {items.map((zona, i) => (
                <div key={zona.id} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {zona.ciudad ?? 'Toda la provincia'}
                      </p>
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        zona.esta_activa ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted'
                      )}>
                        {zona.esta_activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-foreground-muted">{zona.empresa_envio}</span>
                      <span className="text-xs font-bold text-primary">{formatearPrecio(zona.precio)}</span>
                      {zona.tiempo_entrega && (
                        <span className="text-xs text-foreground-muted">{zona.tiempo_entrega}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActiva(zona.id, zona.esta_activa)}
                      title={zona.esta_activa ? 'Desactivar' : 'Activar'}
                      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        zona.esta_activa ? 'text-success hover:bg-success/10' : 'text-foreground-muted hover:bg-background-subtle')}
                    >
                      {zona.esta_activa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <Link
                      href={`/admin/dashboard/envios/${zona.id}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => eliminar(zona.id, `${zona.provincia}${zona.ciudad ? ` - ${zona.ciudad}` : ''}`)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground-muted text-center">
        {filtradas.length} de {zonas.length} zonas
      </p>
    </div>
  )
}
