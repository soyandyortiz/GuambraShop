# GuambraShop — Sistema de Tienda Online

**Desarrollado por GuambraWeb · Soporte: +593 982 650 929**

Sistema completo de tienda online profesional para negocios ecuatorianos. Incluye panel de administración, carrito de compras, gestión de pedidos, citas, reseñas y mucho más.

---

## MENSAJE DE VENTA PARA CLIENTES

> Copia y envía este mensaje por WhatsApp a tus clientes potenciales:

---

*¡Hola! 👋 Te presento **GuambraShop**, el sistema de tienda online que necesita tu negocio.*

*✅ Lo que incluye tu tienda:*
*• Catálogo de productos con fotos, variantes y tallas*
*• Carrito de compras con cupones de descuento*
*• Sistema de pedidos completo (los pedidos te llegan por WhatsApp)*
*• Seguimiento de pedido para tus clientes*
*• Panel de administración desde tu celular o computadora*
*• Zonas de envío con precios automáticos*
*• Promociones y modales de oferta*
*• Reseñas de productos con moderación*
*• Agenda de citas para servicios (cortes, consultas, etc.)*
*• Página de perfil de tu negocio (horario, redes sociales, métodos de pago)*
*• Diseño profesional adaptado a celular y computadora*
*• SEO incluido para que aparezcas en Google*
*• Colores personalizables según tu marca*

*💰 Precios:*
*• Tienda completa: desde $150 (pago único)*
*• Notificaciones por Telegram (te avisa cada pedido): $20 adicional*
*• Soporte técnico y mantenimiento: $15/mes*
*• Dominio personalizado (www.tunegocio.com): depende del proveedor*

*📦 Todo corre en servidores gratuitos (Vercel + Supabase) — sin mensualidad de hosting.*

*¿Te interesa? Cuéntame de tu negocio 🚀*

---

## CARACTERÍSTICAS DEL SISTEMA

### Tienda pública
| Característica | Detalle |
|---|---|
| Catálogo de productos | Con fotos, descripción, precio, precio con descuento |
| Variantes de producto | Colores, tamaños, materiales — cada variante con su precio |
| Tallas | Sistema de tallas con stock independiente por talla |
| Búsqueda | Búsqueda en tiempo real con filtros de precio |
| Categorías y subcategorías | Árbol de categorías con navegación por slug |
| Detalle de producto | Galería de fotos, video, descripción, reseñas, productos relacionados |
| Carrito de compras | 3 pasos: carrito → entrega → datos del cliente |
| Cupones de descuento | Por porcentaje o monto fijo, con fecha de vencimiento y límite de usos |
| Zonas de envío | Precios automáticos por ciudad al llenar el formulario |
| Favoritos | Se guarda en el navegador sin necesidad de cuenta |
| Seguimiento de pedido | El cliente busca su orden por número en `/pedido/[numero]` |
| Perfil de tienda | Página pública con horario, redes sociales y métodos de pago |
| Modal de promoción | Aparece automáticamente con oferta especial |
| Agenda de citas | Para negocios que ofrecen servicios con reserva de hora |
| Reseñas de productos | Los clientes dejan calificación y comentario |
| SEO completo | Open Graph, sitemap dinámico, robots.txt, metadata por producto |
| Página 404 personalizada | Con logo y botón a WhatsApp |

### Panel de administración
| Módulo | Qué permite hacer |
|---|---|
| Productos | Crear, editar, eliminar, activar/desactivar, subir hasta 5 fotos + video |
| Categorías | Con subcategorías, imagen y ordenamiento |
| Cupones | Crear códigos con límites y vencimiento |
| Promociones | Modal automático con imagen, título y precio |
| Pedidos | Ver todos los pedidos, cambiar estado, exportar CSV |
| Envíos | Configurar precios de envío por ciudad |
| Calendario | Ver y gestionar citas agendadas por los clientes |
| Reseñas | Aprobar o rechazar comentarios de clientes |
| Mensajes | El superadmin puede enviar avisos al admin del cliente |
| Perfil de tienda | Logo, portada, descripción, redes sociales, métodos de pago, horario, color |

