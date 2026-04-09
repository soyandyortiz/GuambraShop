'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Tag, Save, ArrowLeft, Ruler } from 'lucide-react'
import { useEffect } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { Input } from '@/components/ui/input'
import { Botón } from '@/components/ui/boton'
import { SubidorImagenes } from '@/components/ui/subidor-imagenes'
import { generarSlug } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Categoria, Producto, VarianteProducto, TallaProducto } from '@/types'

const esquema = z.object({
  nombre:           z.string().min(1, 'El nombre es obligatorio'),
  slug:             z.string().min(1, 'El slug es obligatorio'),
  descripcion:      z.string().optional(),
  precio:           z.string().min(1, 'El precio es obligatorio'),
  precio_descuento: z.string().optional(),
  categoria_id:     z.string().optional(),
  esta_activo:      z.boolean(),
  etiquetas:        z.string().optional(),
  requiere_tallas:  z.boolean(),
  variantes: z.array(z.object({
    id:             z.string().optional(),
    nombre:         z.string().min(1, 'Nombre requerido'),
    descripcion:    z.string().optional(),
    precio_variante:z.string().optional(),
  })),
  tallas: z.array(z.object({
    id:         z.string().optional(),
    talla:      z.string().min(1, 'Talla requerida'),
    disponible: z.boolean(),
  })),
})

type DatosProducto = z.infer<typeof esquema>

interface Props {
  categorias: Categoria[]
  producto?: Producto & { variantes?: VarianteProducto[]; tallas?: TallaProducto[] }
  productosExistentes?: { id: string; nombre: string }[]
}

