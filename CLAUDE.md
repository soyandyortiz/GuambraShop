# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos esenciales

```bash
npm run dev      # Desarrollo local → http://localhost:3000
npm run build    # Compilar para producción
npm run lint     # Verificar errores
```

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL + Auth + Storage)
- **Radix UI** + Lucide React + Framer Motion
- **React Hook Form** + Zod | **Sonner** (notificaciones)

## Estructura de rutas

```
src/app/
├── (tienda)/              ← Tienda pública (sin auth)
│   ├── page.tsx           ← Home
│   ├── buscar/            ← Búsqueda + filtros de precio
│   ├── carrito/           ← Carrito de compras
│   ├── favoritos/         ← Productos guardados
│   ├── categorias/        ← Listado de categorías
│   ├── perfil-tienda/     ← Info pública del negocio
│   ├── producto/[slug]/   ← Detalle del producto
│   └── categoria/[slug]/  ← Productos por categoría
└── admin/
    ├── page.tsx           ← Login (admin y superadmin)
    └── dashboard/
        ├── productos/
        ├── categorias/
        ├── cupones/
        ├── promociones/
        ├── envios/
        ├── leads/         ← Teléfonos capturados
        ├── resenas/       ← Reseñas de productos
        ├── perfil/
        └── mensajes/
```

## Clientes Supabase

- `src/lib/supabase/cliente.ts` → componentes con `'use client'`
- `src/lib/supabase/servidor.ts` → Server Components y Route Handlers

## Tipos y utilidades

- `src/types/index.ts` → todos los tipos TypeScript (reflejan las tablas de Supabase exactamente)
- `src/lib/utils.ts` → `cn()`, `formatearPrecio()`, `calcularDescuento()`, `generarSlug()`, `generarSessionId()`
- `src/lib/whatsapp.ts` → generadores de mensajes de WhatsApp
- `src/lib/paletas.ts` → `PALETAS[]` y `obtenerPaleta(color)` — 8 paletas predefinidas

## Theming dinámico

El color de la tienda se lee de `configuracion_tienda.color_primario` en el `RootLayout` del servidor y se aplica como CSS variables globales (`--primary`, `--primary-hover`, `--primary-foreground`). Siempre usar `var(--primary)` o la clase `bg-primary` en lugar de colores hardcodeados.

## Base de datos (17 tablas)

Schema en `supabase/migrations/`. Aplicar en orden cronológico.

| Tabla | Propósito |
|-------|-----------|
| `perfiles` | Extiende auth.users con rol admin/superadmin |
| `configuracion_tienda` | Una sola fila — datos del negocio + campos de cobro (`cobro_activo`, `fecha_inicio_sistema`, `dias_pago`) |
| `direcciones_negocio` | Múltiples direcciones físicas |
| `redes_sociales` | Botones de redes sociales |
| `mensajes_admin` | Del superadmin al admin |
| `categorias` | Con subcategorías via parent_id |
| `productos` | Full-text search en español |
| `imagenes_producto` | Máx 5 imágenes, orden=0 es la principal |
| `variantes_producto` | precio_variante reemplaza al precio base |
| `tallas_producto` | Tallas disponibles (aplica si `requiere_tallas=true`) |
| `productos_relacionados` | Selección manual |
| `likes_producto` | Anónimos via session_id (localStorage) |
| `resenas_producto` | Nombre + cédula obligatorios |
| `cupones` | tipo: 'porcentaje' o 'fijo' |
| `promociones` | Modal: cuadrado / horizontal / vertical |
| `zonas_envio` | Provincia, empresa, precio, tiempo |
| `leads` | Teléfonos capturados por modal de promoción |

## Roles

- `superadmin`: acceso total + puede cambiar `esta_activa`, `info_pago` y controles de cobro
- `admin`: CRUD de todo excepto `esta_activa`, `info_pago` y campos de cobro. Ve un contador de días restantes de pago si `cobro_activo=true`
- Público: solo lectura de registros activos

Verificación via función SQL `obtener_rol()` en políticas RLS.

## Credenciales demo

- Superadmin: `0604511089` / `0604511089`
- Admin: `admin@tiendademo.com` / `admin`

Se crean en Supabase Auth con metadatos `{ "rol": "superadmin" }` o `{ "rol": "admin" }`. El trigger `tr_crear_perfil_al_registrar` crea automáticamente la fila en `perfiles`.

## Diseño

- Mobile-first (base), adapta a tablet 768px y laptop 1024px
- Estética: app móvil e-commerce (estilo Shopee)
- Paleta: rojo `#EF4444`, blanco, texto `#111827`, estrellas `#F59E0B`
- Bottom nav móvil: Inicio | Favoritos | Carrito | Admin
- Todo el contenido en español, búsqueda full-text con `to_tsvector('spanish', ...)`

## Estado del cliente (localStorage)

| Clave | Propósito |
|-------|-----------|
| `tienda_carrito` | Items del carrito (`ItemCarrito[]`) |
| `tienda_session_id` | UUID para likes anónimos |

El carrito vive en `CarritoProvider` (contexto global). Antes de enviar a WhatsApp el cliente elige:
1. Retiro en tienda física (sin costo)
2. Envío a ciudad → selecciona de `zonas_envio`

Hooks personalizados: `usar-carrito.ts`, `usar-favoritos.ts`, `usar-subir-imagen.ts`.

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SOPORTE_WHATSAPP=0982650929
```

## Deploy por cliente

```bash
supabase link --project-ref REF_CLIENTE
supabase db push
# Crear usuarios en Supabase Auth con metadatos de rol
# Correr seed en SQL Editor de Supabase
# Configurar variables en Vercel del cliente
```