### Notificaciones
| Canal | Cuándo llega |
|---|---|
| Telegram al admin | Cada vez que un cliente hace un pedido ($20 adicional) |
| WhatsApp | El cliente recibe enlace con resumen del pedido al finalizar |

### Roles del sistema
| Rol | Acceso |
|---|---|
| **Superadmin** (tú) | Control total: activar/suspender tiendas, gestionar cobros, resetear contraseñas |
| **Admin** (el cliente) | CRUD completo de su tienda, sin acceso a controles de cobro |

---

## IMPLEMENTACIÓN PARA NUEVO CLIENTE

Sigue este orden exacto. No saltes pasos.

---

### PARTE 1 — Configurar Supabase

#### Paso 1.1 — Crear el proyecto

1. Entra a https://supabase.com con el Gmail del cliente (o el tuyo)
2. Clic en **"New project"**
3. Llena los campos:
   - **Name:** nombre del cliente en minúsculas con guiones, ej: `tienda-margarita`
   - **Database Password:** contraseña fuerte — **guárdala en un bloc de notas**
   - **Region:** `South America (São Paulo)`
4. Clic en **"Create new project"** — espera 2-3 minutos

#### Paso 1.2 — Obtener las credenciales

1. Ve a **Settings → API**
2. Copia y guarda estos tres valores:

| Dato | Dónde encontrarlo |
|---|---|
| **Project URL** | Sección "Project URL" → algo como `https://abcdef.supabase.co` |
| **anon public** | Sección "Project API keys" → clave larga que empieza con `eyJ...` |
| **service_role secret** | Misma sección, clave más abajo — clic en "Reveal" para verla |

#### Paso 1.3 — Ejecutar las migraciones

Las migraciones crean todas las tablas. Ve a **SQL Editor → New query** y ejecuta cada archivo en este orden exacto:

| # | Archivo | Qué crea |
|---|---|---|
| 1 | `20260408000000_schema_completo.sql` | Todas las tablas principales |
| 2 | `20260408000001_leads_tallas_ajustes.sql` | Tallas y ajustes de leads |
| 3 | `20260408000002_storage_buckets.sql` | Buckets de imágenes |
| 4 | `20260408000003_seed_config.sql` | Configuración inicial de la tienda |
| 5 | `20260408000004_cobro_fields.sql` | Campos de cobro y suspensión |
| 6 | `20260408000005_color_primario.sql` | Sistema de temas de color |
| 7 | `20260408000006_remover_banner.sql` | Limpieza de campo banner |
| 8 | `20260408000007_foto_perfil_portada.sql` | Fotos de perfil y portada |
| 9 | `20260408000008_demo_user_rls.sql` | Políticas para usuario demo |
| 10 | `20260408000009_mapa_direccion.sql` | Mapa y dirección del negocio |
| 11 | `20260414000010_pedidos.sql` | Sistema completo de pedidos |
| 12 | `20260415000011_eliminar_leads_zonas_envio.sql` | Limpieza de tablas antiguas |
| 13 | `20260415000012_configuracion_citas.sql` | Configuración de agenda de citas |
| 14 | `20260415000013_tipo_producto_y_citas.sql` | Tipo producto/servicio y citas |
| 15 | `20260415000014_control_stock.sql` | Control de inventario |
| 16 | `20260415000015_rpc_restar_stock.sql` | Función para restar stock |
| 17 | `20260415000016_metodos_pago.sql` | Métodos de pago configurables |
| 18 | `20260415000017_horario_negocio.sql` | Horario de atención |
| 19 | `20260415000018_video_producto.sql` | Video en productos |
| 20 | `20260415000019_imagen_variante.sql` | Imagen por variante de producto |
| 21 | `20260415000020_pedidos_public_select.sql` | Acceso público a seguimiento |
| 22 | `20260416000021_zonas_envio.sql` | Zonas y precios de envío |

> Si una migración da error, detente y revisa el mensaje. Lo más común es ejecutarlas en orden equivocado.

#### Paso 1.4 — Ejecutar el seed del cliente

El seed carga los datos iniciales (nombre de la tienda, WhatsApp, etc.).

1. Abre `supabase/produccion/seed_nuevo_cliente.sql` en VS Code
2. Cambia los valores marcados con `-- <-- cambiar`:
   - `nombre_tienda` → nombre real del negocio, ej: `'Boutique Margarita'`
   - `descripcion` → descripción breve del negocio
   - `whatsapp` → número sin espacios ni símbolos, ej: `'0991234567'`
