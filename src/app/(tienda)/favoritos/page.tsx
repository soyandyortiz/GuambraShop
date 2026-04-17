'use client'

import { useEffect, useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { usarFavoritos } from '@/hooks/usar-favoritos'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'

interface Producto {
  id: string; nombre: string; slug: string; precio: number
  precio_descuento: number | null; imagen_url: string | null
  etiquetas: string[]; variante_count: number
  tipo_producto?: 'producto' | 'servicio'
  stock?: number | null
}

export default function PáginaFavoritos() {
  const { favoritos } = usarFavoritos()
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (favoritos.length === 0) { setCargando(false); return }

    const supabase = crearClienteSupabase()
    supabase
      .from('productos')
      .select('id, nombre, slug, precio, precio_descuento, etiquetas, tipo_producto, stock, imagenes_producto(url, orden), variantes_producto(id)')
      .in('id', favoritos)
      .eq('esta_activo', true)
      .then(({ data }) => {
        if (!data) { setCargando(false); return }

        function imagenPrincipal(imgs: { url: string; orden: number }[]): string | null {
          if (!imgs?.length) return null
          return [...imgs].sort((a, b) => a.orden - b.orden)[0].url
        }

        setProductos(data.map(p => ({
          id: p.id,
          nombre: p.nombre,
          slug: p.slug,
          precio: p.precio,
          precio_descuento: p.precio_descuento,
          imagen_url: imagenPrincipal((p.imagenes_producto ?? []) as { url: string; orden: number }[]),
          etiquetas: p.etiquetas ?? [],
          variante_count: ((p.variantes_producto ?? []) as { id: string }[]).length,
          tipo_producto: (p as any).tipo_producto,
          stock: (p as any).stock ?? null,
        })))
        setCargando(false)
      })
  }, [favoritos])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <h1 className="text-lg font-bold text-foreground">Favoritos</h1>
        {favoritos.length > 0 && (
          <span className="text-sm text-foreground-muted">({favoritos.length})</span>
        )}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : favoritos.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-sm font-medium text-foreground">Sin favoritos aún</p>
          <p className="text-xs text-foreground-muted mt-1">Toca el corazón en cualquier producto para guardarlo aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {productos.map(p => (
            <TarjetaProducto key={p.id} {...p} />
          ))}
        </div>
      )}
    </div>
  )
}
