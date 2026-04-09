'use client'

import { useState, useTransition } from 'react'
import { MessageSquare, Trash2, Circle, CheckCircle2, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

interface Mensaje {
  id: string
  asunto: string | null
  cuerpo: string
  leido: boolean
  creado_en: string
}

interface Props {
  mensajes: Mensaje[]
  rol: 'admin' | 'superadmin'
}

const schema = z.object({
  asunto: z.string().optional(),
  cuerpo: z.string().min(5, 'El mensaje debe tener al menos 5 caracteres'),
})
type Campos = z.infer<typeof schema>

export function ListaMensajesAdmin({ mensajes: mensajesInic, rol }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesInic)
  const [enviando, setEnviando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Campos>({
    resolver: zodResolver(schema),
    defaultValues: { asunto: '', cuerpo: '' },
  })

  async function marcarLeido(id: string, leido: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('mensajes_admin').update({ leido: !leido }).eq('id', id)
    setMensajes(ms => ms.map(m => m.id === id ? { ...m, leido: !leido } : m))
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este mensaje?')) return
    const supabase = crearClienteSupabase()
    await supabase.from('mensajes_admin').delete().eq('id', id)
    setMensajes(ms => ms.filter(m => m.id !== id))
    startTransition(() => router.refresh())
  }

  async function enviar(datos: Campos) {
    setEnviando(true)
    const supabase = crearClienteSupabase()
    const { data, error } = await supabase.from('mensajes_admin').insert({
      asunto: datos.asunto || null,
      cuerpo: datos.cuerpo,
      leido: false,
    }).select().single()

    if (error) {
      toast.error('Error al enviar')
      setEnviando(false)
      return
    }
    toast.success('Mensaje enviado')
    reset()
    setMensajes(ms => [data as Mensaje, ...ms])
    setEnviando(false)
  }

  const sinLeer = mensajes.filter(m => !m.leido).length

  return (
    <div className="flex flex-col gap-5">

      {/* Formulario solo para superadmin */}
      {rol === 'superadmin' && (
        <form onSubmit={handleSubmit(enviar)} className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">Enviar mensaje al admin</p>
          <input
            {...register('asunto')}
            placeholder="Asunto (opcional)"
            className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex flex-col gap-1">
            <textarea
              {...register('cuerpo')}
              rows={4}
              placeholder="Escribe el mensaje aquí..."
              className="px-3 py-2 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {errors.cuerpo && <p className="text-xs text-danger">{errors.cuerpo.message}</p>}
          </div>
          <button type="submit" disabled={enviando}
            className="flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Enviar mensaje</>
            }
          </button>
        </form>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {mensajes.length} mensaje{mensajes.length !== 1 ? 's' : ''}
          {sinLeer > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white">
              {sinLeer} sin leer
            </span>
          )}
        </p>
      </div>

      {/* Lista */}
      {mensajes.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <MessageSquare className="w-10 h-10 text-foreground-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Sin mensajes</p>
          <p className="text-xs text-foreground-muted mt-1">
            {rol === 'superadmin' ? 'Usa el formulario de arriba para enviar un mensaje al admin' : 'No tienes mensajes por el momento'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {mensajes.map(m => (
            <div key={m.id}
              className={cn(
                'rounded-2xl border p-4 transition-all',
                m.leido ? 'bg-card border-card-border' : 'bg-primary/5 border-primary/30'
              )}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => marcarLeido(m.id, m.leido)}
                  title={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                  className="mt-0.5 flex-shrink-0 text-primary hover:scale-110 transition-transform"
                >
                  {m.leido
                    ? <CheckCircle2 className="w-4 h-4 text-foreground-muted" />
                    : <Circle className="w-4 h-4 text-primary" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  {m.asunto && (
                    <p className={cn('text-sm font-semibold mb-1', m.leido ? 'text-foreground-muted' : 'text-foreground')}>
                      {m.asunto}
                    </p>
                  )}
                  <p className={cn('text-sm leading-relaxed whitespace-pre-wrap', m.leido ? 'text-foreground-muted' : 'text-foreground')}>
                    {m.cuerpo}
                  </p>
                  <p className="text-xs text-foreground-muted mt-2">
                    {new Date(m.creado_en).toLocaleDateString('es-EC', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                {rol === 'superadmin' && (
                  <button onClick={() => eliminar(m.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
