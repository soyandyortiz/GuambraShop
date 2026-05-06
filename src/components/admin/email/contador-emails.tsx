'use client'

import { AlertTriangle, CheckCircle2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProveedorEmail } from '@/types'

interface Props {
  proveedor: ProveedorEmail
  enviosHoy: number
  enviosMes: number
  compacto?: boolean
}

interface Limite {
  dia: number
  mes: number | null
  notaDia: string
  notaMes?: string
}

const LIMITES: Record<ProveedorEmail, Limite> = {
  gmail: {
    dia:     500,
    mes:     null,
    notaDia: 'Límite Gmail gratuito. Con Google Workspace el límite sube a 2 000/día.',
  },
  smtp: {
    dia:     200,
    mes:     null,
    notaDia: 'Límite estimado conservador. Verifica el límite real con tu proveedor de hosting.',
  },
  resend: {
    dia:     100,
    mes:     3000,
    notaDia: 'Plan gratuito Resend.',
    notaMes: 'Plan gratuito Resend. Los planes de pago tienen mayor capacidad.',
  },
}

function MiniBar({ valor, limite }: { valor: number; limite: number }) {
  const pct     = Math.min((valor / limite) * 100, 100)
  const critico = pct >= 90
  const alerta  = pct >= 75
  return (
    <div className="flex-1 min-w-0">
      <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            critico ? 'bg-red-500' : alerta ? 'bg-amber-400' : 'bg-emerald-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BarraProgreso({ valor, limite, label }: { valor: number; limite: number; label: string }) {
  const pct     = Math.min((valor / limite) * 100, 100)
  const critico = pct >= 90
  const alerta  = pct >= 75

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className={cn(
          'text-xs font-bold tabular-nums',
          critico ? 'text-red-600' : alerta ? 'text-amber-600' : 'text-foreground-muted'
        )}>
          {valor} <span className="font-normal text-foreground-muted">/ {limite}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-background-subtle overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            critico ? 'bg-red-500' : alerta ? 'bg-amber-400' : 'bg-emerald-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-foreground-muted mt-1">
        {pct >= 100 ? '⛔ Límite alcanzado' : `${Math.round(pct)}% usado · ${limite - valor} restantes`}
      </p>
    </div>
  )
}

export function ContadorEmails({ proveedor, enviosHoy, enviosMes, compacto }: Props) {
  const lim      = LIMITES[proveedor]
  const pctDia   = (enviosHoy / lim.dia) * 100
  const pctMes   = lim.mes ? (enviosMes / lim.mes) * 100 : 0
  const hayAlerta = pctDia >= 75 || (lim.mes !== null && pctMes >= 75)
  const esCritico = pctDia >= 90 || (lim.mes !== null && pctMes >= 90)

  const nombreProveedor = proveedor === 'gmail' ? 'Gmail SMTP' : proveedor === 'smtp' ? 'SMTP propio' : 'Resend'

  /* ── Modo compacto: franja horizontal ── */
  if (compacto) {
    return (
      <div className={cn(
        'rounded-xl border px-4 py-3 flex items-center gap-4 flex-wrap',
        esCritico  ? 'bg-red-50 border-red-200'
        : hayAlerta ? 'bg-amber-50 border-amber-200'
        : 'bg-card border-border'
      )}>
        {/* Icono + label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Mail className={cn('w-4 h-4', esCritico ? 'text-red-600' : hayAlerta ? 'text-amber-600' : 'text-primary')} />
          <span className="text-xs font-semibold text-foreground">Email hoy</span>
          <span className="text-[10px] text-foreground-muted">({nombreProveedor})</span>
        </div>

        {/* Barra diaria */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <MiniBar valor={enviosHoy} limite={lim.dia} />
          <span className={cn(
            'text-xs font-bold tabular-nums flex-shrink-0',
            pctDia >= 90 ? 'text-red-600' : pctDia >= 75 ? 'text-amber-600' : 'text-foreground-muted'
          )}>
            {enviosHoy}/{lim.dia}
          </span>
        </div>

        {/* Barra mensual (solo Resend) */}
        {lim.mes && (
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <span className="text-[10px] text-foreground-muted flex-shrink-0">Este mes</span>
            <MiniBar valor={enviosMes} limite={lim.mes} />
            <span className={cn(
              'text-xs font-bold tabular-nums flex-shrink-0',
              pctMes >= 90 ? 'text-red-600' : pctMes >= 75 ? 'text-amber-600' : 'text-foreground-muted'
            )}>
              {enviosMes}/{lim.mes}
            </span>
          </div>
        )}

        {/* Estado */}
        {esCritico ? (
          <div className="flex items-center gap-1 text-red-600 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Límite alcanzado</span>
          </div>
        ) : hayAlerta ? (
          <div className="flex items-center gap-1 text-amber-600 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Cerca del límite</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Normal</span>
          </div>
        )}
      </div>
    )
  }

  /* ── Modo normal: card completa (Config. Email) ── */
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Uso de emails</p>
          <p className="text-[11px] text-foreground-muted capitalize">{nombreProveedor}</p>
        </div>
        {!hayAlerta && (
          <div className="ml-auto flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">Normal</span>
          </div>
        )}
      </div>

      {/* Alerta si se acerca al límite */}
      {hayAlerta && (
        <div className={cn(
          'flex items-start gap-2.5 rounded-xl px-3 py-3 border',
          esCritico ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        )}>
          <AlertTriangle className={cn('w-4 h-4 flex-shrink-0 mt-0.5', esCritico ? 'text-red-600' : 'text-amber-600')} />
          <div>
            <p className={cn('text-xs font-bold', esCritico ? 'text-red-800' : 'text-amber-800')}>
              {pctDia >= 100 ? 'Límite diario alcanzado — los emails no se enviarán' : 'Te estás acercando al límite'}
            </p>
            <p className={cn('text-[11px] mt-0.5 leading-relaxed', esCritico ? 'text-red-700' : 'text-amber-700')}>
              {esCritico
                ? 'Considera pausar el envío automático o cambiar a un plan de pago para evitar cortes.'
                : 'Supervisa el uso. Si se supera el límite el proveedor bloqueará los envíos temporalmente.'}
            </p>
          </div>
        </div>
      )}

      {/* Barras de progreso */}
      <div className="space-y-4">
        <BarraProgreso valor={enviosHoy} limite={lim.dia} label="Enviados hoy" />
        {lim.mes && (
          <BarraProgreso valor={enviosMes} limite={lim.mes} label="Enviados este mes" />
        )}
      </div>

      {/* Nota del proveedor */}
      <p className="text-[10px] text-foreground-muted border-t border-border pt-3 leading-relaxed">
        ⓘ {pctMes >= 75 && lim.notaMes ? lim.notaMes : lim.notaDia}
      </p>
    </div>
  )
}
