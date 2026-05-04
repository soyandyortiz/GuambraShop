'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Tag, Save, ArrowLeft, Ruler, Package, Video, ImagePlus, X, PackagePlus, PartyPopper, PlusCircle, KeyRound, Search } from 'lucide-react'
import { usarSubirImagen } from '@/hooks/usar-subir-imagen'
import { useEffect } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { Input } from '@/components/ui/input'
import { Botón } from '@/components/ui/boton'
import { SubidorImagenes } from '@/components/ui/subidor-imagenes'
import { generarSlug } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Categoria, Producto, VarianteProducto, TallaProducto, PaqueteEvento } from '@/types'

const esquema = z.object({
  nombre:           z.string().min(1, 'El nombre es obligatorio'),
  slug:             z.string().min(1, 'El slug es obligatorio'),
  descripcion:      z.string().optional(),
  precio:           z.string().min(1, 'El precio es obligatorio'),
  precio_descuento: z.string().optional(),
  categoria_id:     z.string().optional(),
  esta_activo:      z.boolean(),
  etiquetas:        z.string().optional(),
  url_video:        z.string().optional(),
  requiere_tallas:  z.boolean(),
  tipo_producto:      z.enum(['producto', 'servicio', 'evento', 'alquiler']),
  stock:              z.string().optional(),
  precio_deposito:       z.string().optional(),
  max_dias_alquiler:     z.string().optional(),
  garantia_descripcion:  z.string().optional(),
  variantes: z.array(z.object({
    id:             z.string().optional(),
    nombre:         z.string().min(1, 'Nombre requerido'),
    descripcion:    z.string().optional(),
    precio_variante:z.string().optional(),
    stock_variante: z.string().optional(),
    imagen_url:     z.string().optional(),
    tipo_precio:    z.enum(['reemplaza', 'suma']).optional(),
  })),
  tallas: z.array(z.object({
    id:         z.string().optional(),
    talla:      z.string().min(1, 'Talla requerida'),
    disponible: z.boolean(),
    stock_talla:z.string().optional(),
  })),
})

type DatosProducto = z.infer<typeof esquema>

interface Props {
  categorias: Categoria[]
  producto?: Producto & { variantes?: VarianteProducto[]; tallas?: TallaProducto[] }
  productosExistentes?: { id: string; nombre: string }[]
  relacionadosIniciales?: string[]
}

const PAQUETE_VACIO: PaqueteEvento = { id: '', icono: '🎵', nombre: '', descripcion: null, precio_min: null, precio_max: null }

