'use client'

import { useState } from 'react'
import { Star, Check, X, ExternalLink, Trash2, Loader2, Clock, CheckCircle2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import Link from 'next/link'

interface Resena {
  id: string
  nombre_cliente: string
  cedula: string
  calificacion: number
  comentario: string | null
  es_visible: boolean
  creado_en: string
  productos: { nombre: string; slug: string }[] | null
}

interface Props {
  pendientes: Resena[]
  aprobadas: Resena[]
}

function TarjetaResena({
  resena,
  onAprobar,
  onRechazar,
  procesando,
}: {
  resena: Resena
  onAprobar: (id: string) => void
  onRechazar: (id: string) => void
  procesando: string | null
}) {
  const cargando = procesando === resena.id

  return (
    <div className={cn(
      'bg-card border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300',
      resena.es_visible
        ? 'border-card-border opacity-70'
        : 'border-warning/30 bg-warning/5 shadow-sm'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {resena.nombre_cliente[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{resena.nombre_cliente}</p>
            <p className="text-[11px] text-foreground-muted">CI: {resena.cedula}</p>
          </div>
        </div>

        {/* Estado */}
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0',
          resena.es_visible
            ? 'bg-success/10 text-success'
            : 'bg-warning/10 text-warning'
        )}>
          {resena.es_visible
            ? <><CheckCircle2 className="w-3 h-3" /> Aprobada</>
            : <><Clock className="w-3 h-3" /> Pendiente</>
          }
        </div>
      </div>

      {/* Estrellas + Producto */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn('w-4 h-4',
              i < resena.calificacion ? 'text-yellow-400 fill-yellow-400' : 'text-border fill-border'
            )} />
          ))}
        </div>
        {resena.productos?.[0] && (
          <Link
            href={`/producto/${resena.productos[0].slug}`}
            target="_blank"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{resena.productos[0].nombre}</span>
          </Link>
        )}
      </div>

      {/* Comentario */}
      {resena.comentario && (
        <p className="text-sm text-foreground-muted leading-relaxed bg-background-subtle rounded-xl px-3 py-2.5 border border-border/50">
          "{resena.comentario}"
        </p>
      )}

      {/* Fecha */}
      <p className="text-[10px] text-foreground-muted">
        {new Date(resena.creado_en).toLocaleDateString('es-EC', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}
      </p>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        {!resena.es_visible ? (
          <>
            <button
              onClick={() => onAprobar(resena.id)}
              disabled={cargando}
              className="flex-1 h-9 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-success/20 transition-all disabled:opacity-50 active:scale-95"
            >
              {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Aprobar
            </button>
            <button
              onClick={() => onRechazar(resena.id)}
              disabled={cargando}
              className="flex-1 h-9 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-danger/20 transition-all disabled:opacity-50 active:scale-95"
            >
              {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Eliminar
            </button>
          </>
        ) : (
          <button
            onClick={() => onRechazar(resena.id)}
            disabled={cargando}
            className="h-9 px-4 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-danger/20 transition-all disabled:opacity-50 active:scale-95"
          >
            {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

export function TablaResenas({ pendientes: pendientesIniciales, aprobadas: aprobadasIniciales }: Props) {
  const [pendientes, setPendientes] = useState<Resena[]>(pendientesIniciales)
  const [aprobadas, setAprobadas] = useState<Resena[]>(aprobadasIniciales)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [tab, setTab] = useState<'pendientes' | 'aprobadas'>('pendientes')

  async function aprobar(id: string) {
    setProcesando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('resenas_producto')
      .update({ es_visible: true })
      .eq('id', id)

    if (error) {
      toast.error('Error al aprobar la reseña')
    } else {
      const resena = pendientes.find(r => r.id === id)
      if (resena) {
        setPendientes(prev => prev.filter(r => r.id !== id))
        setAprobadas(prev => [{ ...resena, es_visible: true }, ...prev])
        toast.success('Reseña aprobada y publicada ✓')
      }
    }
    setProcesando(null)
  }

  async function eliminar(id: string) {
    setProcesando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('resenas_producto')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error al eliminar la reseña')
    } else {
      setPendientes(prev => prev.filter(r => r.id !== id))
      setAprobadas(prev => prev.filter(r => r.id !== id))
      toast.success('Reseña eliminada')
    }
    setProcesando(null)
  }

  const listaActual = tab === 'pendientes' ? pendientes : aprobadas

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-background-subtle p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('pendientes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
            tab === 'pendientes'
              ? 'bg-card shadow-sm text-foreground border border-border'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Pendientes
          {pendientes.length > 0 && (
            <span className="min-w-[20px] h-5 bg-warning text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('aprobadas')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
            tab === 'aprobadas'
              ? 'bg-card shadow-sm text-foreground border border-border'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          Publicadas
          {aprobadas.length > 0 && (
            <span className="min-w-[20px] h-5 bg-background-subtle text-foreground-muted text-[10px] font-black rounded-full flex items-center justify-center px-1 border border-border">
              {aprobadas.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido */}
      {listaActual.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-2xl bg-background-subtle flex items-center justify-center mx-auto mb-3">
            {tab === 'pendientes'
              ? <Clock className="w-6 h-6 text-foreground-muted/40" />
              : <CheckCircle2 className="w-6 h-6 text-foreground-muted/40" />
            }
          </div>
          <p className="text-sm font-bold text-foreground">
            {tab === 'pendientes' ? 'Sin reseñas pendientes' : 'Sin reseñas publicadas'}
          </p>
          <p className="text-xs text-foreground-muted mt-1">
            {tab === 'pendientes'
              ? 'Todas las reseñas están al día 🎉'
              : 'Aprueba reseñas para que aparezcan en la tienda'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {listaActual.map(resena => (
            <TarjetaResena
              key={resena.id}
              resena={resena}
              onAprobar={aprobar}
              onRechazar={eliminar}
              procesando={procesando}
            />
          ))}
        </div>
      )}
    </div>
  )
}
