'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn } from '@/lib/utils'
import { imprimirTicket } from '@/lib/ticket'

interface Props {
  anchoPapel: '58' | '80'
  textoPie: string | null
  nombreTienda: string
  ruc: string | null
  direccion: string | null
  whatsapp: string | null
  simboloMoneda: string
}

export function FormularioConfigImpresion({
  anchoPapel: initAncho,
  textoPie: initPie,
  nombreTienda,
  ruc,
  direccion,
  whatsapp,
  simboloMoneda,
}: Props) {
  const [anchoPapel, setAnchoPapel] = useState<'58' | '80'>(initAncho)
  const [textoPie, setTextoPie]     = useState(initPie ?? '¡Gracias por su compra!')
  const [guardando, setGuardando]   = useState(false)

  async function guardar() {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ ticket_ancho_papel: anchoPapel, ticket_texto_pie: textoPie || null })
      .not('id', 'is', null)
    setGuardando(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Configuración de impresión guardada')
  }

  function verPrevisualizacion() {
    imprimirTicket(
      {
        numero_orden:    'DEMO-001',
        creado_en:       new Date().toISOString(),
        nombres:         'Juan Pérez',
        tipo:            'local',
        forma_pago:      'efectivo',
        items: [
          { nombre: 'Producto de ejemplo', cantidad: 2, precio: 15.00, subtotal: 30.00 },
          { nombre: 'Otro producto largo en nombre', cantidad: 1, precio: 8.50, subtotal: 8.50 },
        ],
        subtotal:        38.50,
        descuento_cupon: 0,
        costo_envio:     0,
        total:           38.50,
      },
      { nombreTienda, ruc, direccion, whatsapp, simboloMoneda, anchoPapel, textoPie: textoPie || null },
    )
  }

  return (
    <div className="space-y-6">

      {/* Ancho de papel */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Ancho del papel</p>
        <div className="grid grid-cols-2 gap-3">
          {(['58', '80'] as const).map(ancho => (
            <button
              key={ancho}
              type="button"
              onClick={() => setAnchoPapel(ancho)}
              className={cn(
                'h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all',
                anchoPapel === ancho
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-foreground-muted hover:border-primary/40',
              )}
            >
              <Printer className="w-5 h-5" />
              <span className="text-lg font-black">{ancho}mm</span>
              <span className="text-[10px] font-medium">
                {ancho === '58' ? 'Compacto' : 'Estándar'}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-foreground-muted">
          Mide el ancho de tu rollo de papel para seleccionar el tamaño correcto.
        </p>
      </div>

      {/* Texto del pie */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Texto del pie de ticket</label>
        <textarea
          value={textoPie}
          onChange={e => setTextoPie(e.target.value)}
          placeholder="¡Gracias por su compra!"
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-foreground-muted">Aparece al final de cada ticket impreso. Puede ser un mensaje de agradecimiento, redes sociales, etc.</p>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={verPrevisualizacion}
          className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-foreground-muted hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all"
        >
          <Printer className="w-4 h-4" /> Previsualizar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60 hover:bg-primary-hover transition-colors"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

    </div>
  )
}
