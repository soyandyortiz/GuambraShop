import { crearClienteServidor } from '@/lib/supabase/servidor'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ahora   = new Date()

  const supabase = await crearClienteServidor()

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from('productos')
      .select('slug, actualizado_en')
      .eq('esta_activo', true)
      .order('creado_en', { ascending: false }),
    supabase
      .from('categorias')
      .select('slug')
      .eq('esta_activa', true),
  ])

  const rutas: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: ahora,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/categorias`,
      lastModified: ahora,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/buscar`,
      lastModified: ahora,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/perfil-tienda`,
      lastModified: ahora,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  for (const cat of categorias ?? []) {
    rutas.push({
      url: `${siteUrl}/categoria/${cat.slug}`,
      lastModified: ahora,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const prod of productos ?? []) {
    rutas.push({
      url: `${siteUrl}/producto/${prod.slug}`,
      lastModified: prod.actualizado_en ? new Date(prod.actualizado_en) : ahora,
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  return rutas
}
