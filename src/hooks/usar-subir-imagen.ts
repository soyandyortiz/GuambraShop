'use client'

import { useState } from 'react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

const MAX_MB    = 3
const MAX_BYTES = MAX_MB * 1024 * 1024
const MAX_PX    = 1200  // lado máximo en píxeles
const CALIDAD   = 0.72  // 72% calidad WebP — compresión profesional agresiva

// Convierte cualquier imagen a WebP redimensionada usando Canvas API (sin dependencias)
function convertirAWebP(archivo: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(archivo)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_PX)
          width  = MAX_PX
        } else {
          width  = Math.round((width / height) * MAX_PX)
          height = MAX_PX
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('No se pudo convertir la imagen')); return }
        const nombreBase = archivo.name.replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${nombreBase}.webp`, { type: 'image/webp' }))
      }, 'image/webp', CALIDAD)
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')) }
    img.src = url
  })
}

export function usarSubirImagen(carpeta: 'productos' | 'categorias' | 'promociones' | 'tienda') {
  const [subiendo, setSubiendo] = useState(false)
  const [error,    setError]    = useState('')

  async function subirImagen(archivo: File): Promise<string | null> {
    setError('')

    if (!archivo.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WebP, AVIF)')
      return null
    }

    if (archivo.size > MAX_BYTES) {
      setError(`La imagen no debe superar ${MAX_MB} MB`)
      return null
    }

    setSubiendo(true)
    try {
      // Convertir a WebP antes de subir
      const convertida = await convertirAWebP(archivo)

      const supabase = crearClienteSupabase()
      const nombre   = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

      const { error: errSubida } = await supabase.storage
        .from('imagenes')
        .upload(nombre, convertida, {
          contentType:  'image/webp',
          cacheControl: '31536000', // 1 año — los WebP son inmutables (nuevo nombre cada vez)
          upsert:       false,
        })

      if (errSubida) {
        setError('Error al subir la imagen. Intenta de nuevo.')
        return null
      }

      const { data } = supabase.storage.from('imagenes').getPublicUrl(nombre)
      return data.publicUrl
    } catch {
      setError('No se pudo procesar la imagen. Intenta con otro archivo.')
      return null
    } finally {
      setSubiendo(false)
    }
  }

  async function eliminarImagen(url: string): Promise<void> {
    const supabase = crearClienteSupabase()
    const partes = url.split('/imagenes/')
    if (partes.length < 2) return
    await supabase.storage.from('imagenes').remove([partes[1]])
  }

  return { subirImagen, eliminarImagen, subiendo, error }
}
