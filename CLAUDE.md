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
│   ├── carrito/           ← Carrito de compras (flujo 3 pasos)
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
        ├── pedidos/       ← Órdenes de clientes
        ├── citas/         ← Agenda de servicios agendados
        ├── resenas/       ← Reseñas de productos
        ├── perfil/
        └── mensajes/
```

## Clientes Supabase

- `src/lib/supabase/cliente.ts` → componentes con `'use client'`
- `src/lib/supabase/servidor.ts` → Server Components y Route Handlers

## Middleware de auth

`src/proxy.ts` exporta la función `proxy()` y el `config.matcher`. Protege `/admin/dashboard` redirigiendo a `/admin` si no hay sesión. El `middleware.ts` importa desde ahí.

## Tipos y utilidades

- `src/types/index.ts` → todos los tipos TypeScript (reflejan las tablas de Supabase exactamente)
- `src/lib/utils.ts` → `cn()`, `formatearPrecio()`, `calcularDescuento()`, `generarSlug()`, `generarSessionId()`
- `src/lib/whatsapp.ts` → generadores de mensajes de WhatsApp
- `src/lib/paletas.ts` → `PALETAS[]` y `obtenerPaleta(color)` — 8 paletas predefinidas
- `src/lib/ecuador.ts` → `PROVINCIAS_ECUADOR[]` y `CODIGOS_PAIS[]`

## Theming dinámico

El color de la tienda se lee de `configuracion_tienda.color_primario` en el `RootLayout` del servidor y se aplica como CSS variables globales (`--primary`, `--primary-hover`, `--primary-foreground`). Siempre usar `var(--primary)` o la clase `bg-primary` en lugar de colores hardcodeados.

## Base de datos (19 tablas)

Schema en `supabase/migrations/`. Aplicar en orden cronológico.

| Tabla | Propósito |
|-------|-----------|
| `perfiles` | Extiende auth.users con rol admin/superadmin |
| `configuracion_tienda` | Una sola fila — datos del negocio + citas (`habilitar_citas`, `hora_apertura`, `hora_cierre`, `duracion_cita_minutos`) + cobro (`cobro_activo`, `fecha_inicio_sistema`, `dias_pago`) |
| `direcciones_negocio` | Múltiples direcciones físicas |
| `redes_sociales` | Botones de redes sociales |
| `mensajes_admin` | Del superadmin al admin |
| `categorias` | Con subcategorías via parent_id |
| `productos` | Full-text search en español; `tipo_producto: 'producto' \| 'servicio'` |
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
| `pedidos` | Órdenes completas con `numero_orden` auto-generado; `tipo: 'delivery' \| 'local'`; `estado: 'pendiente' \| 'confirmado' \| ...` |
| `citas` | Reservas de servicios agendados; vinculadas a un `pedido_id` y `producto_id` |

## Productos vs Servicios

`tipo_producto` en la tabla `productos` puede ser `'producto'` o `'servicio'`. Los servicios ocultan stock y tallas, y habilitan la selección de cita (fecha/hora) en el carrito y el detalle. Cuando `configuracion_tienda.habilitar_citas = true` el flujo de cita queda activo para servicios.

## Flujo del carrito (3 pasos)

`carrito-cliente.tsx` maneja el estado `paso: 'carrito' | 'envio' | 'datos'`:

1. **carrito** — ver ítems, aplicar cupón
2. **envio** — elegir retiro en tienda o delivery (selecciona zona de `zonas_envio`). Para carritos con solo servicios este paso se salta.
3. **datos** — nombre, email, teléfono del cliente → crea una fila en `pedidos` → genera enlace WhatsApp

## Modo demo

El sitio puede correr en modo demo (sin Supabase real). `DemoProvider` expone `usarModoDemo()`. Los datos se persisten en localStorage mediante `DemoStore` (`src/lib/supabase/demo-store.ts`). El hook `useDemoDatos(tabla, datosServidor)` (`src/hooks/usar-demo-datos.ts`) intercala datos de servidor con los cambios locales demo. En modo demo los cambios no llegan a Supabase.

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
