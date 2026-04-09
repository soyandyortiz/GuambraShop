import { crearClienteServidor } from '@/lib/supabase/servidor'
import { MapPin, MessageCircle, Star, Package, ExternalLink, Tag } from 'lucide-react'
import Link from 'next/link'
import { TarjetaProducto } from '@/components/tienda/tarjeta-producto'
import { IconoRedSocial } from '@/components/tienda/icono-red-social'
import { ModalPoliticas } from '@/components/tienda/modal-politicas'
import { generarEnlacePromocion } from '@/lib/whatsapp'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function PáginaPerfilTienda() {
  const supabase = await crearClienteServidor()
  const ahora = new Date().toISOString()

  const [
    { data: config },
    { data: direcciones },
    { data: redes },
    { data: productos },
    { count: totalProductos },
    { data: promociones },
  ] = await Promise.all([
    supabase.from('configuracion_tienda')
      .select('nombre_tienda, descripcion, logo_url, whatsapp, politicas_negocio, foto_perfil_url, foto_portada_url')
      .single(),
    supabase.from('direcciones_negocio')
      .select('id, etiqueta, direccion, ciudad, provincia, pais, es_principal')
      .order('es_principal', { ascending: false }),
    supabase.from('redes_sociales')
      .select('id, plataforma, url')
      .eq('esta_activa', true)
      .order('orden'),
    supabase.from('productos')
      .select('id, nombre, slug, precio, precio_descuento, etiquetas, imagenes_producto(url, orden), variantes_producto(id)')
      .eq('esta_activo', true)
      .order('creado_en', { ascending: false })
      .limit(6),
    supabase.from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('esta_activo', true),
    supabase.from('promociones')
      .select('id, nombre, descripcion, precio, imagen_url, formato_imagen, mensaje_whatsapp')
      .eq('esta_activa', true)
      .or(`inicia_en.is.null,inicia_en.lte.${ahora}`)
      .or(`termina_en.is.null,termina_en.gte.${ahora}`)
      .order('creado_en', { ascending: false }),
  ])

  function imagenPrincipal(imgs: { url: string; orden: number }[]): string | null {
    if (!imgs?.length) return null
    return [...imgs].sort((a, b) => a.orden - b.orden)[0].url
  }

  const urlWA = config?.whatsapp
    ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quisiera obtener más información.')}`
    : null

  return (
    <div className="max-w-2xl mx-auto pb-6">

      {/* ── Portada (Simplificada sin imagen) ─────────── */}
      <div className="relative">
        {/* Foto de portada */}
        <div className="w-full h-32 sm:h-40 overflow-hidden relative bg-card">
          {config?.foto_portada_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.foto_portada_url} alt="Portada" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
          )}
          {/* Gradiente inferior para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>

        {/* Foto de perfil (Avatar) — solapando la portada */}
        <div className="absolute -bottom-10 left-4 sm:left-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-background shadow-lg bg-background-subtle">
            {config?.foto_perfil_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.foto_perfil_url} alt={config?.nombre_tienda} className="w-full h-full object-cover" />
            ) : config?.logo_url ? (
              // Use logo if no profile photo as fallback
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo_url} alt={config?.nombre_tienda} className="w-full h-full object-contain p-2" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <span className="text-2xl font-bold text-primary">
                  {config?.nombre_tienda?.[0]?.toUpperCase() ?? 'T'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botón WhatsApp flotante derecha */}
        {urlWA && (
          <a href={urlWA} target="_blank" rel="noopener noreferrer"
            className="absolute bottom-3 right-4 flex items-center gap-2 h-9 px-4 rounded-xl bg-[#25D366] text-white text-xs font-semibold hover:bg-[#22c55e] transition-all shadow-md">
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}
      </div>

      {/* ── Info principal ───────────────────────── */}
      <div className="px-4 mt-12 sm:mt-14">
        <h1 className="text-xl font-bold text-foreground">{config?.nombre_tienda ?? 'Tienda'}</h1>

        {config?.descripcion && (
          <p className="text-sm text-foreground-muted mt-1.5 leading-relaxed">{config.descripcion}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{totalProductos ?? 0}</span>
            <span className="text-xs text-foreground-muted">productos</span>
          </div>
          {(redes?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-star fill-star" />
              <span className="text-xs text-foreground-muted">{redes!.length} redes sociales</span>
            </div>
          )}
        </div>

        {/* ── Redes sociales ──────────────────────── */}
        {(redes?.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3">Síguenos en</p>
            <div className="flex flex-wrap gap-3">
              {redes!.map(red => (
                <a key={red.id} href={red.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-card-border hover:border-primary/30 hover:shadow-sm transition-all group">
                  <IconoRedSocial plataforma={red.plataforma as string} />
                  <span className="text-xs font-medium text-foreground capitalize group-hover:text-primary transition-colors">
                    {red.plataforma}
                  </span>
                  <ExternalLink className="w-3 h-3 text-foreground-muted/50" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Direcciones ─────────────────────────── */}
        {(direcciones?.length ?? 0) > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3">Encuéntranos en</p>
            <div className="flex flex-col gap-2">
              {direcciones!.map(dir => (
                <div key={dir.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-card border border-card-border">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dir.es_principal ? 'bg-primary/10' : 'bg-background-subtle'}`}>
                    <MapPin className={`w-4 h-4 ${dir.es_principal ? 'text-primary' : 'text-foreground-muted'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{dir.etiqueta}</p>
                      {dir.es_principal && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Principal</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5">{dir.direccion}</p>
                    {(dir.ciudad || dir.provincia) && (
                      <p className="text-xs text-foreground-muted">
                        {[dir.ciudad, dir.provincia, dir.pais].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent([dir.direccion, dir.ciudad, dir.provincia].filter(Boolean).join(', '))}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline">
                      <MapPin className="w-2.5 h-2.5" /> Ver en Google Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* ── Promociones (posts) ─────────────────── */}
        {(promociones?.length ?? 0) > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              Promociones activas
            </p>
            <div className="flex flex-col gap-4">
              {promociones!.map(promo => {
                const urlWA = config?.whatsapp
                  ? generarEnlacePromocion(config.whatsapp, promo.mensaje_whatsapp)
                  : null
                return (
                  <div key={promo.id} className="rounded-2xl overflow-hidden border border-card-border bg-card shadow-sm">
                    {/* Imagen */}
                    <div className={cn(
                      'w-full overflow-hidden bg-background-subtle',
                      promo.formato_imagen === 'cuadrado'   && 'aspect-square',
                      promo.formato_imagen === 'horizontal' && 'aspect-video',
                      promo.formato_imagen === 'vertical'   && 'aspect-[4/5]',
                    )}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={promo.imagen_url}
                        alt={promo.nombre}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Contenido */}
                    <div className="p-4">
                      <p className="font-bold text-foreground text-base">{promo.nombre}</p>
                      {promo.descripcion && (
                        <p className="text-sm text-foreground-muted mt-1 leading-relaxed">{promo.descripcion}</p>
                      )}
                      {promo.precio != null && (
                        <p className="text-xl font-bold text-emerald-600 mt-2">
                          {formatearPrecio(promo.precio)}
                        </p>
                      )}
                      {urlWA && (
                        <a
                          href={urlWA}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 w-full h-11 rounded-xl bg-[#25D366] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#22c55e] transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Consultar por WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Políticas ───────────────────────────── */}
        {config?.politicas_negocio && (
          <ModalPoliticas politicas={config.politicas_negocio} />
        )}


      </div>
    </div>
  )
}
