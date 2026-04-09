'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, Check } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { generarSlug } from '@/lib/utils'
import { SubidorImagenes } from '@/components/ui/subidor-imagenes'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z.string().min(2, 'Mínimo 2 caracteres').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  parent_id: z.string().optional(),
  esta_activa: z.boolean(),
  orden: z.string(),
})

type Campos = z.infer<typeof schema>

interface CategoriaSimple {
  id: string
  nombre: string
  parent_id: string | null
}

interface CategoriaExistente {
  id: string
  nombre: string
  slug: string
  parent_id: string | null
  imagen_url: string | null
  esta_activa: boolean
  orden: number
}

interface Props {
  categorias: CategoriaSimple[]
  categoria?: CategoriaExistente
  parentIdInicial?: string
}

export function FormularioCategoria({ categorias, categoria, parentIdInicial }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [imagenes, setImagenes] = useState<string[]>(categoria?.imagen_url ? [categoria.imagen_url] : [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: categoria?.nombre ?? '',
      slug: categoria?.slug ?? '',
      parent_id: categoria?.parent_id ?? parentIdInicial ?? '',
      esta_activa: categoria?.esta_activa ?? true,
      orden: String(categoria?.orden ?? 0),
    },
  })

  const esEdicion = !!categoria

  // Solo categorías padre (sin parent_id) para el selector
  const padres = categorias.filter(c => !c.parent_id && c.id !== categoria?.id)

  const nombreActual = watch('nombre')

  // Auto-ajuste de slug en tiempo real para nuevas categorías
  useEffect(() => {
    if (!esEdicion && nombreActual) {
      setValue('slug', generarSlug(nombreActual))
    }
  }, [nombreActual, esEdicion, setValue])

  async function onSubmit(datos: Campos) {
    setGuardando(true)
    const supabase = crearClienteSupabase()

    const payload = {
      nombre: datos.nombre,
      slug: datos.slug,
      parent_id: datos.parent_id || null,
      imagen_url: imagenes[0] ?? null,
      esta_activa: datos.esta_activa,
      orden: parseInt(datos.orden) || 0,
    }

    if (esEdicion) {
      const { error } = await supabase.from('categorias').update(payload).eq('id', categoria.id)
      if (error) {
        toast.error(error.message.includes('slug') ? 'El slug ya existe' : 'Error al guardar')
        setGuardando(false)
        return
      }
    } else {
      const { error } = await supabase.from('categorias').insert(payload)
      if (error) {
        toast.error(error.message.includes('slug') ? 'El slug ya existe' : 'Error al crear')
        setGuardando(false)
        return
      }
    }

    setGuardando(false)
    setExito(true)
    toast.success('Cambios guardados correctamente')
    
    setTimeout(() => {
      router.push('/admin/dashboard/categorias')
      router.refresh()
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard/categorias"
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {esEdicion ? 'Editar categoría' : 'Nueva categoría'}
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {esEdicion ? categoria.nombre : 'Completa los datos de la categoría'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nombre *</label>
          <input
            {...register('nombre')}
            placeholder="Ej: Ropa deportiva"
            className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.nombre && <p className="text-xs text-danger">{errors.nombre.message}</p>}
        </div>

        {/* Slug */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Slug (URL)</label>
          <div className="flex items-center h-10 rounded-xl border border-input-border bg-input-bg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
            <span className="px-3 text-sm text-foreground-muted border-r border-input-border h-full flex items-center">/cat/</span>
            <input
              {...register('slug')}
              placeholder="ropa-deportiva"
              className="flex-1 px-3 bg-transparent text-foreground text-sm focus:outline-none"
            />
          </div>
          {errors.slug && <p className="text-xs text-danger">{errors.slug.message}</p>}
        </div>

        {/* Categoría padre */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Categoría padre</label>
          <select
            {...register('parent_id')}
            className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Ninguna (categoría principal)</option>
            {padres.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <p className="text-xs text-foreground-muted">Si seleccionas una categoría padre, esta será una subcategoría.</p>
        </div>

        {/* Imagen */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Imagen</label>
          <SubidorImagenes
            imagenes={imagenes}
            onCambio={setImagenes}
            maxImagenes={1}
            carpeta="categorias"
          />
        </div>

        {/* Orden y Activa */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Orden</label>
            <input
              {...register('orden')}
              type="number"
              min="0"
              placeholder="0"
              className="h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-foreground-muted">Menor número = aparece primero</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Estado</label>
            <label className="flex items-center gap-2 h-10 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  {...register('esta_activa')}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-foreground">
                {watch('esta_activa') ? 'Activa' : 'Inactiva'}
              </span>
            </label>
          </div>
        </div>

        {/* Botón guardar */}
        <button
          type="submit"
          disabled={guardando || exito}
          className={cn(
            "flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm transition-all duration-500",
            exito 
              ? "bg-[#22c55e] text-white"
              : "bg-primary text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {guardando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
          ) : exito ? (
            <div className="flex items-center gap-2 animate-in zoom-in-50 duration-300">
              <Check className="w-4 h-4 animate-bounce" />
              <span>¡Guardado!</span>
            </div>
          ) : (
            <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear categoría'}</>
          )}
        </button>
      </form>
    </div>
  )
}
