'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  fechaInicio: string
  diasPago: number
  compacto?: boolean
}

interface Tiempo {
  dias: number
  horas: number
  minutos: number
  segundos: number
  vencido: boolean
  porcentaje: number // 0-100 de tiempo usado
}

function calcularTiempo(fechaInicio: string, diasPago: number): Tiempo {
  const inicio = new Date(fechaInicio).getTime()
  const fin = inicio + diasPago * 24 * 60 * 60 * 1000
  const ahora = Date.now()
  const restante = fin - ahora
  const total = fin - inicio

  if (restante <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0, vencido: true, porcentaje: 100 }
  }

  const porcentaje = Math.min(100, Math.round(((total - restante) / total) * 100))
  const dias = Math.floor(restante / (1000 * 60 * 60 * 24))
  const horas = Math.floor((restante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60))
  const segundos = Math.floor((restante % (1000 * 60)) / 1000)

  return { dias, horas, minutos, segundos, vencido: false, porcentaje }
}

export function ContadorPago({ fechaInicio, diasPago, compacto = false }: Props) {
  const [tiempo, setTiempo] = useState<Tiempo>(() => calcularTiempo(fechaInicio, diasPago))

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempo(fechaInicio, diasPago))
    }, 1000)
    return () => clearInterval(intervalo)
  }, [fechaInicio, diasPago])

  const urgente = tiempo.dias < 5 && !tiempo.vencido
  const advertencia = tiempo.dias < 10 && !tiempo.vencido && !urgente

  if (compacto) {
    // Versión compacta para el dashboard del admin
    return (
      <div className={cn(
        'rounded-2xl border p-4',
        tiempo.vencido ? 'bg-danger/10 border-danger/30' :
        urgente ? 'bg-warning/10 border-warning/30' :
        'bg-card border-card-border'
      )}>
        <div className="flex items-center gap-2 mb-3">
          {tiempo.vencido
            ? <AlertTriangle className="w-4 h-4 text-danger" />
            : urgente
            ? <AlertTriangle className="w-4 h-4 text-warning" />
            : <Clock className="w-4 h-4 text-primary" />
          }
          <p className="text-sm font-semibold text-foreground">
            {tiempo.vencido ? 'Período vencido — Contáctanos para renovar'
              : urgente ? '¡Próximo vencimiento!'
              : 'Tiempo restante del período'}
          </p>
        </div>

        {!tiempo.vencido && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { valor: tiempo.dias, etiqueta: 'días' },
              { valor: tiempo.horas, etiqueta: 'hrs' },
              { valor: tiempo.minutos, etiqueta: 'min' },
              { valor: tiempo.segundos, etiqueta: 'seg' },
            ].map(({ valor, etiqueta }) => (
              <div key={etiqueta} className={cn(
                'rounded-xl p-2 text-center',
                urgente ? 'bg-warning/10' : 'bg-background-subtle'
              )}>
                <p className={cn('text-xl font-bold tabular-nums', urgente ? 'text-warning' : 'text-foreground')}>
                  {String(valor).padStart(2, '0')}
                </p>
                <p className="text-[10px] text-foreground-muted">{etiqueta}</p>
              </div>
            ))}
          </div>
        )}

        {/* Barra de progreso */}
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              tiempo.vencido ? 'bg-danger' :
              urgente ? 'bg-warning' :
              advertencia ? 'bg-warning/70' : 'bg-primary'
            )}
            style={{ width: `${tiempo.porcentaje}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-[10px] text-foreground-muted">
            Inicio: {new Date(fechaInicio).toLocaleDateString('es-EC')}
          </p>
          <p className="text-[10px] text-foreground-muted">{tiempo.porcentaje}% usado</p>
        </div>
      </div>
    )
  }

  // Versión completa para superadmin
  return (
    <div className={cn(
      'rounded-xl border p-4',
      tiempo.vencido ? 'bg-danger/10 border-danger/30' :
      urgente ? 'bg-warning/10 border-warning/30' :
      'bg-background-subtle border-border'
    )}>
      <div className="flex items-center gap-2 mb-3">
        {tiempo.vencido
          ? <AlertTriangle className="w-4 h-4 text-danger" />
          : <Clock className="w-4 h-4 text-primary animate-pulse" />
        }
        <p className="text-xs font-semibold text-foreground">
          {tiempo.vencido ? 'PERÍODO VENCIDO' : 'Tiempo restante'}
        </p>
        {!tiempo.vencido && (
          <span className={cn(
            'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full',
            urgente ? 'bg-danger/10 text-danger' :
            advertencia ? 'bg-warning/10 text-warning' :
            'bg-success/10 text-success'
          )}>
            {urgente ? 'URGENTE' : advertencia ? 'PRONTO' : 'AL DÍA'}
          </span>
        )}
      </div>

      {tiempo.vencido ? (
        <p className="text-sm text-danger font-semibold">El período de {diasPago} días ha vencido</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { valor: tiempo.dias, etiqueta: 'días' },
            { valor: tiempo.horas, etiqueta: 'horas' },
            { valor: tiempo.minutos, etiqueta: 'min' },
            { valor: tiempo.segundos, etiqueta: 'seg' },
          ].map(({ valor, etiqueta }) => (
            <div key={etiqueta} className="bg-card rounded-lg p-2 text-center border border-border">
              <p className={cn(
                'text-lg font-bold tabular-nums leading-none',
                urgente ? 'text-danger' : advertencia ? 'text-warning' : 'text-foreground'
              )}>
                {String(valor).padStart(2, '0')}
              </p>
              <p className="text-[9px] text-foreground-muted mt-0.5">{etiqueta}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            tiempo.vencido ? 'bg-danger w-full' :
            urgente ? 'bg-danger' :
            advertencia ? 'bg-warning' : 'bg-primary'
          )}
          style={{ width: tiempo.vencido ? '100%' : `${tiempo.porcentaje}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <p className="text-[10px] text-foreground-muted">
          Vence: {new Date(new Date(fechaInicio).getTime() + diasPago * 24 * 60 * 60 * 1000).toLocaleDateString('es-EC')}
        </p>
        <p className="text-[10px] text-foreground-muted">{tiempo.porcentaje}% del período usado</p>
      </div>
    </div>
  )
}

// Versión mínima para el sidebar/header
export function IndicadorPago({ fechaInicio, diasPago }: { fechaInicio: string; diasPago: number }) {
  const [tiempo, setTiempo] = useState<Tiempo>(() => calcularTiempo(fechaInicio, diasPago))

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTiempo(calcularTiempo(fechaInicio, diasPago))
    }, 60000) // Actualiza cada minuto (suficiente para el indicador)
    return () => clearInterval(intervalo)
  }, [fechaInicio, diasPago])

  if (tiempo.vencido) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-danger/10 border border-danger/20">
        <AlertTriangle className="w-3 h-3 text-danger" />
        <span className="text-[10px] font-bold text-danger">VENCIDO</span>
      </div>
    )
  }

  if (tiempo.dias < 5) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning/10 border border-warning/20">
        <Clock className="w-3 h-3 text-warning" />
        <span className="text-[10px] font-bold text-warning">{tiempo.dias}d restantes</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/10 border border-success/20">
      <CheckCircle2 className="w-3 h-3 text-success" />
      <span className="text-[10px] font-bold text-success">{tiempo.dias}d restantes</span>
    </div>
  )
}
