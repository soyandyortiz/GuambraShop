import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PáginaPoliticas() {
  const supabase = await crearClienteServidor()

  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('nombre_tienda, politicas_negocio')
    .single()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

      {/* Volver */}
      <Link href="/perfil-tienda" className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-primary transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Volver al perfil
      </Link>

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Políticas del negocio</h1>
          {config?.nombre_tienda && (
            <p className="text-xs text-foreground-muted mt-0.5">{config.nombre_tienda}</p>
          )}
        </div>
      </div>

      {/* Contenido */}
      {config?.politicas_negocio ? (
        <div className="rounded-2xl bg-card border border-card-border p-5">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {config.politicas_negocio}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-card-border p-10 text-center">
          <FileText className="w-10 h-10 text-foreground-muted/30 mx-auto mb-3" />
          <p className="text-sm text-foreground-muted">Aún no hay políticas publicadas.</p>
        </div>
      )}

    </div>
  )
}