3. En Supabase → SQL Editor → New query → pega el contenido modificado → **Run**

#### Paso 1.5 — Crear los usuarios

Ve a **Authentication → Users → Add user → Create new user** y crea estos dos:

**Superadmin (tú):**
| Campo | Valor |
|---|---|
| Email | `0604511089@guambrashop.local` (o tu cédula) |
| Password | Contraseña segura que solo tú conozcas |
| Auto Confirm User | ✅ Activado |
| User Metadata | `{ "rol": "superadmin" }` |

**Admin (el cliente):**
| Campo | Valor |
|---|---|
| Email | El correo real del cliente, ej: `margarita@gmail.com` |
| Password | Contraseña temporal, ej: `Margarita2024` |
| Auto Confirm User | ✅ Activado |
| User Metadata | `{ "rol": "admin" }` |

> El sistema crea automáticamente la fila en `perfiles` gracias al trigger `tr_crear_perfil_al_registrar`.

> **Modo demo:** Solo se activa si existe el usuario `demo@tiendademo.local` en Auth. Para clientes reales **NO lo crees** — el modo demo quedará inactivo sin afectar nada.

#### Paso 1.6 — Verificar el Storage

1. Ve a **Storage** en el menú izquierdo
2. Deben existir los buckets: `productos` y `tienda`
3. Si no aparecen, ejecuta de nuevo la migración `20260408000002_storage_buckets.sql`

---

### PARTE 2 — Publicar en Vercel

#### Paso 2.1 — Crear proyecto en Vercel

1. Entra a https://vercel.com (con el Gmail del cliente o el tuyo)
2. Clic en **"Add New… → Project"**
3. Clic en **"Import Git Repository"**
4. Si es la primera vez, clic en **"Add GitHub Account"** y autoriza el acceso
5. Busca el repositorio **GuambraShop** y haz clic en **"Import"**

#### Paso 2.2 — Configurar variables de entorno

Antes de hacer deploy, agrega estas variables en la sección **"Environment Variables"**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | La URL del proyecto Supabase del cliente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave `anon public` del cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave `service_role secret` del cliente |
| `NEXT_PUBLIC_SITE_URL` | Dejar vacío por ahora — se actualiza después |
| `NEXT_PUBLIC_SOPORTE_WHATSAPP` | `0982650929` (tu número de soporte) |

Clic en **"Deploy"** → espera 3-5 minutos.

#### Paso 2.3 — Actualizar la URL del sitio

1. Cuando el deploy termine, copia la URL generada, ej: `https://tienda-margarita.vercel.app`
2. Ve a **Settings → Environment Variables**
3. Edita `NEXT_PUBLIC_SITE_URL` y pega la URL
4. Ve a **Deployments** → tres puntos del último deploy → **"Redeploy"**

---

### PARTE 3 — Notificaciones por Telegram (servicio adicional — $20)

El admin recibe una notificación en Telegram cada vez que un cliente hace un pedido.

#### Paso 3.1 — Crear el bot

1. Abre Telegram y busca **@BotFather**
2. Escribe `/newbot`
3. Ponle un nombre visible, ej: `Notificaciones Tienda Margarita`
4. Ponle un username que termine en `bot`, ej: `tiendamargarita_bot`
5. BotFather entrega el **token** — guárdalo:
   ```
   8671299741:AAGrzFQirgtC5ma8e06JQqNPkZ9VB3PffqY
   ```

#### Paso 3.2 — Obtener el Chat ID

1. El cliente busca el bot en Telegram y le escribe cualquier mensaje
2. Abre esta URL en el navegador (reemplaza `TU_TOKEN`):
   ```
   https://api.telegram.org/botTU_TOKEN/getUpdates
   ```
3. En el JSON busca: `"chat": { "id": 7230368603 }` — ese número es el **Chat ID**

> Si el resultado viene vacío `{"ok":true,"result":[]}`, el bot no ha recibido mensajes aún. El cliente debe escribirle primero.

> Para grupos: agrega el bot al grupo, escríbele en el grupo, y el Chat ID empieza con `-` (número negativo).

