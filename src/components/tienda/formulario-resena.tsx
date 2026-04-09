'use client'

import { useState } from 'react'
import { Star, Send, Loader2, CheckCircle2, User, CreditCard, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

interface Props {
  productoId: string
  onEnviada: () => void
}

export function FormularioResena({ productoId, onEnviada }: Props) {
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [celular, setCelular] = useState('')
  const [calificacion, setCalificacion] = useState(0)
  const [hover, setHover] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  function validar() {
    const e: Record<string, string> = {}
    if (!nombre.trim() || nombre.trim().length < 2) e.nombre = 'Ingresa tu nombre completo'
    if (!cedula.trim() || !/^\d{8,13}$/.test(cedula.replace(/\D/g, ''))) e.cedula = 'Ingresa una cédula válida (8-13 dígitos)'
    if (!celular.trim() || celular.replace(/\D/g, '').length < 7) e.celular = 'Ingresa un celular válido'
    if (calificacion === 0) e.calificacion = 'Selecciona una calificación'
    return e
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setEnviando(true)
    setErrores({})
    const supabase = crearClienteSupabase()

    // 1. Guardar reseña (queda pendiente de aprobación: es_visible = false por defecto en BD)
    const { error: errResena } = await supabase.from('resenas_producto').insert({
      producto_id: productoId,
      nombre_cliente: nombre.trim(),
      cedula: cedula.replace(/\D/g, ''),
      calificacion,
      comentario: comentario.trim() || null,
    })

    if (errResena) {
      setErrores({ general: 'No pudimos guardar tu reseña. Inténtalo de nuevo.' })
      setEnviando(false)
      return
    }

    // 2. Guardar celular en leads (upsert para evitar duplicados)
    const tel = celular.replace(/\D/g, '')
    await supabase.from('leads').upsert(
      { telefono: tel },
      { onConflict: 'telefono', ignoreDuplicates: true }
    )

    setEnviando(false)
    setEnviado(true)
    onEnviada()
  }

  if (enviado) {
    return (
      <div className="bg-background-subtle border border-border rounded-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <p className="text-sm font-bold text-foreground">¡Gracias por tu reseña!</p>
        <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
          Tu opinión está en revisión y será publicada pronto.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="bg-background-subtle border border-border rounded-2xl p-4 flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold text-foreground mb-0.5">Deja tu reseña</p>
        <p className="text-[11px] text-foreground-muted">Tu opinión ayuda a otros compradores.</p>
      </div>

      {/* Estrellas */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Calificación <span className="text-danger">*</span></p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              onClick={() => setCalificacion(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star className={cn(
                'w-7 h-7 transition-colors',
                i <= (hover || calificacion) ? 'text-yellow-400 fill-yellow-400' : 'text-border fill-border'
              )} />
            </button>
          ))}
        </div>
        {errores.calificacion && <p className="text-[11px] text-danger mt-1">{errores.calificacion}</p>}
      </div>

      {/* Nombre */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Nombre completo <span className="text-danger">*</span>
        </label>
        <div className={cn(
          'flex items-center h-11 bg-card border rounded-xl overflow-hidden transition-all',
          errores.nombre ? 'border-danger' : 'border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
        )}>
          <div className="px-3 flex items-center border-r border-border h-full flex-shrink-0">
            <User className="w-4 h-4 text-foreground-muted" />
          </div>
          <input
            type="text"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setErrores(p => ({ ...p, nombre: '' })) }}
            placeholder="Ej: Juan Pérez"
            className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none"
          />
        </div>
        {errores.nombre && <p className="text-[11px] text-danger mt-1">{errores.nombre}</p>}
      </div>

      {/* Cédula y Celular en fila */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Cédula <span className="text-danger">*</span>
          </label>
          <div className={cn(
            'flex items-center h-11 bg-card border rounded-xl overflow-hidden transition-all',
            errores.cedula ? 'border-danger' : 'border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
          )}>
            <div className="px-2.5 flex items-center border-r border-border h-full flex-shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-foreground-muted" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={cedula}
              onChange={e => { setCedula(e.target.value); setErrores(p => ({ ...p, cedula: '' })) }}
              placeholder="0000000000"
              maxLength={13}
              className="flex-1 px-2.5 bg-transparent text-foreground text-sm focus:outline-none"
            />
          </div>
          {errores.cedula && <p className="text-[11px] text-danger mt-1">{errores.cedula}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Celular <span className="text-danger">*</span>
          </label>
          <div className={cn(
            'flex items-center h-11 bg-card border rounded-xl overflow-hidden transition-all',
            errores.celular ? 'border-danger' : 'border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
          )}>
            <div className="px-2.5 flex items-center border-r border-border h-full flex-shrink-0">
              <Phone className="w-3.5 h-3.5 text-foreground-muted" />
            </div>
            <input
              type="tel"
              value={celular}
              onChange={e => { setCelular(e.target.value); setErrores(p => ({ ...p, celular: '' })) }}
              placeholder="0999999999"
              className="flex-1 px-2.5 bg-transparent text-foreground text-sm focus:outline-none"
            />
          </div>
          {errores.celular && <p className="text-[11px] text-danger mt-1">{errores.celular}</p>}
        </div>
      </div>

      {/* Comentario */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">
          Comentario <span className="text-foreground-muted font-normal">(opcional)</span>
        </label>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="¿Qué te pareció el producto?"
          rows={3}
          className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all"
        />
      </div>

      {errores.general && (
        <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-xl px-3 py-2">{errores.general}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-12 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
      >
        {enviando ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
        ) : (
          <><Send className="w-4 h-4" /> Enviar reseña</>
        )}
      </button>

      <p className="text-[10px] text-foreground-muted text-center leading-relaxed">
        Tu reseña será revisada antes de publicarse. Tu número de celular se usará solo para novedades de la tienda.
      </p>
    </form>
  )
}
