import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { crearClienteAdmin } from '@/lib/supabase/admin'

// Tablas y columnas que pueden contener URLs de imágenes del bucket 'imagenes'
const COLUMNAS_IMAGEN = [
  { tabla: 'imagenes_producto',    columna: 'url' },
  { tabla: 'categorias',           columna: 'imagen_url' },
  { tabla: 'variantes_producto',   columna: 'imagen_url' },
  { tabla: 'configuracion_tienda', columna: 'foto_perfil_url' },
  { tabla: 'configuracion_tienda', columna: 'foto_portada_url' },
  { tabla: 'promociones',          columna: 'imagen_url' },
]

// GET — cuenta cuántas imágenes no son WebP en el bucket
export async function GET() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = crearClienteAdmin()
  const archivos = await listarTodosLosArchivos(admin)
  const pendientes = archivos.filter(a => !a.name.endsWith('.webp'))

  return NextResponse.json({ total: archivos.length, pendientes: pendientes.length, archivos: pendientes })
}

// POST — procesa un lote de paths
export async function POST(req: Request) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { paths } = await req.json() as { paths: string[] }
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'Sin paths' }, { status: 400 })
  }

  const admin = crearClienteAdmin()
  const resultados = await Promise.allSettled(paths.map(path => convertirArchivo(admin, path)))

  const ok     = resultados.filter(r => r.status === 'fulfilled').length
  const errores = resultados
    .filter(r => r.status === 'rejected')
    .map((r, i) => ({ path: paths[i], error: (r as PromiseRejectedResult).reason?.message ?? 'Error' }))

  return NextResponse.json({ ok, errores })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function listarTodosLosArchivos(admin: ReturnType<typeof crearClienteAdmin>) {
  const carpetas = ['productos', 'categorias', 'promociones', 'tienda']
  const todos: { name: string; path: string }[] = []

  for (const carpeta of carpetas) {
    const { data } = await admin.storage.from('imagenes').list(carpeta, { limit: 1000 })
    if (data) {
      todos.push(...data.filter(f => f.name && !f.name.startsWith('.')).map(f => ({
        name: f.name,
        path: `${carpeta}/${f.name}`,
      })))
    }
  }
  return todos
}

async function convertirArchivo(admin: ReturnType<typeof crearClienteAdmin>, path: string) {
  // 1. Descargar
  const { data: blob, error: errDesc } = await admin.storage.from('imagenes').download(path)
  if (errDesc || !blob) throw new Error(`No se pudo descargar: ${path}`)

  // 2. Convertir con sharp
  const buffer = Buffer.from(await blob.arrayBuffer())
  const webpBuffer = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer()

  // 3. Calcular nuevas rutas y URLs
  const pathNuevo = path.replace(/\.[^.]+$/, '.webp')

  const { data: urlVieja } = admin.storage.from('imagenes').getPublicUrl(path)
  const { data: urlNueva } = admin.storage.from('imagenes').getPublicUrl(pathNuevo)

  // 4. Subir el nuevo archivo WebP
  const { error: errSubida } = await admin.storage.from('imagenes').upload(pathNuevo, webpBuffer, {
    contentType:  'image/webp',
    cacheControl: '31536000',
    upsert:       true,
  })
  if (errSubida) throw new Error(`No se pudo subir: ${pathNuevo} — ${errSubida.message}`)

  // 5. Actualizar referencias en la BD
  if (urlVieja.publicUrl !== urlNueva.publicUrl) {
    await Promise.all(
      COLUMNAS_IMAGEN.map(({ tabla, columna }) =>
        admin.from(tabla).update({ [columna]: urlNueva.publicUrl }).eq(columna, urlVieja.publicUrl)
      )
    )
  }

  // 6. Eliminar archivo original solo si el path cambió (era .jpg/.png etc.)
  if (path !== pathNuevo) {
    await admin.storage.from('imagenes').remove([path])
  }
}