#### Paso 3.3 — Agregar variables en Vercel

| Variable | Valor |
|---|---|
| `TELEGRAM_BOT_TOKEN` | El token del BotFather |
| `TELEGRAM_CHAT_ID` | El número de Chat ID |

Guardar → Vercel redeploya automáticamente.

**Ejemplo de notificación que recibe el admin:**
```
🛒 Nuevo pedido — ORD-00042

👤 Juan Pérez
📞 +593991234567
🚚 Delivery → Quito, Pichincha

Productos:
  • Camiseta blanca x2 — $25.00
  • Pantalón negro x1 — $35.00

💰 Subtotal: $60.00
   Envío:    $3.50
   Total:    $63.50
```

> Si no se configuran estas variables, la tienda funciona con normalidad — simplemente no llegan notificaciones.

---

### PARTE 4 — UptimeRobot (evitar que Supabase se pause)

Supabase pausa los proyectos gratuitos tras 1 semana sin actividad. UptimeRobot hace un ping cada 5 minutos para mantenerlo activo — además te alerta si la tienda se cae.

1. Crea cuenta gratuita en https://uptimerobot.com
2. Clic en **"Add New Monitor"**
3. Configura:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** nombre del cliente
   - **URL:** la URL de la tienda en Vercel
   - **Monitoring Interval:** 5 minutes
4. Clic en **"Create Monitor"**

> El plan gratuito permite hasta 50 monitores — suficiente para crecer bastante.

---

### PARTE 5 — Dominio personalizado (opcional)

Si el cliente tiene un dominio propio (ej: `www.boutiquemargarita.com`):

1. Vercel → proyecto → **Settings → Domains → Add**
2. Escribe el dominio del cliente
3. Vercel indica los registros DNS a configurar en GoDaddy, Namecheap, etc.
4. Generalmente es un registro **CNAME** apuntando a `cname.vercel-dns.com`
5. Una vez verificado, actualiza `NEXT_PUBLIC_SITE_URL` con el dominio real y redeploya

---

### PARTE 6 — Actualizaciones automáticas

Cuando publiques mejoras al sistema, **todos los clientes se actualizan automáticamente**:

```bash
# En tu computadora, desde la carpeta del proyecto:
git add .
git commit -m "feat: descripción de la mejora"
git push
```

Vercel detecta el push y redeploya todos los proyectos conectados al repositorio en 2-3 minutos. El cliente no necesita hacer nada.

---

### PARTE 7 — Gestión del cobro (solo superadmin)

El sistema tiene un módulo para controlar el acceso de clientes que no pagan.

1. Entra como superadmin a `/admin`
2. Ve a **Perfil → sección Cobro**
3. Activa **"Cobro activo"** con fecha de inicio y días de pago (ej: 30 días)
4. El admin ve un contador de días restantes en su panel
5. Si el cliente no paga: activa **"Tienda suspendida"** → los visitantes ven pantalla de suspensión

---

## RUTAS DEL SISTEMA

### Tienda pública
| Ruta | Descripción |
|---|---|
| `/` | Home con productos destacados |
| `/buscar` | Buscador con filtros de precio |
| `/categorias` | Listado de categorías |
| `/categoria/[slug]` | Productos de una categoría |
| `/producto/[slug]` | Detalle del producto |
| `/carrito` | Carrito de compras (3 pasos) |
| `/favoritos` | Productos guardados |
| `/perfil-tienda` | Información pública del negocio |
| `/pedido/[numero]` | Seguimiento de pedido por número de orden |

### Panel de administración
| Ruta | Descripción |
|---|---|
| `/admin` | Login |
| `/admin/dashboard` | Inicio con estadísticas |
| `/admin/dashboard/productos` | Gestión de productos |
| `/admin/dashboard/categorias` | Gestión de categorías |
| `/admin/dashboard/cupones` | Códigos de descuento |
| `/admin/dashboard/promociones` | Modales de promoción |
| `/admin/dashboard/pedidos` | Órdenes de clientes |
| `/admin/dashboard/envios` | Zonas y precios de envío |
| `/admin/dashboard/calendario` | Agenda de citas |
| `/admin/dashboard/resenas` | Moderación de reseñas |
| `/admin/dashboard/mensajes` | Mensajes del superadmin |
| `/admin/dashboard/perfil` | Configuración de la tienda |

