'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign, CreditCard, RefreshCw, ArrowRightLeft,
  Save, AlertTriangle, CheckCircle2, Calculator,
  Lock, TrendingUp, TrendingDown, Wallet
} from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import type { CierreCaja } from '@/types'

interface Totales {
  ingresos: {
    efectivo: number
    transferencia: number
    tarjeta: number
    paypal: number
    otros: number
    total: number
  }
  egresos: number
  efectivo_neto: number
  total: number
  efectivo: number
}

interface Props {
  totalesSistema: Totales
  fecha: string
  yaCerrado: boolean
  cierreExistente?: CierreCaja | null
}

export function PanelCierreCaja({ totalesSistema, fecha, yaCerrado, cierreExistente }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [efectivoReal, setEfectivoReal] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const realNum = parseFloat(efectivoReal) || 0
  const diferencia = realNum - totalesSistema.efectivo_neto

  async function ejecutarCierre() {
    if (!efectivoReal) {
      toast.error('Debes ingresar el monto de efectivo real contado')
      return
    }
    if (!confirm('¿Confirmar el cierre de caja para el día ' + fecha + '? Una vez cerrado no se podrá modificar.')) return

    setGuardando(true)
    const supabase = crearClienteSupabase()

    const { error } = await supabase.from('cierres_caja').insert({
      fecha,
      total_efectivo:      totalesSistema.efectivo_neto,
      total_transferencia: totalesSistema.ingresos.transferencia,
      total_tarjeta:       totalesSistema.ingresos.tarjeta,
      total_otros:         totalesSistema.ingresos.otros + totalesSistema.ingresos.paypal,
      total_sistema:       totalesSistema.total,
      total_real:          realNum + totalesSistema.ingresos.transferencia + totalesSistema.ingresos.tarjeta + totalesSistema.ingresos.paypal + totalesSistema.ingresos.otros,
      diferencia,
      notas:               notas.trim() || null,
      estado:              'cerrado'
    })

    if (error) {
      toast.error('Error al guardar el cierre: ' + error.message)
      setGuardando(false)
      return
    }

    toast.success('¡Caja cerrada exitosamente!')
    startTransition(() => router.refresh())
    setGuardando(false)
  }

  // ── Vista de cierre ya realizado ──────────────────────────────────────────
  if (yaCerrado && cierreExistente) {
    return (
      <div className="bg-card border border-card-border rounded-3xl p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <Lock className="w-12 h-12 text-emerald-500/10" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Resumen de Cierre</h2>
          <p className="text-xs text-foreground-muted font-bold uppercase tracking-widest mt-1">Día Finalizado</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-background-subtle border border-border">
            <p className="text-[10px] font-black text-foreground-muted uppercase mb-1">Total Sistema</p>
            <p className="text-xl font-black text-foreground">{formatearPrecio(cierreExistente.total_sistema)}</p>
          </div>
          <div className={cn(
            "p-4 rounded-2xl border",
            cierreExistente.diferencia === 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
          )}>
            <p className="text-[10px] font-black text-foreground-muted uppercase mb-1">Diferencia</p>
            <p className={cn("text-xl font-black", cierreExistente.diferencia === 0 ? "text-emerald-700" : "text-red-700")}>
              {formatearPrecio(cierreExistente.diferencia)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <span className="text-xs font-bold text-foreground-muted flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Efectivo (neto)</span>
            <span className="text-sm font-black">{formatearPrecio(cierreExistente.total_efectivo)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <span className="text-xs font-bold text-foreground-muted flex items-center gap-2"><ArrowRightLeft className="w-3.5 h-3.5" /> Transferencias</span>
            <span className="text-sm font-black">{formatearPrecio(cierreExistente.total_transferencia)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <span className="text-xs font-bold text-foreground-muted flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Tarjetas / Otros</span>
            <span className="text-sm font-black">{formatearPrecio(cierreExistente.total_tarjeta + (cierreExistente.total_otros ?? 0))}</span>
          </div>
        </div>

        {cierreExistente.notas && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 italic text-xs text-amber-800">
            " {cierreExistente.notas} "
          </div>
        )}

        <div className="pt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-foreground">Caja Cerrada</p>
            <p className="text-[10px] text-foreground-muted uppercase">Finalizado el {new Date(cierreExistente.creado_en).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista de cierre pendiente ─────────────────────────────────────────────
  return (
    <div className="bg-card border border-card-border rounded-3xl p-8 shadow-sm flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black text-foreground">Generar Cierre de Caja</h2>
        <p className="text-sm text-foreground-muted font-medium mt-1">Resumen del día y verificación de efectivo.</p>
      </div>

      {/* ── INGRESOS ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Ingresos del día
        </p>
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 hover:bg-background-subtle/50 transition-colors">
            <span className="text-xs font-semibold text-foreground-muted flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Efectivo
            </span>
            <span className="text-sm font-black text-foreground">{formatearPrecio(totalesSistema.ingresos.efectivo)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border hover:bg-background-subtle/50 transition-colors">
            <span className="text-xs font-semibold text-foreground-muted flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" /> Transferencias
            </span>
            <span className="text-sm font-black text-foreground">{formatearPrecio(totalesSistema.ingresos.transferencia)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border hover:bg-background-subtle/50 transition-colors">
            <span className="text-xs font-semibold text-foreground-muted flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Tarjetas
            </span>
            <span className="text-sm font-black text-foreground">{formatearPrecio(totalesSistema.ingresos.tarjeta)}</span>
          </div>
          {totalesSistema.ingresos.paypal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border hover:bg-background-subtle/50 transition-colors">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-[#0070ba]" /> PayPal
              </span>
              <span className="text-sm font-black text-foreground">{formatearPrecio(totalesSistema.ingresos.paypal)}</span>
            </div>
          )}
          {totalesSistema.ingresos.otros > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border hover:bg-background-subtle/50 transition-colors">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-gray-400" /> Otros
              </span>
              <span className="text-sm font-black text-foreground">{formatearPrecio(totalesSistema.ingresos.otros)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-emerald-50/60">
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wide">Total ingresos</span>
            <span className="text-base font-black text-emerald-700">{formatearPrecio(totalesSistema.ingresos.total)}</span>
          </div>
        </div>
      </div>

      {/* ── EGRESOS ───────────────────────────────────────── */}
      {totalesSistema.egresos > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Egresos en efectivo
          </p>
          <div className="rounded-2xl border border-red-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-red-50/50">
              <span className="text-xs font-semibold text-red-600 flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5" /> Gastos / salidas de caja
              </span>
              <span className="text-sm font-black text-red-600">-{formatearPrecio(totalesSistema.egresos)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── BALANCE ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-primary" /> Balance del día
        </p>
        <div className="rounded-2xl border border-primary/20 overflow-hidden bg-primary/3">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold text-foreground-muted">Efectivo neto (ingresos − egresos)</span>
            <span className={cn("text-sm font-black", totalesSistema.efectivo_neto >= 0 ? "text-foreground" : "text-red-600")}>
              {formatearPrecio(totalesSistema.efectivo_neto)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10">
            <span className="text-xs font-semibold text-foreground-muted">Digital (transf. + tarjeta + PayPal)</span>
            <span className="text-sm font-black text-foreground">
              {formatearPrecio(totalesSistema.ingresos.transferencia + totalesSistema.ingresos.tarjeta + totalesSistema.ingresos.paypal)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-t border-primary/20 bg-primary/5">
            <span className="text-xs font-black text-primary uppercase tracking-wide">TOTAL NETO DEL DÍA</span>
            <span className="text-lg font-black text-primary">{formatearPrecio(totalesSistema.total)}</span>
          </div>
        </div>
      </div>

      {/* ── INPUT EFECTIVO REAL ───────────────────────────── */}
      <div className="bg-background-subtle border border-border rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-[10px] font-black text-foreground-muted uppercase tracking-widest mb-2">
            Efectivo físico contado en caja
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-primary">$</span>
            <input
              type="number"
              step="0.01"
              value={efectivoReal}
              onChange={e => setEfectivoReal(e.target.value)}
              placeholder="0.00"
              className="w-full h-14 pl-10 pr-4 rounded-xl border border-input-border bg-card text-xl font-black focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <p className="text-[10px] text-foreground-muted mt-1.5">
            Sistema espera: <strong>{formatearPrecio(totalesSistema.efectivo_neto)}</strong> en efectivo
          </p>
        </div>

        {efectivoReal && (
          <div className={cn(
            "p-4 rounded-xl border",
            diferencia === 0 ? "bg-emerald-50 border-emerald-100" :
            diferencia > 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-tight">Diferencia de efectivo:</span>
              <span className={cn("text-lg font-black",
                diferencia === 0 ? "text-emerald-700" :
                diferencia > 0 ? "text-blue-700" : "text-red-700"
              )}>
                {diferencia > 0 ? '+' : ''}{formatearPrecio(diferencia)}
              </span>
            </div>
            {diferencia !== 0 && (
              <p className="text-[10px] font-bold mt-1 opacity-70 uppercase tracking-tighter flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── NOTAS ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-foreground-muted uppercase tracking-widest">Observaciones</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Ej: faltante por cambio, propinas, etc..."
          className="w-full h-24 p-4 rounded-2xl border border-input-border bg-card text-sm focus:outline-none resize-none"
        />
      </div>

      <button
        onClick={ejecutarCierre}
        disabled={guardando || !efectivoReal}
        className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
      >
        {guardando ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
        EFECTUAR CIERRE DE CAJA
      </button>

      <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-foreground-muted uppercase tracking-widest opacity-50">
        <Calculator className="w-3 h-3" /> Sistema de Control Contable GuambraShop
      </div>
    </div>
  )
}
