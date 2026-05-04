import { crearClienteServidor } from '@/lib/supabase/servidor'
import { HeaderTienda } from '@/components/tienda/header-tienda'
import { NavInferior } from '@/components/tienda/nav-inferior'
import { ModalPromocionPub } from '@/components/tienda/modal-promocion-pub'
import { CarruselCategorias } from '@/components/tienda/carrusel-categorias'
import { TiendaPrincipal } from '@/components/tienda/tienda-principal'
import { FooterTienda } from '@/components/tienda/footer-tienda'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await crearClienteServidor()
  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('nombre_tienda, meta_descripcion, logo_url, foto_perfil_url')
    .single()

  const nombre      = config?.nombre_tienda ?? 'Tienda'
  const descripcion = config?.meta_descripcion ?? 'Tu tienda online profesional'
  const ogImage     = config?.foto_perfil_url ?? config?.logo_url ?? null

  return {
    openGraph: {
      title: nombre,
      description: descripcion,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: nombre }],
      }),
    },
    twitter: {
      ...(ogImage && { images: [ogImage] }),
    },
  }
}

export default async function PáginaInicio() {
  const supabase = await crearClienteServidor()
  const ahora = new Date().toISOString()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: config },
    { data: categorias },
    { data: minProd },
    { data: maxProd },
    { data: promocion },
    { data: perfil },
  ] = await Promise.all([
    supabase.from('configuracion_tienda')
      .select('nombre_tienda, logo_url, esta_activa, mensaje_suspension, info_pago, whatsapp')
      .single(),
    supabase.from('categorias')
      .select('id, nombre, slug, parent_id, imagen_url')
      .eq('esta_activa', true)
      .order('orden')
      .limit(60),
    supabase.from('productos').select('precio').eq('esta_activo', true).order('precio', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('productos').select('precio').eq('esta_activo', true).order('precio', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('promociones')
      .select('id, nombre, descripcion, precio, imagen_url, formato_imagen, mensaje_whatsapp')
      .eq('esta_activa', true)
      .or(`inicia_en.is.null,inicia_en.lte.${ahora}`)
      .or(`termina_en.is.null,termina_en.gte.${ahora}`)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle(),
    user
      ? supabase.from('perfiles').select('rol').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  // Valores por defecto para el rango de precios
  const precioMinGlobal = minProd?.precio ?? 0
  const precioMaxGlobal = maxProd?.precio ?? 1000

  // Tienda suspendida
  if (config && !config.esta_activa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{config.nombre_tienda}</h1>
          <p className="text-sm text-foreground-muted mt-2 leading-relaxed">{config.mensaje_suspension}</p>
          {config.info_pago && (
            <div className="mt-4 p-3 rounded-xl bg-background-subtle border border-border text-left">
              <p className="text-xs font-semibold text-foreground mb-1">Información de contacto:</p>
              <p className="text-sm text-foreground-muted whitespace-pre-wrap">{config.info_pago}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <HeaderTienda
        nombreTienda={config?.nombre_tienda ?? 'Tienda'}
        logoUrl={config?.logo_url ?? null}
      />

      <main className="pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Categorías (Carrusel) */}
          <CarruselCategorias categorias={(categorias ?? []).filter((c: any) => !c.parent_id)} />

          {/* Tienda Principal (Buscador, Filtros y Productos Secuenciales) */}
          <TiendaPrincipal
            precioMinGlobal={precioMinGlobal}
            precioMaxGlobal={precioMaxGlobal}
            categorias={categorias ?? []}
          />
          <FooterTienda />
        </div>
      </main>

      <NavInferior esAdmin={perfil?.rol === 'admin' || perfil?.rol === 'superadmin'} />

      {promocion && config?.whatsapp && (
        <ModalPromocionPub promocion={promocion} whatsapp={config.whatsapp} />
      )}
    </div>
  )
}