export function FormularioProducto({ categorias, producto, productosExistentes = [], relacionadosIniciales = [] }: Props) {
  const router = useRouter()
  const esEdicion = !!producto

  const [imagenes, setImagenes] = useState<string[]>(
    producto?.imagenes
      ? [...producto.imagenes].sort((a, b) => a.orden - b.orden).map(i => i.url)
      : []
  )
  const [relacionados, setRelacionados] = useState<string[]>(relacionadosIniciales)
  const [busquedaRelacionados, setBusquedaRelacionados] = useState('')
  const [errorGlobal, setErrorGlobal] = useState('')
  const [subiendoVariante, setSubiendoVariante] = useState<number | null>(null)
  const { subirImagen: subirImagenVariante, eliminarImagen: eliminarImagenVariante } = usarSubirImagen('productos')

  // Paquetes de evento (solo para tipo=evento)
  const [paquetes, setPaquetes] = useState<PaqueteEvento[]>(
    (producto as any)?.paquetes_evento ?? []
  )

  // Selector de categoría en 2 pasos
  const categoriasParent = categorias.filter(c => !c.parent_id)
  const [padreId, setPadreId] = useState<string>(() => {
    if (!producto?.categoria_id) return ''
    const cat = categorias.find(c => c.id === producto.categoria_id)
    if (!cat) return ''
    return cat.parent_id ?? cat.id
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
      url_video: producto?.url_video ?? '',
      requiere_tallas: producto?.requiere_tallas ?? false,
      tipo_producto: (producto?.tipo_producto as 'producto' | 'servicio' | 'evento' | 'alquiler') ?? 'producto',
      stock: producto?.stock?.toString() ?? '',
      precio_deposito: (producto as any)?.precio_deposito?.toString() ?? '',
      max_dias_alquiler: (producto as any)?.max_dias_alquiler?.toString() ?? '',
      garantia_descripcion: (producto as any)?.garantia_descripcion ?? '',
      variantes: producto?.variantes?.map(v => ({
        id: v.id, nombre: v.nombre,
        descripcion: v.descripcion ?? '',
        precio_variante: v.precio_variante?.toString() ?? '',
        stock_variante: (v as any).stock?.toString() ?? '',
        imagen_url: v.imagen_url ?? '',
        tipo_precio: ((v.tipo_precio === 'suma' ? 'suma' : 'reemplaza') as 'reemplaza' | 'suma'),
      })) ?? [],
      tallas: producto?.tallas?.map(t => ({
        id: t.id, talla: t.talla, disponible: t.disponible,
        stock_talla: t.stock?.toString() ?? '',
      })) ?? [],
    },
  })

  const [agregarStockValor, setAgregarStockValor] = useState('')

  const { fields: varianteFields, append: appendVariante, remove: removeVariante } = useFieldArray({ control, name: 'variantes' })
  const { fields: tallaFields, append: appendTalla, remove: removeTalla } = useFieldArray({ control, name: 'tallas' })

  const requiereTallas = watch('requiere_tallas')
  const nombreActual = watch('nombre')
  const tipoProducto = watch('tipo_producto')

  useEffect(() => {
    if (!esEdicion && nombreActual) {
      setValue('slug', generarSlug(nombreActual))
    }
  }, [nombreActual, esEdicion, setValue])

  function agregarPaquete() {
    setPaquetes(prev => [...prev, { ...PAQUETE_VACIO, id: crypto.randomUUID() }])
  }
  function quitarPaquete(idx: number) {
    setPaquetes(prev => prev.filter((_, i) => i !== idx))
  }
  function actualizarPaquete(idx: number, campo: keyof PaqueteEvento, valor: string | number | null) {
    setPaquetes(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))
  }

  async function onSubmit(datos: DatosProducto) {
    setErrorGlobal('')
    const supabase = crearClienteSupabase()

    const etiquetasArray = datos.etiquetas
      ? datos.etiquetas.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const payload: Record<string, unknown> = {
      nombre: datos.nombre,
      slug: datos.slug,
      descripcion: datos.descripcion ?? null,
      precio: parseFloat(datos.precio),
      precio_descuento: datos.precio_descuento ? parseFloat(datos.precio_descuento) : null,
      categoria_id: datos.categoria_id || null,
      esta_activo: datos.esta_activo,
      etiquetas: etiquetasArray,
      url_video: datos.url_video?.trim() || null,
      requiere_tallas: datos.requiere_tallas,
      tipo_producto: datos.tipo_producto,
      stock: datos.stock ? parseInt(datos.stock, 10) : null,
    }

    // Paquetes de evento
    if (datos.tipo_producto === 'evento') {
      payload.paquetes_evento = paquetes.map(p => ({
        id: p.id,
        icono: p.icono,
        nombre: p.nombre,
        descripcion: p.descripcion ?? null,
        precio_min: p.precio_min ?? null,
        precio_max: p.precio_max ?? null,
      }))
    } else {
      payload.paquetes_evento = []
    }

    // Campos de alquiler
    if (datos.tipo_producto === 'alquiler') {
      payload.precio_deposito      = datos.precio_deposito   ? parseFloat(datos.precio_deposito)   : null
      payload.max_dias_alquiler    = datos.max_dias_alquiler ? parseInt(datos.max_dias_alquiler, 10) : null
      payload.garantia_descripcion = datos.garantia_descripcion?.trim() || null
    } else {
      payload.precio_deposito      = null
      payload.max_dias_alquiler    = null
      payload.garantia_descripcion = null
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
          stock: v.stock_variante ? parseInt(v.stock_variante, 10) : null,
          imagen_url: v.imagen_url?.trim() || null,
          tipo_precio: (v.tipo_precio === 'suma' ? 'suma' : 'reemplaza'),
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
          stock: t.stock_talla ? parseInt(t.stock_talla, 10) : null,
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setValue('tipo_producto', 'producto')}
          className={cn(
            "p-4 rounded-2xl border-2 text-center transition-all",
            tipoProducto === 'producto'
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-card text-foreground-muted hover:border-primary/40"
          )}
        >
          <Package className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-bold">Producto</p>
          <p className="text-[10px] opacity-70">Venta directa</p>
        </button>
        <button
          type="button"
          onClick={() => setValue('tipo_producto', 'servicio')}
          className={cn(
            "p-4 rounded-2xl border-2 text-center transition-all",
            tipoProducto === 'servicio'
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-card text-foreground-muted hover:border-primary/40"
          )}
        >
          <Save className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-bold">Servicio</p>
          <p className="text-[10px] opacity-70">Con agenda y cita</p>
        </button>
        <button
          type="button"
          onClick={() => setValue('tipo_producto', 'evento')}
          className={cn(
            "p-4 rounded-2xl border-2 text-center transition-all",
            tipoProducto === 'evento'
              ? "border-purple-500 bg-purple-500/5 text-purple-600"
              : "border-border bg-card text-foreground-muted hover:border-purple-400/40"
          )}
        >
          <PartyPopper className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-bold">Evento</p>
          <p className="text-[10px] opacity-70">Solicitud de cotización</p>
        </button>
        <button
          type="button"
          onClick={() => setValue('tipo_producto', 'alquiler')}
          className={cn(
            "p-4 rounded-2xl border-2 text-center transition-all",
            tipoProducto === 'alquiler'
              ? "border-amber-500 bg-amber-500/5 text-amber-600"
              : "border-border bg-card text-foreground-muted hover:border-amber-400/40"
          )}
        >
          <KeyRound className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-bold">Alquiler</p>
          <p className="text-[10px] opacity-70">Renta por días</p>
        </button>
      </div>

      {/* Aviso para tipo evento */}
      {tipoProducto === 'evento' && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-700">
          <p className="font-semibold mb-1">Flujo de cotización activo</p>
          <p className="text-xs opacity-80">
            Los clientes verán un formulario para enviar sus datos del evento (fecha, ciudad, presupuesto).
            La solicitud queda registrada en <b>Solicitudes de Evento</b> y se abre WhatsApp con toda la información precargada.
            Puedes agregar paquetes y variantes para mostrar las opciones disponibles.
          </p>
        </div>
      )}

      {/* Aviso para tipo alquiler */}
      {tipoProducto === 'alquiler' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          <p className="font-semibold mb-1">Modo alquiler activo</p>
          <p className="text-xs opacity-80">
            El precio se muestra como <b>tarifa por día</b>. El cliente selecciona la fecha de retiro,
            el número de días y la cantidad de piezas. El <b>stock</b> representa las unidades disponibles
            simultáneamente. Puedes definir un depósito de garantía y un límite de días.
          </p>
        </div>
      )}

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
                setValue('categoria_id', e.target.value)
              }}
              className="w-full h-11 px-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sin categoría</option>
              {categoriasParent.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

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
            etiqueta={
              tipoProducto === 'evento' ? 'Precio referencial (desde)' :
              tipoProducto === 'alquiler' ? 'Precio por día' :
              'Precio normal'
            }
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.precio?.message}
            {...register('precio')}
          />
          {tipoProducto !== 'alquiler' && (
            <Input
              etiqueta="Precio con descuento (opcional)"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('precio_descuento')}
            />
          )}

          {/* Campos específicos de alquiler */}
          {tipoProducto === 'alquiler' && (
            <>
              <Input
                etiqueta="Unidades disponibles (trajes)"
                type="number"
                min="0"
                placeholder="Ej: 3 trajes"
                {...register('stock')}
              />
              <Input
                etiqueta="Máximo de días (opcional)"
                type="number"
                min="1"
                placeholder="Sin límite"
                {...register('max_dias_alquiler')}
              />
              {/* Garantía */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Garantía (opcional)
                </label>
                <p className="text-[11px] text-foreground-muted -mt-0.5">
                  Selecciona una opción o escribe lo que el cliente debe dejar como garantía.
                </p>
                <div className="flex flex-wrap gap-2 mb-1">
                  {[
                    'Cédula de Identificación',
                    'Laptop con cargador en buen estado',
                    'Cantidad económica',
                  ].map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setValue('garantia_descripcion', op)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-background-subtle hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all"
                    >
                      {op}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Ej: Cantidad económica: $50 o Cédula de Identificación"
                  className="w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register('garantia_descripcion')}
                />
              </div>
            </>
          )}

          {tipoProducto === 'producto' && (
            <div className="flex flex-col gap-2">
              {esEdicion && (() => {
                const val = watch('stock')
                const n = val !== '' && val !== undefined ? parseInt(val, 10) : null
                if (n === null) return (
                  <p className="text-xs text-foreground-muted">Stock: <span className="font-medium">sin control (ilimitado)</span></p>
                )
                if (n === 0) return (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-lg">AGOTADO</span>
                    <button
                      type="button"
                      onClick={() => setValue('stock', '1')}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Marcar con stock
                    </button>
                  </div>
                )
                if (n <= 5) return (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg w-fit">
                    Pocas unidades: {n}
                  </span>
                )
                return (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg w-fit">
                    En stock: {n} unidades
                  </span>
                )
              })()}

              <Input
                etiqueta="Stock base"
                type="number"
                min="0"
                placeholder="Vacío = ilimitado"
                {...register('stock')}
              />

              {esEdicion && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <PackagePlus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
                    <input
                      type="number"
                      min="1"
                      value={agregarStockValor}
                      onChange={e => setAgregarStockValor(e.target.value)}
                      placeholder="Unidades a reponer"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!agregarStockValor || parseInt(agregarStockValor, 10) <= 0}
                    onClick={() => {
                      const agregar = parseInt(agregarStockValor, 10)
                      if (isNaN(agregar) || agregar <= 0) return
                      const actual = parseInt(watch('stock') || '0', 10) || 0
                      setValue('stock', String(actual + agregar))
                      setAgregarStockValor('')
                    }}
                    className="h-10 px-4 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                  >
                    + Reponer
                  </button>
                </div>
              )}
            </div>
          )}
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

      {/* Sección: Paquetes de evento — solo para tipo=evento */}
      {tipoProducto === 'evento' && (
        <Sección
          titulo="Paquetes / Servicios incluidos"
          descripcion="Muestra el desglose de lo que incluye el evento con rangos de precio. Ej: 🎵 DJ + Técnica, 💐 Decoración, etc."
        >
          <div className="flex flex-col gap-3">
            {paquetes.map((paq, idx) => (
              <div key={paq.id} className="rounded-xl border border-border p-4 flex flex-col gap-3 bg-background-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground-muted">Paquete {idx + 1}</span>
                  <button type="button" onClick={() => quitarPaquete(idx)} className="text-foreground-muted hover:text-danger transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-foreground-muted mb-1 block">Ícono (emoji)</label>
                    <input
                      value={paq.icono}
                      onChange={e => actualizarPaquete(idx, 'icono', e.target.value)}
                      placeholder="🎵"
                      className="w-full h-10 px-3 text-center text-lg rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-foreground-muted mb-1 block">Nombre del paquete *</label>
                    <input
                      value={paq.nombre}
                      onChange={e => actualizarPaquete(idx, 'nombre', e.target.value)}
                      placeholder="Ej: DJ + Técnica / Pack Profesional"
                      className="w-full h-10 px-3 text-sm rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-foreground-muted mb-1 block">Descripción (opcional)</label>
                    <input
                      value={paq.descripcion ?? ''}
                      onChange={e => actualizarPaquete(idx, 'descripcion', e.target.value || null)}
                      placeholder="Detalle del paquete..."
                      className="w-full h-10 px-3 text-sm rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-foreground-muted mb-1 block">Precio mín (opcional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paq.precio_min ?? ''}
                      onChange={e => actualizarPaquete(idx, 'precio_min', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 text-sm rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-foreground-muted mb-1 block">Precio máx (opcional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paq.precio_max ?? ''}
                      onChange={e => actualizarPaquete(idx, 'precio_max', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 text-sm rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={agregarPaquete}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Agregar paquete
            </button>
          </div>
        </Sección>
      )}

      {/* Sección: Variantes */}
      <Sección
        titulo="Variantes"
        descripcion={
          tipoProducto === 'evento'
            ? 'Opciones adicionales del evento. Usa "Reemplaza precio" para paquetes excluyentes y "Suma al precio" para servicios adicionales.'
            : 'Agrega opciones como color, material, etc. El precio de la variante puede reemplazar o sumarse al precio base.'
        }
      >
        <div className="flex flex-col gap-3">
          {varianteFields.map((field, i) => {
            const imagenActual = watch(`variantes.${i}.imagen_url`)
            const tipoPrecioActual = watch(`variantes.${i}.tipo_precio`) ?? 'reemplaza'
            return (
              <div key={field.id} className="rounded-xl border border-border p-4 flex flex-col gap-3 bg-background-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground-muted">Variante {i + 1}</span>
                  <button type="button" onClick={() => removeVariante(i)} className="text-foreground-muted hover:text-danger transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Campo oculto para que RHF registre tipo_precio y lo incluya en handleSubmit */}
                <input type="hidden" {...register(`variantes.${i}.tipo_precio`)} />

                {/* Tipo de precio */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue(`variantes.${i}.tipo_precio`, 'reemplaza', { shouldDirty: true })}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-semibold border-2 transition-all',
                      tipoPrecioActual === 'reemplaza'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-foreground-muted hover:border-primary/30'
                    )}
                  >
                    Reemplaza precio
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue(`variantes.${i}.tipo_precio`, 'suma', { shouldDirty: true })}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-semibold border-2 transition-all',
                      tipoPrecioActual === 'suma'
                        ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600'
                        : 'border-border text-foreground-muted hover:border-emerald-400/30'
                    )}
                  >
                    + Suma al precio (add-on)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Input placeholder="Nombre (ej: Color Rojo)" error={errors.variantes?.[i]?.nombre?.message} {...register(`variantes.${i}.nombre`)} />
                  <Input placeholder="Descripción (opcional)" {...register(`variantes.${i}.descripcion`)} />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={tipoPrecioActual === 'suma' ? '+ Precio adicional' : 'Precio (reemplaza al base)'}
                    {...register(`variantes.${i}.precio_variante`)}
                  />
                  {tipoProducto === 'producto' && (
                    <Input type="number" placeholder="Stock (Opc)" {...register(`variantes.${i}.stock_variante`)} />
                  )}
                </div>

                {/* Imagen de variante */}
                <div className="flex items-center gap-3">
                  {imagenActual ? (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagenActual} alt="Variante" className="w-full h-full object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={async () => {
                          await eliminarImagenVariante(imagenActual)
                          setValue(`variantes.${i}.imagen_url`, '')
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}
                  <label className={cn(
                    'flex items-center gap-2 text-xs font-medium cursor-pointer px-3 py-2 rounded-lg border border-dashed transition-all',
                    subiendoVariante === i
                      ? 'border-primary/40 text-primary/60 cursor-wait'
                      : 'border-border text-foreground-muted hover:border-primary/50 hover:text-primary'
                  )}>
                    <ImagePlus className="w-3.5 h-3.5" />
                    {subiendoVariante === i ? 'Subiendo…' : imagenActual ? 'Cambiar imagen' : 'Agregar imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={subiendoVariante === i}
                      onChange={async (e) => {
                        const archivo = e.target.files?.[0]
                        if (!archivo) return
                        setSubiendoVariante(i)
                        const url = await subirImagenVariante(archivo)
                        if (url) setValue(`variantes.${i}.imagen_url`, url)
                        setSubiendoVariante(null)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {imagenActual && (
                    <span className="text-[11px] text-foreground-muted">Esta imagen se mostrará al seleccionar esta variante</span>
                  )}
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => appendVariante({ nombre: '', descripcion: '', precio_variante: '', imagen_url: '', tipo_precio: 'reemplaza' })}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar variante
          </button>
        </div>
      </Sección>

      {/* Sección: Tallas */}
      {tipoProducto === 'producto' && (
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
                      <input
                        {...register(`tallas.${i}.stock_talla`)}
                        placeholder="Stock"
                        type="number"
                        className="w-16 h-9 px-2 text-xs rounded-xl border border-input-border bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button type="button" onClick={() => removeTalla(i)} className="text-foreground-muted hover:text-danger transition-colors ml-1">
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
      )}

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

      {/* Sección: Video */}
      <Sección
        titulo={tipoProducto === 'servicio' ? 'Video del servicio' : tipoProducto === 'evento' ? 'Video del evento' : 'Video del producto'}
        descripcion="Pega el enlace de YouTube o Vimeo. Si no hay video, el botón no aparece en la tienda."
      >
        <div className="relative">
          <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            {...register('url_video')}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </Sección>

      {/* Sección: Productos relacionados */}
      {productosExistentes.length > 0 && (
        <Sección titulo="Productos relacionados" descripcion="Aparecen en la página del producto para incentivar más compras.">
          <div className="flex flex-col gap-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
              <input
                type="text"
                value={busquedaRelacionados}
                onChange={e => setBusquedaRelacionados(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Seleccionados */}
            {relacionados.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {relacionados.map(id => {
                  const p = productosExistentes.find(p => p.id === id)
                  if (!p) return null
                  return (
                    <span key={id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                      {p.nombre}
                      <button type="button" onClick={() => setRelacionados(prev => prev.filter(r => r !== id))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Lista filtrada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {productosExistentes
                .filter(p => p.id !== producto?.id)
                .filter(p => p.nombre.toLowerCase().includes(busquedaRelacionados.toLowerCase()))
                .map(p => (
                  <label key={p.id} className={cn(
                    'flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border transition-all',
                    relacionados.includes(p.id)
                      ? 'bg-primary/5 border-primary/30 text-primary'
                      : 'border-transparent hover:bg-background-subtle text-foreground'
                  )}>
                    <input
                      type="checkbox"
                      checked={relacionados.includes(p.id)}
                      onChange={e => {
                        if (e.target.checked) setRelacionados(prev => [...prev, p.id])
                        else setRelacionados(prev => prev.filter(id => id !== p.id))
                      }}
                      className="rounded accent-primary"
                    />
                    <span className="text-sm leading-tight">{p.nombre}</span>
                  </label>
                ))}
              {productosExistentes.filter(p => p.id !== producto?.id && p.nombre.toLowerCase().includes(busquedaRelacionados.toLowerCase())).length === 0 && (
                <p className="text-xs text-foreground-muted col-span-2 py-2 text-center">Sin resultados</p>
              )}
            </div>
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
