'use client'

import { CierreCaja } from '@/types'
import { formatearPrecio } from '@/lib/utils'
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  cierres: CierreCaja[]
}

export function ListaCierres({ cierres }: Props) {
  if (cierres.length === 0) {
    return (
      <div className="py-10 text-center opacity-30 border-2 border-dashed border-border rounded-3xl">
        <Calendar className="w-10 h-10 mx-auto mb-3" />
        <p className="text-xs font-black uppercase tracking-widest">No hay historial disponible</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {cierres.map((c) => {
        const d = new Date(c.fecha + 'T12:00:00') // Para evitar desfases de zona horaria
        const mes = d.toLocaleDateString('es-EC', { month: 'short' }).toUpperCase()
        const dia = d.getDate()

        return (
          <div key={c.id} className="flex items-center gap-4 p-4 rounded-2xl bg-background-subtle border border-border group hover:border-primary/30 transition-all">
            {/* Fecha */}
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-primary leading-none">{mes}</span>
              <span className="text-lg font-black text-foreground leading-none">{dia}</span>
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-foreground">Total: {formatearPrecio(c.total_real)}</span>
                <span className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase",
                  c.diferencia === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                )}>
                  {c.diferencia === 0 ? 'Cuadrado' : 'Descuadre'}
                </span>
              </div>
              <p className="text-[10px] text-foreground-muted font-bold truncate mt-0.5">
                {c.notas || 'Sin observaciones'}
              </p>
            </div>

            {/* Icono de Estado */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              c.diferencia === 0 ? "text-emerald-500 bg-emerald-50" : "text-amber-500 bg-amber-50"
            )}>
              {c.diferencia === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>
        )
      })}
      
      <div className="pt-4 text-center">
        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
          Ver reporte completo
        </button>
      </div>
    </div>
  )
}
