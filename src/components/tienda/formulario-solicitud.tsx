'use client'

import { useState, useEffect } from 'react'
import { PartyPopper, Calendar, MapPin, DollarSign, MessageSquare, User, Mail, Phone, ChevronDown, CheckCircle2, Loader2, Send, Clock, AlertTriangle } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { generarMensajeSolicitudEvento, generarEnlaceWhatsApp, normalizarTelefono } from '@/lib/whatsapp'
import { formatearPrecio } from '@/lib/utils'
import { CODIGOS_PAIS } from '@/lib/ecuador'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  productoId: string
  productoNombre: string
  precioBase: number | null     // precio referencial (puede ser null si es solo consulta)
  whatsapp: string              // número de la tienda
  simboloMoneda?: string
}

const INPUT = 'w-full h-11 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'

export function FormularioSolicitud({ productoId, productoNombre, precioBase, whatsapp, simboloMoneda = '$' }: Props) {
  const [enviando,      setEnviando]      = useState(false)
  const [exito,         setExito]         = useState<{ numero: string; urlWA: string } | null>(null)

  // Datos del cliente
  const [nombre,        setNombre]        = useState('')
  const [email,         setEmail]         = useState('')
  const [codigoPais,    setCodigoPais]    = useState('+593')
  const [telefono,      setTelefono]      = useState('')

  // Datos del evento
  const [fechaEvento,   setFechaEvento]   = useState('')
  const [horaEvento,    setHoraEvento]    = useState('')
  const [ciudad,        setCiudad]        = useState('')
  const [tipoEvento,    setTipoEvento]    = useState('')
  const [presupuesto,   setPresupuesto]   = useState('')
  const [notas,         setNotas]         = useState('')

  // Fechas ya comprometidas (eventos confirmados — solo referencia)
  const [fechasOcupadas, setFechasOcupadas] = useState<string[]>([])

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const supabase = crearClienteSupabase()
    supabase
      .from('solicitudes_evento')
      .select('fecha_evento')
      .eq('estado', 'confirmada')
      .not('fecha_evento', 'is', null)
      .then(({ data }) => {
        if (data) setFechasOcupadas(data.map(s => s.fecha_evento as string).filter(Boolean))
      })
  }, [])

  function validar(): boolean {
    if (!nombre.trim())    { toast.error('Ingresa tu nombre completo'); return false }
    if (!email.trim() || !email.includes('@')) { toast.error('Ingresa un email válido'); return false }
    if (!telefono.trim())  { toast.error('Ingresa tu número de WhatsApp'); return false }
    if (!fechaEvento)      { toast.error('Selecciona la fecha del evento'); return false }
    if (!ciudad.trim())    { toast.error('Ingresa la ciudad del evento'); return false }
    return true
  }

  async function enviarSolicitud() {
    if (!validar()) return
    setEnviando(true)

    const supabase = crearClienteSupabase()
    const whatsappCompleto = codigoPais + telefono.replace(/\D/g, '')

    const { data, error } = await supabase
      .from('solicitudes_evento')
      .insert({
        producto_id:            productoId,
        producto_nombre:        productoNombre,
        nombre_cliente:         nombre.trim(),
        email:                  email.trim().toLowerCase(),
        whatsapp:               whatsappCompleto,
        fecha_evento:           fechaEvento || null,
        hora_evento:            horaEvento || null,
        ciudad:                 ciudad.trim() || null,
        tipo_evento:            tipoEvento.trim() || null,
        presupuesto_aproximado: presupuesto ? parseFloat(presupuesto) : null,
        notas:                  notas.trim() || null,
      })
      .select('numero_solicitud')
      .single()

    if (error || !data) {
      toast.error('Error al enviar la solicitud. Intenta nuevamente.')
      setEnviando(false)
      return
    }

    const numeroSolicitud = data.numero_solicitud

    // Notificación Telegram (fire-and-forget)
    fetch('/api/telegram/notificar-solicitud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero_solicitud: numeroSolicitud,
        producto_nombre:  productoNombre,
        nombre_cliente:   nombre.trim(),
        whatsapp:         whatsappCompleto,
        email:            email.trim().toLowerCase(),
        fecha_evento:     fechaEvento || null,
        hora_evento:      horaEvento || null,
        ciudad:           ciudad.trim() || null,
        tipo_evento:      tipoEvento.trim() || null,
        presupuesto:      presupuesto ? parseFloat(presupuesto) : null,
        notas:            notas.trim() || null,
        simbolo_moneda:   simboloMoneda,
      }),
    }).catch(() => {/* silencioso */})

    // Generar URL de WhatsApp con toda la información
    const msgCodificado = generarMensajeSolicitudEvento({
      numeroSolicitud,
      productoNombre,
      nombreCliente:  nombre.trim(),
      whatsapp:       whatsappCompleto,
      email:          email.trim().toLowerCase(),
      fechaEvento:    fechaEvento || null,
      horaEvento:     horaEvento || null,
      ciudad:         ciudad.trim() || null,
      tipoEvento:     tipoEvento.trim() || null,
      presupuesto:    presupuesto ? parseFloat(presupuesto) : null,
      notas:          notas.trim() || null,
      simboloMoneda,
    })

    const urlWA = generarEnlaceWhatsApp(whatsapp, msgCodificado)
    setEnviando(false)
    setExito({ numero: numeroSolicitud, urlWA })
  }

  // ── Estado de éxito ──────────────────────────────────────────────────────────
  if (exito) {
    return (
      <div className="px-4 py-6 lg:px-8 border-t border-border">
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-purple-600" />
          </div>
          <h3 className="text-base font-bold text-foreground">¡Solicitud enviada!</h3>
          <p className="text-sm text-foreground-muted mt-1">
            Tu número de solicitud es
          </p>
          <div className="my-3 px-4 py-2 bg-white border-2 border-purple-300 rounded-xl inline-block">
            <p className="text-xl font-black text-purple-600 tracking-wider">{exito.numero}</p>
          </div>
          <p className="text-xs text-foreground-muted mb-4">
            Continúa la conversación por WhatsApp para recibir tu cotización personalizada.
          </p>
          <a
            href={exito.urlWA}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-md"
          >
            <MessageSquare className="w-5 h-5" />
            Continuar por WhatsApp
          </a>
        </div>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────────
  return (
    <div className="border-t border-border">
      {/* Encabezado del formulario */}
      <div className="px-4 py-4 lg:px-8 bg-purple-50/60 border-b border-purple-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Solicitar cotización</p>
            <p className="text-xs text-foreground-muted">
              Cuéntanos sobre tu evento y te enviamos una propuesta personalizada
              {precioBase ? ` · Desde ${formatearPrecio(precioBase, simboloMoneda)}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 lg:px-8 flex flex-col gap-4">

        {/* ── Datos del evento ── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-500" /> Datos del evento
          </p>

          {/* Fecha del evento */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Fecha del evento *</label>
            <input
              type="date"
              value={fechaEvento}
              min={hoy}
              onChange={e => setFechaEvento(e.target.value)}
              className={INPUT}
            />
            {/* Aviso si la fecha ya tiene un evento confirmado */}
            {fechaEvento && fechasOcupadas.includes(fechaEvento) && (
              <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                Esta fecha ya tiene un evento confirmado. Puedes enviar tu solicitud de todas formas y evaluaremos la disponibilidad contigo.
              </p>
            )}
            {/* Lista de fechas comprometidas (referencia) */}
            {fechasOcupadas.length > 0 && (
              <p className="mt-1.5 text-[10px] text-foreground-muted leading-relaxed">
                <span className="font-semibold">Fechas comprometidas (referencia):</span>{' '}
                {fechasOcupadas.map(f =>
                  new Date(f + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
                ).join(' · ')}
              </p>
            )}
          </div>

          {/* Hora aproximada */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Hora aproximada del evento (opcional)
            </label>
            <input
              type="time"
              value={horaEvento}
              onChange={e => setHoraEvento(e.target.value)}
              className={INPUT}
            />
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Ciudad *
            </label>
            <input
              type="text"
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              placeholder="Ej: Quito, Guayaquil..."
              className={INPUT}
            />
          </div>

          {/* Tipo de evento */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Tipo de evento (opcional)</label>
            <input
              type="text"
              value={tipoEvento}
              onChange={e => setTipoEvento(e.target.value)}
              placeholder="Ej: Quinceañera, Matrimonio, Corporativo..."
              className={INPUT}
            />
          </div>

          {/* Presupuesto */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Presupuesto aproximado (opcional)
            </label>
            <input
              type="number"
              value={presupuesto}
              onChange={e => setPresupuesto(e.target.value)}
              placeholder="Ej: 2000"
              min="0"
              step="50"
              className={INPUT}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Notas adicionales (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              placeholder="Cuéntanos más sobre lo que necesitas..."
              className="w-full px-3 py-2.5 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* ── Datos de contacto ── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-500" /> Tus datos de contacto
          </p>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Ana García"
              className={INPUT}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tuemail@ejemplo.com"
              className={INPUT}
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> WhatsApp *
            </label>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={codigoPais}
                  onChange={e => setCodigoPais(e.target.value)}
                  className="h-11 pl-3 pr-7 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  {CODIGOS_PAIS.map(c => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.bandera} {c.codigo}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
              </div>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="0987654321"
                className={cn(INPUT, 'flex-1')}
              />
            </div>
          </div>
        </div>

        {/* Botón de envío */}
        <button
          onClick={enviando ? undefined : enviarSolicitud}
          disabled={enviando}
          className="w-full h-12 rounded-2xl bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-purple-600/30"
        >
          {enviando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando solicitud...</>
            : <><Send className="w-4 h-4" /> Enviar solicitud de cotización</>
          }
        </button>
        <p className="text-[11px] text-foreground-muted text-center">
          Al enviar, recibirás una respuesta vía WhatsApp con tu propuesta personalizada.
        </p>
      </div>
    </div>
  )
}
