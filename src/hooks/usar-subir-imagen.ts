'use client'

import { useState } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

const MAX_MB = 5
const MAX_BYTES = MAX_MB * 1024 * 1024

export function usarSubirImagen(carpeta: 'productos' | 'categorias' | 'promociones' | 'tienda') {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function subirImagen(archivo: File): Promise<string | null> {
    setError('')

    if (archivo.size > MAX_BYTES) {
      setError(`La imagen no debe superar ${MAX_MB}MB`)
      return null
    }

    if (!archivo.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WebP)')
      return null
    }

    setSubiendo(true)
    try {
      const supabase = crearClienteSupabase()
      const extension = archivo.name.split('.').pop()
      const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

      const { error: errSubida } = await supabase.storage
        .from('imagenes')
        .upload(nombre, archivo, { cacheControl: '3600', upsert: false })

      if (errSubida) {
        setError('Error al subir la imagen. Intenta de nuevo.')
        return null
      }

      const { data } = supabase.storage.from('imagenes').getPublicUrl(nombre)
      return data.publicUrl
    } finally {
      setSubiendo(false)
    }
  }

  async function eliminarImagen(url: string): Promise<void> {
    const supabase = crearClienteSupabase()
    // Extraer path del bucket desde la URL pública
    const partes = url.split('/imagenes/')
    if (partes.length < 2) return
    await supabase.storage.from('imagenes').remove([partes[1]])
  }

  return { subirImagen, eliminarImagen, subiendo, error }
}
