'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, RefreshCw, CalendarDays, Clock, Tag, Users, ShoppingCart, Info } from 'lucide-react'
import Link from 'next/link'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { cn, formatearPrecio } from '@/lib/utils'

const schema = z.object({
  codigo:          z.string().min(3, 'Mínimo 3 caracteres').max(20, 'Máximo 20 caracteres')
                     .regex(/^[A-Z0-9_-]+$/, 'Solo mayúsculas, números, - y _'),
  tipo_descuento:  z.enum(['porcentaje', 'fijo']),
  valor_descuento: z.string().min(1, 'Requerido'),
  compra_minima:   z.string().optional(),
  max_usos:        z.string().optional(),
  inicia_en:       z.string().optional(),
  vence_en:        z.string().optional(),
  esta_activo:     z.boolean(),
})

type Campos = z.infer<typeof schema>

interface CuponExistente {
  id:              string
  codigo:          string
  tipo_descuento:  'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima:   number | null
  max_usos:        number | null
  usos_actuales:   number
  esta_activo:     boolean
  inicia_en:       string | null
  vence_en:        string | null
}

interface Props { cupon?: CuponExistente }

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function FormularioCupon({ cupon }: Props) {
  const router   = useRouter()
  const [guardando, setGuardando] = useState(false)
  const esEdicion = !!cupon

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Campos>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo:          cupon?.codigo ?? '',
      tipo_descuento:  cupon?.tipo_descuento ?? 'porcentaje',
      valor_descuento: cupon ? String(cupon.valor_descuento) : '',
      compra_minima:   cupon?.compra_minima ? String(cupon.compra_minima) : '',
      max_usos:        cupon?.max_usos ? String(cupon.max_usos) : '',
      inicia_en:       cupon?.inicia_en ? cupon.inicia_en.slice(0, 16) : '',
      vence_en:        cupon?.vence_en  ? cupon.vence_en.slice(0, 16)  : '',
      esta_activo:     cupon?.esta_activo ?? true,
    },
  })

  const tipo       = watch('tipo_descuento')
  const valorStr   = watch('valor_descuento')
  const iniciaSt   = watch('inicia_en')
  const venceSt    = watch('vence_en')
  const activo     = watch('esta_activo')
  const maxUsos    = watch('max_usos')
  const minCompra  = watch('compra_minima')
  const codigo     = watch('codigo')

  const valor = parseFloat(valorStr) || 0

  // Vista previa del estado que tendría el cupón
  function previewEstado(): { label: string; color: string } {
    if (!activo) return { label: 'Inactivo', color: 'bg-gray-100 text-gray-500 border-gray-200' }
    const now = new Date()
    if (iniciaSt && new Date(iniciaSt) > now) return { label: 'Programado', color: 'bg-blue-50 text-blue-600 border-blue-200' }
    if (venceSt && new Date(venceSt) < now) return { label: 'Vencido', color: 'bg-red-50 text-red-600 border-red-100' }
    return { label: 'Activo', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
  }
  const preview = previewEstado()

  function generarYAsignar() { setValue('codigo', generarCodigo()) }

  async function onSubmit(datos: Campos) {
    setGuardando(true)
    const val = parseFloat(datos.valor_descuento)
    if (datos.tipo_descuento === 'porcentaje' && (val <= 0 || val > 100)) {
      toast.error('El porcentaje debe ser entre 1 y 100')
      setGuardando(false)
      return
    }
    if (datos.inicia_en && datos.vence_en && new Date(datos.inicia_en) >= new Date(datos.vence_en)) {
      toast.error('La fecha de inicio debe ser anterior al vencimiento')
      setGuardando(false)
      return
    }

    const supabase = crearClienteSupabase()
    const payload = {
      codigo:          datos.codigo,
      tipo_descuento:  datos.tipo_descuento,
      valor_descuento: val,
      compra_minima:   datos.compra_minima ? parseFloat(datos.compra_minima) : null,
      max_usos:        datos.max_usos ? parseInt(datos.max_usos) : null,
      inicia_en:       datos.inicia_en ? new Date(datos.inicia_en).toISOString() : null,
      vence_en:        datos.vence_en  ? new Date(datos.vence_en).toISOString()  : null,
      esta_activo:     datos.esta_activo,
    }

    if (esEdicion) {
      const { error } = await supabase.from('cupones').update(payload).eq('id', cupon.id)
      if (error) {
        toast.error(error.message.includes('codigo') ? 'El código ya existe' : 'Error al guardar')
        setGuardando(false)
        return
      }
    } else {
      const { error } = await supabase.from('cupones').insert(payload)
      if (error) {
        toast.error(error.message.includes('codigo') ? 'El código ya existe' : 'Error al crear')
        setGuardando(false)
        return
      }
    }

    toast.success(esEdicion ? 'Cambios guardados' : 'Cupón creado correctamente')
    router.push('/admin/dashboard/cupones')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard/cupones"
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">
            {esEdicion ? 'Editar cupón' : 'Nuevo cupón'}
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {esEdicion ? cupon.codigo : 'Define el descuento y sus condiciones'}
          </p>
        </div>
        {/* Preview estado */}
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', preview.color)}>
          {preview.label}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Código */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-foreground-muted" /> Código del cupón *
          </label>
          <div className="flex gap-2">
            <input
              {...register('codigo')}
              onChange={e => setValue('codigo', e.target.value.toUpperCase())}
              placeholder="VERANO20"
              className="flex-1 h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={generarYAsignar} title="Generar código aleatorio"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {errors.codigo && <p className="text-xs text-danger">{errors.codigo.message}</p>}
          <p className="text-xs text-foreground-muted">Solo mayúsculas, números, guiones y guiones bajos</p>
        </div>

        {/* Tipo y valor */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-foreground">Tipo de descuento *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['porcentaje', 'fijo'] as const).map(t => (
              <label key={t} className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                tipo === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}>
                <input type="radio" {...register('tipo_descuento')} value={t} className="sr-only" />
                <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  tipo === t ? 'border-primary' : 'border-border')}>
                  {tipo === t && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t === 'porcentaje' ? '% Porcentaje' : '$ Monto fijo'}
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Valor {tipo === 'porcentaje' ? '(%)' : '($)'} *
            </label>
            <div className="flex items-center h-10 rounded-xl border border-input-border bg-input-bg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
              <span className="px-3 text-sm text-foreground-muted border-r border-input-border h-full flex items-center bg-background-subtle">
                {tipo === 'porcentaje' ? '%' : '$'}
              </span>
              <input
                {...register('valor_descuento')}
                type="number" step="0.01" min="0"
                max={tipo === 'porcentaje' ? '100' : undefined}
                placeholder={tipo === 'porcentaje' ? '20' : '5.00'}
                className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none"
              />
            </div>
            {errors.valor_descuento && <p className="text-xs text-danger">{errors.valor_descuento.message}</p>}
          </div>
        </div>

        {/* Vigencia — inicio y fin */}
        <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Período de vigencia</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Disponible desde
                <span className="text-foreground-muted font-normal">(opcional)</span>
              </label>
              <input
                {...register('inicia_en')}
                type="datetime-local"
                className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[10px] text-foreground-muted">Vacío = disponible de inmediato</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Vence el
                <span className="text-foreground-muted font-normal">(opcional)</span>
              </label>
              <input
                {...register('vence_en')}
                type="datetime-local"
                className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[10px] text-foreground-muted">Vacío = sin fecha de expiración</p>
            </div>
          </div>

          {/* Vista previa del rango */}
          {(iniciaSt || venceSt) && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background-subtle border border-border text-xs text-foreground-muted">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {iniciaSt ? formatFecha(iniciaSt) : 'Ahora mismo'}
                <span className="mx-1.5 font-bold text-foreground">→</span>
                {venceSt ? formatFecha(venceSt) : 'Sin límite'}
              </span>
            </div>
          )}
        </div>

        {/* Condiciones */}
        <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Condiciones opcionales</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-foreground-muted" /> Compra mínima ($)
            </label>
            <input
              {...register('compra_minima')}
              type="number" step="0.01" min="0"
              placeholder="Sin mínimo"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {minCompra && parseFloat(minCompra) > 0 && (
              <p className="text-[10px] text-foreground-muted">
                El cliente debe comprar al menos {formatearPrecio(parseFloat(minCompra))}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-foreground-muted" /> Máximo de usos
            </label>
            <input
              {...register('max_usos')}
              type="number" min="1"
              placeholder="Sin límite"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {maxUsos && parseInt(maxUsos) > 0 && (
              <p className="text-[10px] text-foreground-muted">
                El cupón se desactivará después de {maxUsos} uso{parseInt(maxUsos) !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Resumen visual */}
        {codigo && valor > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-0.5">Vista previa</p>
              <p className="text-sm font-black text-foreground font-mono tracking-widest">{codigo}</p>
              <p className="text-xs text-foreground-muted mt-0.5">
                {tipo === 'porcentaje' ? `${valor}% de descuento` : `${formatearPrecio(valor)} de descuento`}
                {minCompra && parseFloat(minCompra) > 0 ? ` · Min. ${formatearPrecio(parseFloat(minCompra))}` : ''}
                {maxUsos && parseInt(maxUsos) > 0 ? ` · ${maxUsos} usos máx.` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Estado + usos */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" {...register('esta_activo')} className="sr-only peer" />
              <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-foreground">{activo ? 'Activo' : 'Inactivo'}</span>
          </label>
          {esEdicion && (
            <p className="text-xs text-foreground-muted">
              {cupon.usos_actuales} uso{cupon.usos_actuales !== 1 ? 's' : ''} registrado{cupon.usos_actuales !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <button type="submit" disabled={guardando}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {guardando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear cupón'}</>
          }
        </button>
      </form>
    </div>
  )
}