export function FormularioProducto({ categorias, producto, productosExistentes = [] }: Props) {
  const router = useRouter()
  const esEdicion = !!producto

  const [imagenes, setImagenes] = useState<string[]>(
    producto?.imagenes
      ? [...producto.imagenes].sort((a, b) => a.orden - b.orden).map(i => i.url)
      : []
  )
  const [relacionados, setRelacionados] = useState<string[]>([])
  const [errorGlobal, setErrorGlobal] = useState('')

  // Selector de categoría en 2 pasos
  const categoriasParent = categorias.filter(c => !c.parent_id)
  const [padreId, setPadreId] = useState<string>(() => {
    if (!producto?.categoria_id) return ''
    const cat = categorias.find(c => c.id === producto.categoria_id)
    if (!cat) return ''
    return cat.parent_id ?? cat.id // si es sub, devuelve su padre; si es padre, él mismo
  })

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, control } = useForm<DatosProducto>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: producto?.nombre ?? '',
      slug: producto?.slug ?? '',
      descripcion: producto?.descripcion ?? '',
      precio: producto?.precio?.toString() ?? '',
      precio_descuento: producto?.precio_descuento?.toString() ?? '',
      categoria_id: producto?.categoria_id ?? '',
      esta_activo: producto?.esta_activo ?? true,
      etiquetas: producto?.etiquetas?.join(', ') ?? '',
      requiere_tallas: producto?.requiere_tallas ?? false,
      variantes: producto?.variantes?.map(v => ({
        id: v.id, nombre: v.nombre,
        descripcion: v.descripcion ?? '',
        precio_variante: v.precio_variante?.toString() ?? '',
      })) ?? [],
      tallas: producto?.tallas?.map(t => ({
        id: t.id, talla: t.talla, disponible: t.disponible,
      })) ?? [],
    },
  })

  const { fields: varianteFields, append: appendVariante, remove: removeVariante } = useFieldArray({ control, name: 'variantes' })
  const { fields: tallaFields, append: appendTalla, remove: removeTalla } = useFieldArray({ control, name: 'tallas' })

  const requiereTallas = watch('requiere_tallas')
  const nombreActual = watch('nombre')

  // Auto-ajuste de slug en tiempo real para nuevos productos
  useEffect(() => {
    if (!esEdicion && nombreActual) {
      setValue('slug', generarSlug(nombreActual))
    }
  }, [nombreActual, esEdicion, setValue])

  async function onSubmit(datos: DatosProducto) {
    setErrorGlobal('')
    const supabase = crearClienteSupabase()

    const etiquetasArray = datos.etiquetas
      ? datos.etiquetas.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const payload = {
      nombre: datos.nombre,
      slug: datos.slug,
      descripcion: datos.descripcion ?? null,
      precio: parseFloat(datos.precio),
      precio_descuento: datos.precio_descuento ? parseFloat(datos.precio_descuento) : null,
      categoria_id: datos.categoria_id || null,
      esta_activo: datos.esta_activo,
      etiquetas: etiquetasArray,
      requiere_tallas: datos.requiere_tallas,
    }

    let productoId = producto?.id

    if (esEdicion) {
      const { error } = await supabase.from('productos').update(payload).eq('id', productoId!)
      if (error) { setErrorGlobal('Error al actualizar el producto'); return }
    } else {
      const { data, error } = await supabase.from('productos').insert(payload).select('id').single()
      if (error || !data) { setErrorGlobal('Error al crear el producto: ' + (error?.message ?? '')); return }
      productoId = data.id
    }

    // Imágenes
    await supabase.from('imagenes_producto').delete().eq('producto_id', productoId!)
    if (imagenes.length > 0) {
      await supabase.from('imagenes_producto').insert(
        imagenes.map((url, i) => ({ producto_id: productoId, url, orden: i }))
      )
    }

    // Variantes
    await supabase.from('variantes_producto').delete().eq('producto_id', productoId!)
    if (datos.variantes.length > 0) {
      await supabase.from('variantes_producto').insert(
        datos.variantes.map((v, i) => ({
          producto_id: productoId,
          nombre: v.nombre,
          descripcion: v.descripcion ?? null,
          precio_variante: v.precio_variante ? Number(v.precio_variante) : null,
          orden: i,
        }))
      )
    }

    // Tallas
    await supabase.from('tallas_producto').delete().eq('producto_id', productoId!)
    if (datos.requiere_tallas && datos.tallas.length > 0) {
      await supabase.from('tallas_producto').insert(
        datos.tallas.map((t, i) => ({
          producto_id: productoId,
          talla: t.talla,
          disponible: t.disponible,
          orden: i,
        }))
      )
    }

    // Relacionados
    await supabase.from('productos_relacionados').delete().eq('producto_id', productoId!)
    if (relacionados.length > 0) {
      await supabase.from('productos_relacionados').insert(
        relacionados.map(rid => ({ producto_id: productoId, producto_relacionado_id: rid }))
      )
    }

    toast.success('Cambios guardados correctamente')
    router.push('/admin/dashboard/productos')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </h1>
        </div>
        <Botón type="submit" cargando={isSubmitting} className="gap-2">
          <Save className="w-4 h-4" />
          {esEdicion ? 'Guardar' : 'Crear'}
        </Botón>
      </div>

      {errorGlobal && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {errorGlobal}
        </div>
      )}

      {/* Sección: Información básica */}
      <Sección titulo="Información básica">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              etiqueta="Nombre del producto"
              placeholder="Ej: Zapatillas New Balance 327"
              error={errors.nombre?.message}
              {...register('nombre')}
            />
          </div>
          <Input
            etiqueta="Slug (URL)"
            placeholder="zapatillas-new-balance-327"
            error={errors.slug?.message}
            {...register('slug')}
          />
          {/* Selector de categoría en 2 pasos */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground block">Categoría</label>
            <select
              value={padreId}
              onChange={e => {
                setPadreId(e.target.value)
                setValue('categoria_id', e.target.value) // resetea a padre al cambiar
              }}
              className="w-full h-11 px-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sin categoría</option>
              {categoriasParent.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            {/* Subcategorías del padre seleccionado */}
            {padreId && (() => {
              const subs = categorias.filter(c => c.parent_id === padreId)
              if (!subs.length) return null
              const subActual = subs.some(s => s.id === watch('categoria_id')) ? watch('categoria_id') : ''
              return (
                <select
                  value={subActual}
                  onChange={e => setValue('categoria_id', e.target.value || padreId)}
                  className="w-full h-11 px-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Categoría general —</option>
                  {subs.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              )
            })()}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-foreground block mb-1.5">Descripción</label>
            <textarea
              {...register('descripcion')}
              rows={4}
              placeholder="Describe el producto..."
              className="w-full px-4 py-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </Sección>

      {/* Sección: Precios */}
      <Sección titulo="Precios">
        <div className="grid grid-cols-2 gap-4">
          <Input
            etiqueta="Precio normal"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.precio?.message}
            {...register('precio')}
          />
          <Input
            etiqueta="Precio con descuento (opcional)"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('precio_descuento')}
          />
        </div>
      </Sección>

      {/* Sección: Imágenes */}
      <Sección titulo="Imágenes" descripcion="Máximo 5 imágenes · 5MB por imagen · La primera es la imagen principal">
        <SubidorImagenes
          imagenes={imagenes}
          onCambio={setImagenes}
          maxImagenes={5}
          carpeta="productos"
        />
      </Sección>

      {/* Sección: Variantes */}
      <Sección titulo="Variantes" descripcion="Agrega opciones como color, material, etc. El precio de la variante reemplaza al precio base.">
        <div className="flex flex-col gap-3">
          {varianteFields.map((field, i) => (
            <div key={field.id} className="rounded-xl border border-border p-4 flex flex-col gap-3 bg-background-subtle">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground-muted">Variante {i + 1}</span>
                <button type="button" onClick={() => removeVariante(i)} className="text-foreground-muted hover:text-danger transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Nombre (ej: Color Rojo)" error={errors.variantes?.[i]?.nombre?.message} {...register(`variantes.${i}.nombre`)} />
                <Input placeholder="Descripción (opcional)" {...register(`variantes.${i}.descripcion`)} />
                <Input type="number" step="0.01" placeholder="Precio (reemplaza al base)" {...register(`variantes.${i}.precio_variante`)} />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendVariante({ nombre: '', descripcion: '', precio_variante: '' })}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar variante
          </button>
        </div>
      </Sección>

      {/* Sección: Tallas */}
      <Sección titulo="Tallas">
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" {...register('requiere_tallas')} />
              <div className={cn('w-11 h-6 rounded-full transition-colors', requiereTallas ? 'bg-primary' : 'bg-border')}>
                <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', requiereTallas && 'translate-x-5')} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Este producto tiene tallas</p>
              <p className="text-xs text-foreground-muted">Ej: S, M, L, XL o EU 36, EU 37</p>
            </div>
          </label>

          {requiereTallas && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {tallaFields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-1">
                    <input
                      {...register(`tallas.${i}.talla`)}
                      placeholder="Ej: M"
                      className="w-20 h-9 px-3 text-sm text-center rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <label className="flex items-center gap-1 text-xs text-foreground-muted">
                      <input type="checkbox" {...register(`tallas.${i}.disponible`)} className="rounded" />
                      Disp.
                    </label>
                    <button type="button" onClick={() => removeTalla(i)} className="text-foreground-muted hover:text-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {['XS','S','M','L','XL','XXL','36','37','38','39','40','41','42'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => appendTalla({ talla: t, disponible: true })}
                    className="px-2.5 h-7 text-xs rounded-lg border border-border text-foreground-muted hover:border-primary hover:text-primary transition-all"
                  >
                    +{t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => appendTalla({ talla: '', disponible: true })}
                className="flex items-center gap-2 text-sm text-primary font-medium w-fit"
              >
                <Ruler className="w-4 h-4" /> Talla personalizada
              </button>
            </div>
          )}
        </div>
      </Sección>

      {/* Sección: Etiquetas */}
      <Sección titulo="Etiquetas" descripcion="Separadas por coma. Mejoran la búsqueda interna.">
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            {...register('etiquetas')}
            placeholder="oferta, nuevo, importado, temporada"
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </Sección>

      {/* Sección: Productos relacionados */}
      {productosExistentes.length > 0 && (
        <Sección titulo="Productos relacionados" descripcion="Aparecen en la página del producto para incentivar más compras.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {productosExistentes.filter(p => p.id !== producto?.id).map(p => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-background-subtle">
                <input
                  type="checkbox"
                  checked={relacionados.includes(p.id)}
                  onChange={e => {
                    if (e.target.checked) setRelacionados(prev => [...prev, p.id])
                    else setRelacionados(prev => prev.filter(id => id !== p.id))
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">{p.nombre}</span>
              </label>
            ))}
          </div>
        </Sección>
      )}

      {/* Sección: Estado */}
      <Sección titulo="Visibilidad">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" {...register('esta_activo')} />
            <div className={cn('w-11 h-6 rounded-full transition-colors', watch('esta_activo') ? 'bg-primary' : 'bg-border')}>
              <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', watch('esta_activo') && 'translate-x-5')} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Producto activo</p>
            <p className="text-xs text-foreground-muted">
              {watch('esta_activo') ? 'Visible en la tienda' : 'Oculto de la tienda'}
            </p>
          </div>
        </label>
      </Sección>

      {/* Botón final */}
      <Botón type="submit" tamaño="lg" anchoCompleto cargando={isSubmitting}>
        <Save className="w-4 h-4" />
        {esEdicion ? 'Guardar cambios' : 'Crear producto'}
      </Botón>
    </form>
  )
}

function Sección({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-card-border p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        {descripcion && <p className="text-xs text-foreground-muted mt-0.5">{descripcion}</p>}
      </div>
      {children}
    </div>
  )
}
