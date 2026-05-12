export const dynamic = 'force-dynamic'

import { HardDrive, ExternalLink, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { obtenerUsoStorage, formatearBytes, LIMITE_STORAGE_BYTES } from '@/lib/storage-uso'
import { cn } from '@/lib/utils'
import { BotonMigrarImagenes } from '@/components/admin/boton-migrar-imagenes'
import { BotonActualizarStorage } from '@/components/admin/boton-actualizar-storage'

export default async function PáginaAlmacenamiento() {
  const uso = await obtenerUsoStorage()

  const colorPrincipal =
    uso.nivel === 'critico'    ? { barra: 'bg-red-500',    texto: 'text-red-600',    bg: 'bg-red-50',    borde: 'border-red-200' } :
    uso.nivel === 'advertencia'? { barra: 'bg-amber-500',  texto: 'text-amber-600',  bg: 'bg-amber-50',  borde: 'border-amber-200' } :
                                 { barra: 'bg-emerald-500', texto: 'text-emerald-600', bg: 'bg-emerald-50', borde: 'border-emerald-200' }

  const IconoNivel =
    uso.nivel === 'critico'    ? XCircle :
    uso.nivel === 'advertencia'? AlertTriangle :
    CheckCircle2

  const libreBytes = LIMITE_STORAGE_BYTES - uso.totalBytes

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-3xl">

      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <HardDrive className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Almacenamiento</h1>
          <p className="text-sm text-foreground-muted font-medium">
            Plan gratuito Supabase · Límite 1 GB
          </p>
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className={cn('rounded-3xl border-2 p-6', colorPrincipal.bg, colorPrincipal.borde)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconoNivel className={cn('w-5 h-5', colorPrincipal.texto)} />
            <span className={cn('text-sm font-bold', colorPrincipal.texto)}>
              {uso.nivel === 'critico'     ? 'Almacenamiento crítico' :
               uso.nivel === 'advertencia' ? 'Espacio limitado' :
               'Almacenamiento saludable'}
            </span>
          </div>
          <span className={cn('text-2xl font-black', colorPrincipal.texto)}>
            {uso.porcentaje.toFixed(1)}%
          </span>
        </div>

        {/* Barra grande */}
        <div className="h-4 rounded-full bg-white/60 overflow-hidden mb-4">
          <div
            className={cn('h-full rounded-full transition-all', colorPrincipal.barra)}
            style={{ width: `${uso.porcentaje}%` }}
          />
        </div>

        {/* Números */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className={cn('text-lg font-black', colorPrincipal.texto)}>{formatearBytes(uso.totalBytes)}</p>
            <p className="text-xs text-foreground-muted font-medium">Usado</p>
          </div>
          <div>
            <p className="text-lg font-black text-foreground-muted">{formatearBytes(libreBytes)}</p>
            <p className="text-xs text-foreground-muted font-medium">Libre</p>
          </div>
          <div>
            <p className="text-lg font-black text-foreground">{formatearBytes(LIMITE_STORAGE_BYTES)}</p>
            <p className="text-xs text-foreground-muted font-medium">Total</p>
          </div>
        </div>
      </div>

      {/* Desglose por bucket */}
      <div>
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          Desglose por tipo de archivo
        </h2>

        <div className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-sm">
          {uso.buckets.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-60" />
              <p className="text-sm font-semibold">Sin archivos almacenados</p>
              <p className="text-xs mt-1">El storage está vacío</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {uso.buckets.map(bucket => (
                <div key={bucket.id} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{bucket.icono}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{bucket.nombre}</p>
                        <p className="text-xs text-foreground-muted">
                          {bucket.archivos} {bucket.archivos === 1 ? 'archivo' : 'archivos'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">{formatearBytes(bucket.bytes)}</p>
                      <p className="text-xs text-foreground-muted">
                        {bucket.porcentaje.toFixed(1)}% del espacio usado
                      </p>
                    </div>
                  </div>
                  {/* Barra proporcional al espacio del límite total, no solo del usado */}
                  <div className="h-2 rounded-full bg-background-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(bucket.bytes / LIMITE_STORAGE_BYTES) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guía de consumo estimado */}
      {/* Herramienta de optimización */}
      <BotonMigrarImagenes />

      <div>
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">
          Referencia de capacidad
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icono: '🖼️', titulo: 'Fotos de producto', desc: 'Aprox. 500 KB c/u', cantidad: `~${Math.floor(libreBytes / 512_000).toLocaleString()} fotos` },
            { icono: '🧾', titulo: 'Comprobantes de pago', desc: 'Aprox. 300 KB c/u', cantidad: `~${Math.floor(libreBytes / 307_200).toLocaleString()} comprobantes` },
            { icono: '📄', titulo: 'Facturas PDF', desc: 'Aprox. 80 KB c/u', cantidad: `~${Math.floor(libreBytes / 81_920).toLocaleString()} facturas` },
          ].map(item => (
            <div key={item.titulo} className="bg-card border border-card-border rounded-2xl p-4">
              <span className="text-2xl">{item.icono}</span>
              <p className="text-sm font-bold text-foreground mt-2">{item.titulo}</p>
              <p className="text-xs text-foreground-muted">{item.desc}</p>
              <p className="text-sm font-black text-primary mt-2">{item.cantidad}</p>
              <p className="text-[10px] text-foreground-muted">restantes con el espacio libre</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA upgrade */}
      {uso.nivel !== 'ok' && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
          <h3 className="text-base font-black mb-1">¿Necesitas más espacio?</h3>
          <p className="text-sm text-white/80 mb-4">
            Supabase Pro incluye <strong className="text-white">100 GB de Storage</strong> por{' '}
            <strong className="text-white">$25/mes</strong>. Ideal para tiendas con catálogos
            grandes o alta facturación.
          </p>
          <a
            href="https://supabase.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Ver planes de Supabase
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Actualizar datos manualmente */}
      <BotonActualizarStorage />

      <p className="text-xs text-foreground-muted text-center">
        Los datos se cachean 1 hora. Usa el botón de arriba para ver los números en tiempo real.{' '}
        <ExternalLink className="w-3 h-3 inline" />
      </p>
    </div>
  )
}
