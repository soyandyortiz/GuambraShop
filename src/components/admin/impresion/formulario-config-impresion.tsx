'use client'

import { useState } from 'react'
import { Printer, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn } from '@/lib/utils'
import { imprimirTicket } from '@/lib/ticket'

interface Props {
  anchoPapel: '58' | '80'
  linea1: string | null
  linea2: string | null
  linea3: string | null
  linea4: string | null
  pie1: string | null
  pie2: string | null
  mostrarPrecioUnit: boolean
  nombreTienda: string
  simboloMoneda: string
}

function CampoLinea({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold text-foreground-muted/60 uppercase tracking-widest w-14 flex-shrink-0 text-right">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Vacío — no aparece en el ticket'}
        className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  )
}

export function FormularioConfigImpresion({
  anchoPapel: initAncho,
  linea1: initL1, linea2: initL2, linea3: initL3, linea4: initL4,
  pie1: initP1, pie2: initP2,
  mostrarPrecioUnit: initMPU,
  nombreTienda, simboloMoneda,
}: Props) {
  const [anchoPapel, setAnchoPapel]       = useState<'58' | '80'>(initAncho)
  const [linea1, setLinea1]               = useState(initL1 ?? '')
  const [linea2, setLinea2]               = useState(initL2 ?? '')
  const [linea3, setLinea3]               = useState(initL3 ?? '')
  const [linea4, setLinea4]               = useState(initL4 ?? '')
  const [pie1, setPie1]                   = useState(initP1 ?? '¡Gracias por su compra!')
  const [pie2, setPie2]                   = useState(initP2 ?? '')
  const [mostrarPrecioUnit, setMPU]       = useState(initMPU)
  const [guardando, setGuardando]         = useState(false)

  async function guardar() {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({
        ticket_ancho_papel:          anchoPapel,
        ticket_linea_1:              linea1.trim() || null,
        ticket_linea_2:              linea2.trim() || null,
        ticket_linea_3:              linea3.trim() || null,
        ticket_linea_4:              linea4.trim() || null,
        ticket_texto_pie:            pie1.trim()   || null,
        ticket_pie_2:                pie2.trim()   || null,
        ticket_mostrar_precio_unit:  mostrarPrecioUnit,
      })
      .not('id', 'is', null)
    setGuardando(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Configuración de impresión guardada')
  }

  function previsualizacion() {
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
      {
        nombreTienda,
        simboloMoneda,
        anchoPapel,
        linea1: linea1.trim() || null,
        linea2: linea2.trim() || null,
        linea3: linea3.trim() || null,
        linea4: linea4.trim() || null,
        pie1:   pie1.trim()   || null,
        pie2:   pie2.trim()   || null,
        mostrarPrecioUnit,
      },
    )
  }

  return (
    <div className="space-y-7">

      {/* Tamaño de papel */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Tamaño de papel</p>
        <div className="grid grid-cols-2 gap-3">
          {(['58', '80'] as const).map(ancho => (
            <button
              key={ancho}
              type="button"
              onClick={() => setAnchoPapel(ancho)}
              className={cn(
                'h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all',
                anchoPapel === ancho
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-foreground-muted hover:border-primary/40',
              )}
            >
              <Printer className="w-5 h-5" />
              <span className="text-lg font-black">{ancho}mm</span>
              <span className="text-[10px] font-medium">{ancho === '58' ? 'Compacto' : 'Estándar'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Encabezado */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Encabezado del ticket</p>
          <p className="text-xs text-foreground-muted mt-0.5">
            Aparecen debajo del nombre de tu tienda. Deja vacío para omitir esa línea.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-subtle/40 p-4 space-y-2.5">
          {/* Nombre de tienda — solo lectura */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-foreground-muted/60 uppercase tracking-widest w-14 flex-shrink-0 text-right">
              Nombre
            </span>
            <div className="flex-1 h-9 rounded-lg border border-border/50 bg-background-subtle px-3 flex items-center text-sm text-foreground-muted">
              {nombreTienda.toUpperCase()}
              <span className="ml-2 text-[9px] text-foreground-muted/50">(fijo)</span>
            </div>
          </div>

          <CampoLinea label="Línea 1" value={linea1} onChange={setLinea1} placeholder="Ej: RUC: 0602153520001" />
          <CampoLinea label="Línea 2" value={linea2} onChange={setLinea2} placeholder="Ej: Tel: 0983415042" />
          <CampoLinea label="Línea 3" value={linea3} onChange={setLinea3} placeholder="Ej: Av. Principal 123, Riobamba" />
          <CampoLinea label="Línea 4" value={linea4} onChange={setLinea4} placeholder="Ej: Instagram: @chakanaecuador" />
        </div>
      </div>

      {/* Opciones de items */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Columnas de productos</p>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setMPU(!mostrarPrecioUnit)}
            className={cn(
              'w-10 h-6 rounded-full relative transition-colors flex-shrink-0',
              mostrarPrecioUnit ? 'bg-primary' : 'bg-border',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-1 transition-all',
              mostrarPrecioUnit ? 'left-5' : 'left-1',
            )} />
          </div>
          <div>
            <p className="text-sm text-foreground">Mostrar precio unitario</p>
            <p className="text-xs text-foreground-muted">
              {mostrarPrecioUnit
                ? 'Muestra: 2x  $15.00  $30.00'
                : 'Muestra: 2x  $30.00'}
            </p>
          </div>
        </label>
      </div>

      {/* Pie */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Pie del ticket</p>
          <p className="text-xs text-foreground-muted mt-0.5">
            Aparece al final del ticket. Deja vacío para omitir.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background-subtle/40 p-4 space-y-2.5">
          <CampoLinea label="Línea 1" value={pie1} onChange={setPie1} placeholder="Ej: ¡Gracias por su compra!" />
          <CampoLinea label="Línea 2" value={pie2} onChange={setPie2} placeholder="Ej: Síguenos en Instagram: @chakana" />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={previsualizacion}
          className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-foreground-muted hover:border-primary/50 hover:text-primary flex items-center justify-center gap-2 transition-all"
        >
          <Eye className="w-4 h-4" /> Previsualizar
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
