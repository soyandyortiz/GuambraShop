'use client'

import { useState } from 'react'
import { X, MessageSquare, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn } from '@/lib/utils'

interface Mensaje {
  id: string
  asunto: string | null
  cuerpo: string
  leido: boolean
  creado_en: string
}

interface Props {
  mensajes: Mensaje[]
}

export function ModalMensajes({ mensajes }: Props) {
  const [abierto, setAbierto] = useState(mensajes.length > 0)
  const [indice, setIndice] = useState(0)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())

  if (!abierto || mensajes.length === 0) return null

  const mensaje = mensajes[indice]
  const total = mensajes.length

  async function marcarLeido(id: string) {
    if (marcados.has(id)) return
    const supabase = crearClienteSupabase()
    await supabase.from('mensajes_admin').update({ leido: true }).eq('id', id)
    setMarcados(prev => new Set([...prev, id]))
  }

  async function cerrar() {
    // Marcar todos como leídos al cerrar
    const sinLeer = mensajes.filter(m => !marcados.has(m.id)).map(m => m.id)
    if (sinLeer.length > 0) {
      const supabase = crearClienteSupabase()
      await supabase.from('mensajes_admin').update({ leido: true }).in('id', sinLeer)
    }
    setAbierto(false)
  }

  function siguiente() {
    marcarLeido(mensaje.id)
    setIndice(i => Math.min(i + 1, total - 1))
  }

  function anterior() {
    setIndice(i => Math.max(i - 1, 0))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary/5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Mensaje del administrador</p>
            {total > 1 && (
              <p className="text-xs text-foreground-muted">{indice + 1} de {total} mensajes sin leer</p>
            )}
          </div>
          <button onClick={cerrar}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5">
          {mensaje.asunto && (
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">
              {mensaje.asunto}
            </p>
          )}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {mensaje.cuerpo}
          </p>
          <p className="text-xs text-foreground-muted mt-3">
            {new Date(mensaje.creado_en).toLocaleDateString('es-EC', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>

        {/* Indicadores si hay varios */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 px-5 pb-3">
            {mensajes.map((_, i) => (
              <div key={i} className={cn(
                'h-1.5 rounded-full transition-all',
                i === indice ? 'w-4 bg-primary' : 'w-1.5 bg-border'
              )} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {total > 1 && (
            <>
              <button onClick={anterior} disabled={indice === 0}
                className="w-10 h-11 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {indice < total - 1 ? (
                <button onClick={siguiente}
                  className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={cerrar}
                  className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  <CheckCheck className="w-4 h-4" /> Entendido
                </button>
              )}
            </>
          )}
          {total === 1 && (
            <button onClick={cerrar}
              className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
              <CheckCheck className="w-4 h-4" /> Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
