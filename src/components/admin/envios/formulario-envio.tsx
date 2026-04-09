'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

// Provincias del Ecuador
const PROVINCIAS_EC = [
  'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi',
  'El Oro', 'Esmeraldas', 'Galápagos', 'Guayas', 'Imbabura', 'Loja',
  'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza',
  'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas',
  'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe',
]

const EMPRESAS_COMUNES = ['Servientrega', 'Speed', 'Laar', 'DHL', 'FedEx', 'Tramaco', 'Coordinadora', 'Propia']

const schema = z.object({
  provincia: z.string().min(2, 'Selecciona una provincia'),
  ciudad: z.string().optional(),
  empresa_envio: z.string().min(2, 'Requerido'),
  precio: z.string().min(1, 'Requerido'),
  tiempo_entrega: z.string().optional(),
  esta_activa: z.boolean(),
  orden: z.string(),
})

type Campos = z.infer<typeof schema>

interface ZonaExistente {
  id: string
  provincia: string
  ciudad: string | null
  empresa_envio: string
  precio: number
  tiempo_entrega: string | null
  esta_activa: boolean
  orden: number
}

interface Props { zona?: ZonaExistente }

export function FormularioEnvio({ zona }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [empresaPersonal, setEmpresaPersonal] = useState(
    zona ? !EMPRESAS_COMUNES.includes(zona.empresa_envio) : false
  )
  const esEdicion = !!zona

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Campos>({
    resolver: zodResolver(schema),
    defaultValues: {
      provincia: zona?.provincia ?? '',
      ciudad: zona?.ciudad ?? '',
      empresa_envio: zona?.empresa_envio ?? '',
      precio: zona ? String(zona.precio) : '',
      tiempo_entrega: zona?.tiempo_entrega ?? '',
      esta_activa: zona?.esta_activa ?? true,
      orden: String(zona?.orden ?? 0),
    },
  })

  async function onSubmit(datos: Campos) {
    setGuardando(true)
    const supabase = crearClienteSupabase()

    const payload = {
      provincia: datos.provincia,
      ciudad: datos.ciudad || null,
      empresa_envio: datos.empresa_envio,
      precio: parseFloat(datos.precio),
      tiempo_entrega: datos.tiempo_entrega || null,
      esta_activa: datos.esta_activa,
      orden: parseInt(datos.orden) || 0,
    }

    if (esEdicion) {
      const { error } = await supabase.from('zonas_envio').update(payload).eq('id', zona.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      toast.success('Cambios guardados correctamente')
    } else {
      const { error } = await supabase.from('zonas_envio').insert(payload)
      if (error) { toast.error('Error al crear'); setGuardando(false); return }
      toast.success('Cambios guardados correctamente')
    }

    router.push('/admin/dashboard/envios')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard/envios"
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {esEdicion ? 'Editar zona de envío' : 'Nueva zona de envío'}
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {esEdicion ? `${zona.provincia}${zona.ciudad ? ` · ${zona.ciudad}` : ''}` : 'Define el destino y el costo'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Provincia */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Provincia *</label>
          <select {...register('provincia')}
            className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Seleccionar provincia</option>
            {PROVINCIAS_EC.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.provincia && <p className="text-xs text-danger">{errors.provincia.message}</p>}
        </div>

        {/* Ciudad */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Ciudad</label>
          <input {...register('ciudad')} placeholder="Dejar vacío = toda la provincia"
            className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <p className="text-xs text-foreground-muted">Si solo haces envíos a una ciudad específica de la provincia</p>
        </div>

        {/* Empresa */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Empresa de envío *</label>
          {!empresaPersonal ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-2">
                {EMPRESAS_COMUNES.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setValue('empresa_envio', e)}
                    className={`h-9 rounded-xl border text-xs font-medium transition-all ${
                      watch('empresa_envio') === e
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-foreground-muted hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setEmpresaPersonal(true); setValue('empresa_envio', '') }}
                className="text-xs text-primary hover:underline text-left">
                + Otra empresa
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input {...register('empresa_envio')} placeholder="Nombre de la empresa"
                className="flex-1 h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <button type="button" onClick={() => { setEmpresaPersonal(false); setValue('empresa_envio', '') }}
                className="h-10 px-3 rounded-xl border border-border text-xs text-foreground-muted hover:text-foreground transition-all">
                Cancelar
              </button>
            </div>
          )}
          {errors.empresa_envio && <p className="text-xs text-danger">{errors.empresa_envio.message}</p>}
        </div>

        {/* Precio y Tiempo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Precio ($) *</label>
            <div className="flex items-center h-10 rounded-xl border border-input-border bg-input-bg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
              <span className="px-3 text-sm text-foreground-muted border-r border-input-border h-full flex items-center">$</span>
              <input {...register('precio')} type="number" step="0.01" min="0" placeholder="5.00"
                className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none" />
            </div>
            {errors.precio && <p className="text-xs text-danger">{errors.precio.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Tiempo de entrega</label>
            <input {...register('tiempo_entrega')} placeholder="1-3 días hábiles"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Sugerencias de tiempo */}
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {['24 horas', '1-2 días', '2-3 días', '3-5 días'].map(t => (
            <button key={t} type="button"
              onClick={() => setValue('tiempo_entrega', t)}
              className="px-2.5 py-1 rounded-lg border border-border text-xs text-foreground-muted hover:border-primary/40 hover:text-foreground transition-all">
              {t}
            </button>
          ))}
        </div>

        {/* Orden y Estado */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Orden</label>
            <input {...register('orden')} type="number" min="0" placeholder="0"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Estado</label>
            <label className="flex items-center gap-2 h-10 cursor-pointer">
              <div className="relative">
                <input type="checkbox" {...register('esta_activa')} className="sr-only peer" />
                <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-foreground">{watch('esta_activa') ? 'Activa' : 'Inactiva'}</span>
            </label>
          </div>
        </div>

        {/* Botón */}
        <button type="submit" disabled={guardando}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {guardando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear zona'}</>
          }
        </button>
      </form>
    </div>
  )
}
