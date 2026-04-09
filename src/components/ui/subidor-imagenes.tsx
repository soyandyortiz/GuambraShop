'use client'

import { useRef, useState } from 'react'
import { Upload, X, Star, Loader2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usarSubirImagen } from '@/hooks/usar-subir-imagen'

interface PropsSubidorImagenes {
  imagenes: string[]
  onCambio: (imagenes: string[]) => void
  maxImagenes?: number
  carpeta?: 'productos' | 'categorias' | 'promociones' | 'tienda'
}

export function SubidorImagenes({
  imagenes,
  onCambio,
  maxImagenes = 5,
  carpeta = 'productos',
}: PropsSubidorImagenes) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { subirImagen, eliminarImagen, subiendo, error } = usarSubirImagen(carpeta)
  const [arrastrandoSobre, setArrastrandoSobre] = useState(false)

  async function procesarArchivos(archivos: FileList | null) {
    if (!archivos) return
    const disponibles = maxImagenes - imagenes.length
    const aSubir = Array.from(archivos).slice(0, disponibles)

    const urls: string[] = []
    for (const archivo of aSubir) {
      const url = await subirImagen(archivo)
      if (url) urls.push(url)
    }

    if (urls.length > 0) onCambio([...imagenes, ...urls])
  }

  async function eliminar(url: string) {
    await eliminarImagen(url)
    onCambio(imagenes.filter(i => i !== url))
  }

  function moverAPrincipal(url: string) {
    const resto = imagenes.filter(i => i !== url)
    onCambio([url, ...resto])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setArrastrandoSobre(false)
    procesarArchivos(e.dataTransfer.files)
  }

  const puedeSeguirSubiendo = imagenes.length < maxImagenes

  return (
    <div className="flex flex-col gap-3">
      {/* Zona de arrastre */}
      {puedeSeguirSubiendo && (
        <div
          onClick={() => !subiendo && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastrandoSobre(true) }}
          onDragLeave={() => setArrastrandoSobre(false)}
          onDrop={onDrop}
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200',
            arrastrandoSobre
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-background-subtle',
            subiendo && 'pointer-events-none opacity-60'
          )}
        >
          {subiendo ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-foreground-muted">Subiendo imagen...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-background-subtle flex items-center justify-center">
                <Upload className="w-5 h-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Haz clic o arrastra imágenes aquí
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  JPG, PNG, WebP — máx. 5MB por imagen
                  ({imagenes.length}/{maxImagenes} subidas)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => procesarArchivos(e.target.files)}
      />

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {/* Miniaturas */}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {imagenes.map((url, i) => (
            <div key={url} className="relative group aspect-square">
              <div className={cn(
                'w-full h-full rounded-xl overflow-hidden border-2 transition-all',
                i === 0 ? 'border-primary' : 'border-border'
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Imagen ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Badge principal */}
              {i === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  Principal
                </div>
              )}

              {/* Controles al hover */}
              <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => moverAPrincipal(url)}
                    title="Hacer principal"
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-primary flex items-center justify-center transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => eliminar(url)}
                  title="Eliminar"
                  className="w-7 h-7 rounded-lg bg-white/20 hover:bg-danger flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}

          {/* Placeholder vacíos */}
          {Array.from({ length: maxImagenes - imagenes.length }).map((_, i) => (
            <div
              key={`vacio-${i}`}
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-foreground-muted/40" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
