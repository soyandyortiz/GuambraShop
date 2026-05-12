import { crearClienteServidor } from '@/lib/supabase/servidor'
import { HeaderTienda } from '@/components/tienda/header-tienda'
import { NavInferior } from '@/components/tienda/nav-inferior'
import { ModalPromocionPub } from '@/components/tienda/modal-promocion-pub'
import { FooterTienda } from '@/components/tienda/footer-tienda'
import { BannerCupon } from '@/components/tienda/banner-cupon'

export default async function LayoutTienda({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()

  const ahora = new Date().toISOString()

  const [{ data: config }, { data: promocion }, { data: perfil }, { data: cuponBanner }] = await Promise.all([
    supabase.from('configuracion_tienda')
      .select('nombre_tienda, logo_url, esta_activa, mensaje_suspension, info_pago, whatsapp, moneda')
      .single(),
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
    supabase.from('cupones')
      .select('codigo, tipo_descuento, valor_descuento, vence_en')
      .eq('esta_activo', true)
      .or(`inicia_en.is.null,inicia_en.lte.${ahora}`)
      .or(`vence_en.is.null,vence_en.gt.${ahora}`)
      .order('vence_en', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ])

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

      {cuponBanner && (
        <BannerCupon
          codigo={cuponBanner.codigo}
          tipo_descuento={cuponBanner.tipo_descuento as 'porcentaje' | 'fijo'}
          valor_descuento={cuponBanner.valor_descuento}
          vence_en={cuponBanner.vence_en}
          simboloMoneda={(config as { moneda?: string } | null)?.moneda ?? '$'}
        />
      )}

      <main className="pb-20">
        {children}
        <FooterTienda />
      </main>

      <NavInferior esAdmin={perfil?.rol === 'admin' || perfil?.rol === 'superadmin'} />

      {promocion && config?.whatsapp && (
        <ModalPromocionPub
          promocion={promocion}
          whatsapp={config.whatsapp}
        />
      )}
    </div>
  )
}
