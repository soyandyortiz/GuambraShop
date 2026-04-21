'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

const schema = z.object({
  codigo: z.string().min(3, 'Mínimo 3 caracteres').max(20, 'Máximo 20 caracteres')
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayúsculas, números, guiones y guiones bajos'),
  tipo_descuento: z.enum(['porcentaje', 'fijo']),
  valor_descuento: z.string().min(1, 'Requerido'),
  compra_minima: z.string().optional(),
  max_usos: z.string().optional(),
  vence_en: z.string().optional(),
  esta_activo: z.boolean(),
})

type Campos = z.infer<typeof schema>

interface CuponExistente {
  id: string
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima: number | null
  max_usos: number | null
  usos_actuales: number
  esta_activo: boolean
  vence_en: string | null
}

interface Props { cupon?: CuponExistente }

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function FormularioCupon({ cupon }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const esEdicion = !!cupon

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Campos>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: cupon?.codigo ?? '',
      tipo_descuento: cupon?.tipo_descuento ?? 'porcentaje',
      valor_descuento: cupon ? String(cupon.valor_descuento) : '',
      compra_minima: cupon?.compra_minima ? String(cupon.compra_minima) : '',
      max_usos: cupon?.max_usos ? String(cupon.max_usos) : '',
      vence_en: cupon?.vence_en ? cupon.vence_en.slice(0, 16) : '',
      esta_activo: cupon?.esta_activo ?? true,
    },
  })

  const tipo = watch('tipo_descuento')

  function generarYAsignar() {
    setValue('codigo', generarCodigo())
  }

  async function onSubmit(datos: Campos) {
    setGuardando(true)
    const supabase = crearClienteSupabase()

    const valor = parseFloat(datos.valor_descuento)
    if (datos.tipo_descuento === 'porcentaje' && (valor <= 0 || valor > 100)) {
      toast.error('El porcentaje debe ser entre 1 y 100')
      setGuardando(false)
      return
    }

    const payload = {
      codigo: datos.codigo,
      tipo_descuento: datos.tipo_descuento,
      valor_descuento: valor,
      compra_minima: datos.compra_minima ? parseFloat(datos.compra_minima) : null,
      max_usos: datos.max_usos ? parseInt(datos.max_usos) : null,
      vence_en: datos.vence_en ? new Date(datos.vence_en).toISOString() : null,
      esta_activo: datos.esta_activo,
    }

    if (esEdicion) {
      const { error } = await supabase.from('cupones').update(payload).eq('id', cupon.id)
      if (error) {
        toast.error(error.message.includes('codigo') ? 'El código ya existe' : 'Error al guardar')
        setGuardando(false)
        return
      }
      toast.success('Cambios guardados correctamente')
    } else {
      const { error } = await supabase.from('cupones').insert(payload)
      if (error) {
        toast.error(error.message.includes('codigo') ? 'El código ya existe' : 'Error al crear')
        setGuardando(false)
        return
      }
      toast.success('Cambios guardados correctamente')
    }

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
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {esEdicion ? 'Editar cupón' : 'Nuevo cupón'}
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {esEdicion ? cupon.codigo : 'Define el descuento y sus condiciones'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Código */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Código *</label>
          <div className="flex gap-2">
            <input
              {...register('codigo')}
              onChange={e => setValue('codigo', e.target.value.toUpperCase())}
              placeholder="VERANO20"
              className="flex-1 h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={generarYAsignar}
              title="Generar código aleatorio"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {errors.codigo && <p className="text-xs text-danger">{errors.codigo.message}</p>}
          <p className="text-xs text-foreground-muted">Solo mayúsculas, números, - y _</p>
        </div>

        {/* Tipo y valor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Tipo de descuento *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['porcentaje', 'fijo'] as const).map(t => (
              <label key={t} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                tipo === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}>
                <input type="radio" {...register('tipo_descuento')} value={t} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  tipo === t ? 'border-primary' : 'border-border'
                }`}>
                  {tipo === t && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm font-medium text-foreground capitalize">
                  {t === 'porcentaje' ? '% Porcentaje' : '$ Monto fijo'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            Valor del descuento * {tipo === 'porcentaje' ? '(%)' : '($)'}
          </label>
          <div className="flex items-center h-10 rounded-xl border border-input-border bg-input-bg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
            <span className="px-3 text-sm text-foreground-muted border-r border-input-border h-full flex items-center">
              {tipo === 'porcentaje' ? '%' : '$'}
            </span>
            <input
              {...register('valor_descuento')}
              type="number"
              step="0.01"
              min="0"
              max={tipo === 'porcentaje' ? '100' : undefined}
              placeholder={tipo === 'porcentaje' ? '20' : '5.00'}
              className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none"
            />
          </div>
          {errors.valor_descuento && <p className="text-xs text-danger">{errors.valor_descuento.message}</p>}
        </div>

        {/* Condiciones */}
        <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">Condiciones opcionales</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Compra mínima ($)</label>
            <input
              {...register('compra_minima')}
              type="number"
              step="0.01"
              min="0"
              placeholder="Sin mínimo"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Máximo de usos</label>
            <input
              {...register('max_usos')}
              type="number"
              min="1"
              placeholder="Sin límite"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Fecha y hora de vencimiento</label>
            <input
              {...register('vence_en')}
              type="datetime-local"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-foreground-muted">Deja vacío si el cupón no tiene límite de tiempo</p>
          </div>
        </div>

        {/* Estado + info usos si es edición */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input type="checkbox" {...register('esta_activo')} className="sr-only peer" />
              <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm text-foreground">
              {watch('esta_activo') ? 'Activo' : 'Inactivo'}
            </span>
          </label>
          {esEdicion && (
            <p className="text-xs text-foreground-muted">
              {cupon.usos_actuales} uso{cupon.usos_actuales !== 1 ? 's' : ''} registrado{cupon.usos_actuales !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Botón */}
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
