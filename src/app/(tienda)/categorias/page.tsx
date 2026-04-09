import { crearClienteServidor } from '@/lib/supabase/servidor'
import Link from 'next/link'
import { ChevronLeft, Package } from 'lucide-react'

export default async function PáginaCategorias() {
  const supabase = await crearClienteServidor()

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, slug, imagen_url')
    .eq('esta_activa', true)
    .is('parent_id', null)
    .order('orden')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border sticky top-0 bg-background z-10">
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-background-subtle transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-base font-bold text-foreground">Categorías</h1>
      </div>

      <div className="px-4 py-4">
        {!categorias?.length ? (
          <div className="py-20 text-center">
            <Package className="w-12 h-12 text-foreground-muted/20 mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">Sin categorías disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {categorias.map(cat => (
              <Link key={cat.id} href={`/categoria/${cat.slug}`}
                className="flex flex-col items-center gap-2 group">
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-background-subtle border border-border group-hover:border-primary/50 group-hover:shadow-sm transition-all">
                  {cat.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.imagen_url}
                      alt={cat.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Package className="w-7 h-7 text-primary/50" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-medium text-foreground-muted text-center w-full line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                  {cat.nombre}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