---

## CHECKLIST FINAL ANTES DE ENTREGAR

- [ ] Las 22 migraciones ejecutadas en orden en Supabase
- [ ] Seed personalizado con nombre y WhatsApp del cliente ejecutado
- [ ] Usuario **superadmin** creado con `{ "rol": "superadmin" }`
- [ ] Usuario **admin** creado con `{ "rol": "admin" }`
- [ ] **NO** se creó el usuario `demo@tiendademo.local`
- [ ] Buckets `productos` y `tienda` presentes en Storage
- [ ] Las 5 variables de entorno configuradas en Vercel
- [ ] Deploy exitoso (sin errores en rojo)
- [ ] `NEXT_PUBLIC_SITE_URL` actualizado con la URL real y redesplegado
- [ ] La tienda se ve correctamente en el navegador
- [ ] Login de admin funciona
- [ ] Se puede subir una imagen de prueba
- [ ] El botón de WhatsApp abre correctamente
- [ ] Monitor creado en UptimeRobot
- [ ] (Si contrató Telegram) Bot creado y variables `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` en Vercel
- [ ] Entregar al cliente: URL de la tienda, URL del admin (`/admin`), correo y contraseña

---

## SOLUCIÓN DE PROBLEMAS COMUNES

| Problema | Solución |
|---|---|
| Tienda en blanco o error 500 | Verificar que las 5 variables de entorno estén bien escritas en Vercel (sin espacios) |
| El cliente no puede entrar al admin | Verificar usuario en Supabase Auth con metadato `{ "rol": "admin" }` |
| Las imágenes no se suben | Verificar buckets en Storage — ejecutar de nuevo la migración 3 si no existen |
| Los cambios en Vercel no se ven | Vercel → Deployments → Redeploy en el último deploy |
| WhatsApp no abre | Verificar que el número en el seed no tenga `+593` ni espacios, solo 10 dígitos |
| Supabase se pausó (tienda caída) | Entrar a Supabase → proyecto → botón "Restore project" → esperar 2-3 min |
| Telegram no llega la notificación | Verificar que el cliente haya escrito al bot primero antes de obtener el Chat ID |

---

## ESTRUCTURA DEL REPOSITORIO

```
guambrashop/
├── supabase/
│   ├── migrations/              ← 22 migraciones — ejecutar en orden (Paso 1.3)
│   └── produccion/
│       ├── seed_nuevo_cliente.sql   ← Personalizar y ejecutar (Paso 1.4)
│       └── crear_usuarios.sh        ← Script de referencia para crear usuarios
├── src/
│   ├── app/
│   │   ├── (tienda)/            ← Tienda pública
│   │   ├── admin/               ← Panel de administración
│   │   ├── api/                 ← API Routes (Telegram, etc.)
│   │   ├── layout.tsx           ← Layout raíz con SEO y tema de color
│   │   ├── sitemap.ts           ← Sitemap dinámico automático
│   │   ├── robots.ts            ← Robots.txt
│   │   └── not-found.tsx        ← Página 404 personalizada
│   ├── components/
│   │   ├── admin/               ← Componentes del panel admin
│   │   └── tienda/              ← Componentes de la tienda pública
│   ├── hooks/                   ← Hooks personalizados (carrito, favoritos, etc.)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── cliente.ts       ← Supabase para el navegador
│   │   │   └── servidor.ts      ← Supabase para el servidor
│   │   ├── utils.ts             ← Funciones de utilidad
│   │   ├── whatsapp.ts          ← Generadores de mensajes WhatsApp
│   │   ├── paletas.ts           ← Sistema de colores/temas
│   │   └── ecuador.ts           ← Provincias y ciudades del Ecuador
│   └── types/index.ts           ← Tipos TypeScript
├── .env.local                   ← Variables locales (NO subir a GitHub)
├── CLAUDE.md                    ← Instrucciones para Claude Code AI
└── README.md                    ← Esta guía
```

---

*GuambraShop — Sistema de tienda online profesional para Ecuador*
*Desarrollado por GuambraWeb · +593 982 650 929*
