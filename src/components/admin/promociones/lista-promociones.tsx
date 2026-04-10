'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, EyeOff, Megaphone, LayoutTemplate } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { useDemoDatos } from '@/hooks/usar-demo-datos'

interface Promocion {
  id: string
  nombre: string
  descripcion: string | null
  precio: number | null
  imagen_url: string
  formato_imagen: 'cuadrado' | 'horizontal' | 'vertical'
  esta_activa: boolean
  inicia_en: string | null
  termina_en: string | null
}

interface Props { promociones: Promocion[] }

const FORMATO_LABEL = {
  cuadrado: '1:1',
  horizontal: '16:9',
  vertical: '9:16',
}

function estadoPromocion(p: Promocion): { label: string; clase: string } {
  const ahora = new Date()
  if (!p.esta_activa) return { label: 'Inactiva', clase: 'bg-foreground-muted/10 text-foreground-muted' }
  if (p.termina_en && new Date(p.termina_en) < ahora) return { label: 'Vencida', clase: 'bg-danger/10 text-danger' }
  if (p.inicia_en && new Date(p.inicia_en) > ahora) return { label: 'Programada', clase: 'bg-warning/10 text-warning' }
  return { label: 'Activa', clase: 'bg-success/10 text-success' }
}

export function ListaPromocionesAdmin({ promociones: promocionesServidor }: Props) {
  const promociones = useDemoDatos<Promocion>('promociones', promocionesServidor)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [preview, setPreview] = useState<Promocion | null>(null)

  async function toggleActiva(id: string, activa: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('promociones').update({ esta_activa: !activa }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la promoción "${nombre}"?`)) return
    const supabase = crearClienteSupabase()
    await supabase.from('promociones').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {/* Modal preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-card rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className={cn(
              'w-full overflow-hidden bg-background-subtle',
              preview.formato_imagen === 'cuadrado' && 'aspect-square',
              preview.formato_imagen === 'horizontal' && 'aspect-video',
              preview.formato_imagen === 'vertical' && 'aspect-[9/16] max-h-64',
            )}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.imagen_url} alt={preview.nombre} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <p className="font-bold text-foreground">{preview.nombre}</p>
              {preview.descripcion && <p className="text-sm text-foreground-muted mt-1">{preview.descripcion}</p>}
              {preview.precio && <p className="text-lg font-bold text-primary mt-2">{formatearPrecio(preview.precio)}</p>}
              <button
                onClick={() => setPreview(null)}
                className="mt-3 w-full h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                Cerrar preview
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {promociones.length === 0 ? (
          <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
            <Megaphone className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sin promociones</p>
            <p className="text-xs text-foreground-muted mt-1">Crea una promoción para mostrar como modal en la tienda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {promociones.map(promo => {
              const { label, clase } = estadoPromocion(promo)
              return (
                <div key={promo.id} className="flex items-center gap-3 p-3 rounded-2xl border border-card-border bg-card">
                  {/* Miniatura */}
                  <button
                    onClick={() => setPreview(promo)}
                    title="Ver preview"
                    className={cn(
                      'flex-shrink-0 overflow-hidden rounded-xl border border-border bg-background-subtle hover:opacity-80 transition-opacity',
                      promo.formato_imagen === 'cuadrado' && 'w-14 h-14',
                      promo.formato_imagen === 'horizontal' && 'w-20 h-12',
                      promo.formato_imagen === 'vertical' && 'w-10 h-14',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={promo.imagen_url} alt={promo.nombre} className="w-full h-full object-cover" />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{promo.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', clase)}>{label}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-foreground-muted">
                        <LayoutTemplate className="w-3 h-3" />
                        {promo.formato_imagen} · {FORMATO_LABEL[promo.formato_imagen]}
                      </span>
                    </div>
                    {(promo.inicia_en || promo.termina_en) && (
                      <p className="text-[10px] text-foreground-muted mt-0.5">
                        {promo.inicia_en && `Desde ${new Date(promo.inicia_en).toLocaleDateString('es-EC')}`}
                        {promo.inicia_en && promo.termina_en && ' — '}
                        {promo.termina_en && `hasta ${new Date(promo.termina_en).toLocaleDateString('es-EC')}`}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActiva(promo.id, promo.esta_activa)}
                      title={promo.esta_activa ? 'Desactivar' : 'Activar'}
                      className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        promo.esta_activa ? 'text-success hover:bg-success/10' : 'text-foreground-muted hover:bg-background-subtle')}>
                      {promo.esta_activa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <Link href={`/admin/dashboard/promociones/${promo.id}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button onClick={() => eliminar(promo.id, promo.nombre)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-foreground-muted text-center">{promociones.length} promoción{promociones.length !== 1 ? 'es' : ''}</p>
      </div>
    </>
  )
}
