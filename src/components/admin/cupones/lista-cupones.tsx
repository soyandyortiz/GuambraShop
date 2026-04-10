'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, EyeOff, Ticket, Copy } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDemoDatos } from '@/hooks/usar-demo-datos'

interface Cupon {
  id: string
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima: number | null
  max_usos: number | null
  usos_actuales: number
  esta_activo: boolean
  vence_en: string | null
}

interface Props { cupones: Cupon[] }

export function ListaCuponesAdmin({ cupones: cuponesServidor }: Props) {
  const cupones = useDemoDatos<Cupon>('cupones', cuponesServidor)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busqueda, setBusqueda] = useState('')

  const filtrados = cupones.filter(c =>
    c.codigo.toLowerCase().includes(busqueda.toLowerCase())
  )

  async function toggleActivo(id: string, activo: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('cupones').update({ esta_activo: !activo }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, codigo: string) {
    if (!confirm(`¿Eliminar el cupón "${codigo}"?`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('cupones').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success(`Código "${codigo}" copiado`)
  }

  function estadoCupon(c: Cupon): { label: string; clase: string } {
    if (!c.esta_activo) return { label: 'Inactivo', clase: 'bg-foreground-muted/10 text-foreground-muted' }
    if (c.vence_en && new Date(c.vence_en) < new Date()) return { label: 'Vencido', clase: 'bg-danger/10 text-danger' }
    if (c.max_usos && c.usos_actuales >= c.max_usos) return { label: 'Agotado', clase: 'bg-warning/10 text-warning' }
    return { label: 'Activo', clase: 'bg-success/10 text-success' }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por código..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full h-10 px-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {filtrados.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <Ticket className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin cupones</p>
          <p className="text-xs text-foreground-muted mt-1">
            {busqueda ? 'Intenta con otro código' : 'Crea tu primer cupón de descuento'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map(cupon => {
            const { label, clase } = estadoCupon(cupon)
            return (
              <div key={cupon.id} className="flex items-center gap-3 p-3 rounded-2xl border border-card-border bg-card">
                {/* Ícono */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground font-mono tracking-wide">{cupon.codigo}</p>
                    <button onClick={() => copiar(cupon.codigo)}
                      className="w-5 h-5 flex items-center justify-center text-foreground-muted hover:text-primary transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {cupon.tipo_descuento === 'porcentaje'
                      ? `${cupon.valor_descuento}% de descuento`
                      : `${formatearPrecio(cupon.valor_descuento)} de descuento`}
                    {cupon.compra_minima ? ` · mín. ${formatearPrecio(cupon.compra_minima)}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', clase)}>{label}</span>
                    <span className="text-[10px] text-foreground-muted">
                      {cupon.usos_actuales}{cupon.max_usos ? `/${cupon.max_usos}` : ''} usos
                    </span>
                    {cupon.vence_en && (
                      <span className="text-[10px] text-foreground-muted">
                        Vence {new Date(cupon.vence_en).toLocaleDateString('es-EC')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActivo(cupon.id, cupon.esta_activo)}
                    title={cupon.esta_activo ? 'Desactivar' : 'Activar'}
                    className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                      cupon.esta_activo ? 'text-success hover:bg-success/10' : 'text-foreground-muted hover:bg-background-subtle')}>
                    {cupon.esta_activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <Link href={`/admin/dashboard/cupones/${cupon.id}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button onClick={() => eliminar(cupon.id, cupon.codigo)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-foreground-muted text-center">
        {filtrados.length} de {cupones.length} cupones
      </p>
    </div>
  )
}
