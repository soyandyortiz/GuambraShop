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
│   ├── categoria/[slug]/  ← Productos por categoría
│   └── pedido/[numero]/   ← Confirmación de pedido
├── api/
│   ├── auth/logout/       ← Cierra sesión (Route Handler)
│   ├── superadmin/reset-password/
│   ├── admin/
│   │   └── importar-clientes/ ← Crea clientes desde pedidos existentes
│   ├── email/
│   │   ├── confirmacion-pedido/ ← Email automático al cliente tras compra online
│   │   ├── enviar-ride/         ← Envía RIDE PDF al comprador (manual)
│   │   └── probar/              ← Prueba de credenciales SMTP/Resend
│   ├── facturacion/
│   │   ├── emitir/        ← Emite factura electrónica al SRI
│   │   ├── desde-pedido/  ← Emite factura a partir de un pedido existente
│   │   ├── nota-credito/  ← Emite Nota de Crédito
│   │   ├── ride/          ← Genera RIDE PDF
│   │   └── xml/           ← Descarga XML firmado
│   └── telegram/          ← Notificaciones Telegram (opcional)
│       ├── notificar-pedido/
│       ├── notificar-solicitud/
│       ├── notificar-confirmacion-evento/
│       └── notificar-stock-bajo/
└── admin/
    ├── page.tsx           ← Login (admin y superadmin)
    └── dashboard/
        ├── productos/
        ├── categorias/
        ├── cupones/
        ├── promociones/
        ├── envios/
        ├── pedidos/       ← Órdenes de clientes
        ├── clientes/      ← Base de datos de clientes (con importación desde pedidos)
        ├── ingresos/      ← Resumen financiero con filtro por fechas
        ├── facturacion/   ← Facturas electrónicas SRI
        ├── email/         ← Configuración de email (solo superadmin)
        ├── impresion/     ← Config impresión térmica 58/80mm (solo superadmin)
        ├── venta-nueva/   ← POS (Punto de Venta)
        ├── solicitudes/   ← Solicitudes de cotización para eventos
        ├── calendario/    ← Vista calendario de citas
        ├── citas/         ← Tabla de citas agendadas
        ├── resenas/       ← Reseñas de productos
        ├── perfil/
        └── mensajes/
