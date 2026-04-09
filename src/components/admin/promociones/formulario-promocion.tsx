'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, LayoutTemplate } from 'lucide-react'
import Link from 'next/link'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { SubidorImagenes } from '@/components/ui/subidor-imagenes'
import { cn, formatearPrecio } from '@/lib/utils'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  descripcion: z.string().optional(),
  precio: z.string().optional(),
  formato_imagen: z.enum(['cuadrado', 'horizontal', 'vertical']),
  mensaje_whatsapp: z.string().min(5, 'Mínimo 5 caracteres'),
  esta_activa: z.boolean(),
  inicia_en: z.string().optional(),
  termina_en: z.string().optional(),
})

type Campos = z.infer<typeof schema>

interface PromocionExistente {
  id: string
  nombre: string
  descripcion: string | null
  precio: number | null
  imagen_url: string
  formato_imagen: 'cuadrado' | 'horizontal' | 'vertical'
  mensaje_whatsapp: string
  esta_activa: boolean
  inicia_en: string | null
  termina_en: string | null
}

interface Props { promocion?: PromocionExistente }

const FORMATOS = [
  { value: 'cuadrado', label: 'Cuadrado', ratio: '1:1', clase: 'aspect-square w-12' },
  { value: 'horizontal', label: 'Horizontal', ratio: '16:9', clase: 'aspect-video w-16' },
  { value: 'vertical', label: 'Vertical', ratio: '9:16', clase: 'aspect-[9/16] w-8' },
] as const

export function FormularioPromocion({ promocion }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [imagen, setImagen] = useState<string[]>(promocion?.imagen_url ? [promocion.imagen_url] : [])
  const esEdicion = !!promocion

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Campos>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: promocion?.nombre ?? '',
      descripcion: promocion?.descripcion ?? '',
      precio: promocion?.precio ? String(promocion.precio) : '',
      formato_imagen: promocion?.formato_imagen ?? 'cuadrado',
      mensaje_whatsapp: promocion?.mensaje_whatsapp ?? 'Hola, me interesa esta promoción',
      esta_activa: promocion?.esta_activa ?? true,
      inicia_en: promocion?.inicia_en ? promocion.inicia_en.split('T')[0] : '',
      termina_en: promocion?.termina_en ? promocion.termina_en.split('T')[0] : '',
    },
  })

  const formato = watch('formato_imagen')
  const nombre = watch('nombre')
  const precio = watch('precio')

  async function onSubmit(datos: Campos) {
    if (!imagen[0]) {
      toast.error('Debes subir una imagen')
      return
    }
    setGuardando(true)
    const supabase = crearClienteSupabase()

    const payload = {
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      precio: datos.precio ? parseFloat(datos.precio) : null,
      imagen_url: imagen[0],
      formato_imagen: datos.formato_imagen,
      mensaje_whatsapp: datos.mensaje_whatsapp,
      esta_activa: datos.esta_activa,
      inicia_en: datos.inicia_en ? new Date(datos.inicia_en).toISOString() : null,
      termina_en: datos.termina_en ? new Date(datos.termina_en + 'T23:59:59').toISOString() : null,
    }

    if (esEdicion) {
      const { error } = await supabase.from('promociones').update(payload).eq('id', promocion.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      toast.success('Cambios guardados correctamente')
    } else {
      const { error } = await supabase.from('promociones').insert(payload)
      if (error) { toast.error('Error al crear'); setGuardando(false); return }
      toast.success('Cambios guardados correctamente')
    }

    router.push('/admin/dashboard/promociones')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard/promociones"
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {esEdicion ? 'Editar promoción' : 'Nueva promoción'}
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">Se muestra como modal en la tienda pública</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nombre *</label>
          <input {...register('nombre')} placeholder="Ej: Oferta de verano" className={inputCls} />
          {errors.nombre && <p className="text-xs text-danger">{errors.nombre.message}</p>}
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Descripción</label>
          <textarea {...register('descripcion')} rows={2} placeholder="Texto que aparece bajo la imagen..." className={`${inputCls} h-auto py-2 resize-none`} />
        </div>

        {/* Precio opcional */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Precio promocional (opcional)</label>
          <div className="flex items-center h-10 rounded-xl border border-input-border bg-input-bg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
            <span className="px-3 text-sm text-foreground-muted border-r border-input-border h-full flex items-center">$</span>
            <input {...register('precio')} type="number" step="0.01" min="0" placeholder="Sin precio" className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none" />
          </div>
        </div>

        {/* Formato imagen */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Formato de imagen *</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATOS.map(f => (
              <label key={f.value}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  formato === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}>
                <input type="radio" {...register('formato_imagen')} value={f.value} className="sr-only" />
                <div className={cn('bg-border/40 rounded-lg flex items-center justify-center', f.clase)}>
                  <LayoutTemplate className="w-3 h-3 text-foreground-muted" />
                </div>
                <span className="text-xs font-medium text-foreground">{f.label}</span>
                <span className="text-[10px] text-foreground-muted">{f.ratio}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Imagen */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Imagen *</label>
          <p className="text-xs text-foreground-muted">
            Usa formato {formato} · ratio {FORMATOS.find(f => f.value === formato)?.ratio}
          </p>
          <SubidorImagenes imagenes={imagen} onCambio={setImagen} maxImagenes={1} carpeta="promociones" />
          {!imagen[0] && guardando && <p className="text-xs text-danger">La imagen es requerida</p>}
        </div>

        {/* Preview */}
        {imagen[0] && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Preview del modal</label>
            <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-xs mx-auto w-full shadow-lg">
              <div className={cn(
                'w-full overflow-hidden bg-background-subtle',
                formato === 'cuadrado' && 'aspect-square',
                formato === 'horizontal' && 'aspect-video',
                formato === 'vertical' && 'aspect-[9/16] max-h-56',
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagen[0]} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="font-bold text-foreground text-sm">{nombre || 'Nombre de la promoción'}</p>
                {precio && <p className="text-primary font-bold text-base">{formatearPrecio(parseFloat(precio) || 0)}</p>}
                <div className="mt-2 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary font-semibold">Consultar por WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje WhatsApp */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Mensaje de WhatsApp *</label>
          <textarea {...register('mensaje_whatsapp')} rows={3} className={`${inputCls} h-auto py-2 resize-none`}
            placeholder="Hola, me interesa la promoción de verano..." />
          {errors.mensaje_whatsapp && <p className="text-xs text-danger">{errors.mensaje_whatsapp.message}</p>}
          <p className="text-xs text-foreground-muted">Texto que se enviará al hacer clic en "Consultar"</p>
        </div>

        {/* Fechas */}
        <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">Programación (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Inicia</label>
              <input {...register('inicia_en')} type="date" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Termina</label>
              <input {...register('termina_en')} type="date" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Estado */}
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input type="checkbox" {...register('esta_activa')} className="sr-only peer" />
            <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-foreground">
            {watch('esta_activa') ? 'Activa — visible en la tienda' : 'Inactiva — no se mostrará'}
          </span>
        </label>

        {/* Botón */}
        <button type="submit" disabled={guardando}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {guardando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            : <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear promoción'}</>
          }
        </button>
      </form>
    </div>
  )
}

const inputCls = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
