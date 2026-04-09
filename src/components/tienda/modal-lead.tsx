'use client'

import { useState } from 'react'
import { Phone, X, Loader2, ShoppingCart } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

const CLAVE_LEAD = 'tienda_lead_ok'

export function yaCapturado(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(CLAVE_LEAD)
}

interface Props {
  onConfirmado: () => void
  onCerrar: () => void
  nombreProducto: string
}

export function ModalLead({ onConfirmado, onCerrar, nombreProducto }: Props) {
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    const tel = telefono.replace(/\D/g, '')
    if (tel.length < 7) { setError('Ingresa un número válido'); return }

    setGuardando(true)
    setError('')
    const supabase = crearClienteSupabase()

    // Upsert: si ya existe el teléfono no falla
    await supabase.from('leads').upsert({ telefono: tel }, { onConflict: 'telefono', ignoreDuplicates: true })

    localStorage.setItem(CLAVE_LEAD, '1')
    setGuardando(false)
    onConfirmado()
  }

  function omitir() {
    localStorage.setItem(CLAVE_LEAD, '1') // No volver a preguntar
    onConfirmado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <button onClick={onCerrar} className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <h3 className="text-base font-bold text-foreground">¡Casi listo!</h3>
          <p className="text-sm text-foreground-muted mt-1 leading-relaxed">
            Déjanos tu número para enviarte novedades y confirmarte el pedido de <strong className="text-foreground">{nombreProducto}</strong>.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center h-12 bg-background-subtle border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
              <div className="flex items-center gap-1.5 px-3 border-r border-border h-full flex-shrink-0">
                <Phone className="w-4 h-4 text-foreground-muted" />
                <span className="text-sm text-foreground-muted">+593</span>
              </div>
              <input
                type="tel"
                value={telefono}
                onChange={e => { setTelefono(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && guardar()}
                placeholder="0999999999"
                autoFocus
                className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none"
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}

            <button onClick={guardar} disabled={guardando}
              className="h-12 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60 transition-all">
              {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Continuar'}
            </button>

            <button onClick={omitir}
              className="text-xs text-foreground-muted hover:text-foreground text-center transition-colors py-1">
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