```

## Páginas del dashboard

Todas las páginas bajo `admin/dashboard/` que hacen consultas al servidor deben incluir al inicio:

```ts
export const dynamic = 'force-dynamic'
```

Esto evita que Next.js las trate como rutas estáticas en build.

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
- `src/lib/locales.ts` → multi-país (EC, PE, CO): `obtenerRegiones()`, `obtenerCiudades()`, `obtenerInfoPais()`, `INFO_PAIS`
- `src/lib/ecuador.ts` → lista de provincias/ciudades **solo Ecuador** (más granular); legado — usar `locales.ts` en código nuevo
- `src/hooks/usar-conteos-admin.ts` → badges en tiempo real para pedidos pendientes, citas y solicitudes nuevas
- `src/lib/ticket.ts` → `imprimirTicket(pedido, config)` — genera e imprime ticket térmico 58/80mm via `window.open()`
- `src/lib/email/enviar.ts` → `enviarEmail(opts)` — soporta Gmail SMTP, SMTP propio y Resend
- `src/lib/email/verificar-limite.ts` → `verificarLimiteEmail()` — comprueba cuota diaria/mensual antes de enviar
- `src/lib/email/enviar-ride-auto.ts` → `enviarRideAuto(facturaId)` — envío automático del RIDE al autorizarse una factura

### Campos de `configuracion_tienda` fuera del tipo TS

`ConfiguracionTienda` en `types/index.ts` **no incluye** `color_primario`, `cobro_activo`, `fecha_inicio_sistema`, `dias_pago`, ni los campos de ticket (`ticket_ancho_papel`, `ticket_linea_1..4`, `ticket_texto_pie`, `ticket_pie_2`, `ticket_mostrar_precio_unit`). Estos campos existen en la base de datos y se consultan con `.select(...)` directo. Al editar queries sobre `configuracion_tienda`, agrégalos manualmente al select si se necesitan.

### `ItemCarrito` duplicado

`ItemCarrito` está definido en `src/types/index.ts` **y** en `src/components/providers/carrito-provider.tsx`. Los componentes que usen `useCarritoContext()` deben importar `ItemCarrito` desde el provider, no desde `types`.

## Theming dinámico

El color de la tienda se lee de `configuracion_tienda.color_primario` en el `RootLayout` del servidor y se aplica como CSS variables globales (`--primary`, `--primary-hover`, `--primary-foreground`). Siempre usar `var(--primary)` o la clase `bg-primary` en lugar de colores hardcodeados.

## Base de datos (25 tablas)

Schema en `supabase/migrations/`. Aplicar en orden cronológico. Ver README.md para la secuencia completa.

| Tabla | Propósito |
|-------|-----------|
| `perfiles` | Extiende auth.users con rol admin/superadmin |
| `configuracion_tienda` | Una sola fila — datos del negocio + citas + cobro + país + campos de ticket térmico (`ticket_ancho_papel`, `ticket_linea_1..4`, `ticket_texto_pie`, `ticket_pie_2`, `ticket_mostrar_precio_unit`) |
| `configuracion_facturacion` | Datos SRI: RUC, certificado p12, ambiente (pruebas/produccion), secuenciales |
| `configuracion_email` | Credenciales SMTP/Resend, `envio_automatico`, `activo` |
| `clientes` | Base de datos de clientes con campos SRI (tipo_identificacion, identificacion, razon_social); FK opcional en `pedidos.cliente_id` |
| `direcciones_negocio` | Múltiples direcciones físicas |
| `redes_sociales` | Botones de redes sociales |
| `mensajes_admin` | Del superadmin al admin |
| `categorias` | Con subcategorías via parent_id |
| `productos` | Full-text search en español; `tipo_producto: 'producto' \| 'servicio' \| 'evento' \| 'alquiler'`; `tarifa_iva: 0 \| 5 \| 15` |
| `imagenes_producto` | Máx 5 imágenes, orden=0 es la principal |
| `variantes_producto` | `tipo_precio: 'reemplaza'` (sustituye precio base) o `'suma'` (add-on) |
| `tallas_producto` | Tallas disponibles (aplica si `requiere_tallas=true`) |
| `productos_relacionados` | Selección manual |
| `likes_producto` | Anónimos via session_id (localStorage) |
| `resenas_producto` | Nombre + cédula obligatorios; `es_visible` controla aprobación |
| `cupones` | tipo: 'porcentaje' o 'fijo'; valida `vence_en`, `max_usos` y `compra_minima` |
| `promociones` | Modal: cuadrado / horizontal / vertical |
| `zonas_envio` | Provincia, empresa, precio, tiempo |
| `leads` | Teléfonos capturados por modal de promoción |
| `pedidos` | Órdenes completas; `tipo: 'delivery' \| 'local'`; `es_venta_manual: bool`; `forma_pago`; `cliente_id FK`; `datos_facturacion JSONB` |
| `facturas` | Facturas y Notas de Crédito SRI; `tipo: 'factura' \| 'nota_credito'`; `email_enviado_en/a` para historial |
| `alquileres` | Reservas de productos de alquiler; `fecha_inicio`, `fecha_fin`, `dias`, `estado` |
| `citas` | Reservas de servicios agendados; `estado: 'pendiente' \| 'reservada' \| 'confirmada' \| 'cancelada'` |
| `empleados_cita` | Empleados disponibles para asignar a citas |
| `solicitudes_evento` | Solicitudes de cotización; `estado: 'nueva' \| 'en_conversacion' \| 'cotizacion_enviada' \| 'confirmada' \| 'rechazada'` |

## Productos, Servicios, Eventos y Alquileres

`tipo_producto` en la tabla `productos` puede ser `'producto'`, `'servicio'`, `'evento'` o `'alquiler'`:

- **producto**: flujo normal con stock, tallas y variantes. Al comprar (online o POS), llama `decrementar_stock(p_producto_id, p_cantidad, p_variante_id)`.
- **servicio**: oculta stock y tallas; habilita selección de cita (fecha/hora/empleado) en carrito y detalle. Requiere `configuracion_tienda.habilitar_citas = true`. Al comprar, crea fila en `citas`. Desde POS usa fecha=hoy, hora=ahora, estado=confirmada.
- **evento**: muestra paquetes (`paquetes_evento: PaqueteEvento[]`) y un formulario de solicitud que crea una fila en `solicitudes_evento`. No pasa por el carrito normal.
- **alquiler**: el cliente selecciona fechas y cantidad; precio = precio_día × días. Al comprar, crea fila en `alquileres`. Desde POS usa fecha_inicio=hoy, fecha_fin=hoy+días, estado=activo.

## Flujo del carrito (3 pasos)

`carrito-cliente.tsx` maneja el estado `paso: 'carrito' | 'envio' | 'datos'`:

1. **carrito** — ver ítems, aplicar cupón
2. **envio** — elegir retiro en tienda o delivery (selecciona zona de `zonas_envio`). Para carritos con solo servicios este paso se salta.
3. **datos** — nombre, email, teléfono del cliente → crea una fila en `pedidos` → crea `citas` y `alquileres` según corresponda → descuenta stock → envía email de confirmación (fire-and-forget) → genera enlace WhatsApp

## Punto de Venta (POS)

`src/components/admin/venta-nueva/pos-venta.tsx` — venta presencial en `/admin/dashboard/venta-nueva`.

- Seleccionar cliente de la BD o marcar **Consumidor Final** (mutuamente excluyentes)
- Para alquileres: modal para elegir cantidad y días (sin fechas, se asigna hoy automáticamente)
- Al confirmar: crea `pedido` con `es_venta_manual=true`, descuenta stock, crea `alquileres`/`citas`, habilita impresión de ticket y emisión de factura SRI

## Módulo Email

`src/lib/email/enviar.ts` es la utilidad central. Siempre usar `enviarEmail(opts)` — nunca llamar nodemailer ni la API de Resend directamente.

Emails automáticos que dispara el sistema:
- **Confirmación de pedido** (`/api/email/confirmacion-pedido`) — al crear pedido en tienda online, fire-and-forget
- **RIDE automático** (`src/lib/email/enviar-ride-auto.ts`) — al autorizar factura, si `envio_automatico=true`

Ambos verifican que `configuracion_email.activo = true` antes de enviar. Si no hay config, se omiten sin error.

## Impresión Térmica

`src/lib/ticket.ts` exporta `imprimirTicket(pedido, config: ConfigTicket)`. Abre una ventana nueva con CSS `@page { size: Xmm auto }` — sin dependencias de hardware, funciona con cualquier impresora térmica configurada en Windows/macOS.

`ConfigTicket` tiene: `anchoPapel ('58'|'80')`, `linea1..4`, `pie1`, `pie2`, `mostrarPrecioUnit`, `nombreTienda`, `simboloMoneda`. Los campos se guardan en `configuracion_tienda` con prefijo `ticket_`.

## Modo demo

El sitio puede correr en modo demo (sin Supabase real). `DemoProvider` expone `usarModoDemo()`. Los datos se persisten en localStorage mediante `DemoStore` (`src/lib/supabase/demo-store.ts`). El hook `useDemoDatos(tabla, datosServidor)` (`src/hooks/usar-demo-datos.ts`) intercala datos de servidor con los cambios locales demo. En modo demo los cambios no llegan a Supabase.

El modo demo se activa cuando `user.email === 'demo@tiendademo.local'` (comprobado en `dashboard/layout.tsx`), no vía variable de entorno.

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

Variables requeridas para módulos avanzados:
```
SUPABASE_SERVICE_ROLE_KEY # Facturación SRI, email de confirmación, email RIDE, importar-clientes
```

Variables opcionales (notificaciones Telegram):
```
TELEGRAM_BOT_TOKEN        # Token del bot de Telegram
TELEGRAM_CHAT_ID          # Chat/grupo destino de las notificaciones
CRON_SECRET               # Vercel lo inyecta automáticamente en Pro; protege el endpoint del cron
```
Si `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` no están definidas, las rutas `api/telegram/*` responden `{ ok: true, skipped: true }` sin interrumpir el flujo.

## Cron job (Vercel)

`vercel.json` define un cron que llama `GET /api/telegram/resumen-diario` diariamente a las 12:00 UTC (8:00 AM Ecuador).
El endpoint usa `SUPABASE_SERVICE_ROLE_KEY` para leer pedidos/citas/solicitudes sin sesión de usuario.
`CRON_SECRET` se valida vía header `Authorization: Bearer {secret}` si está configurado.

## Deploy por cliente

```bash
supabase link --project-ref REF_CLIENTE
supabase db push
# Crear usuarios en Supabase Auth con metadatos de rol
# Correr seed en SQL Editor de Supabase
# Configurar variables en Vercel del cliente
```
