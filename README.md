# Tienda Demo — Guía de implementación para nuevo cliente

Esta guía te lleva paso a paso desde cero hasta tener la tienda del cliente funcionando en producción. Sigue el orden exacto de las secciones.

---

## Requisitos previos

El cliente debe tener (o crear) estas dos cuentas gratuitas:

| Servicio | Enlace de registro | Para qué sirve |
|---|---|---|
| **Supabase** | https://supabase.com | Base de datos + autenticación + almacenamiento de imágenes |
| **Vercel** | https://vercel.com | Servidor donde vive la tienda |

Ambas cuentas se crean con Gmail en 2 minutos. Si el cliente ya las tiene, pídele acceso o trabaja en su pantalla compartida.

---

## PARTE 1 — Configurar Supabase (base de datos)

### Paso 1.1 — Crear proyecto en Supabase

1. Entra a https://supabase.com e inicia sesión con Gmail
2. Haz clic en el botón verde **"New project"**
3. Llena los campos:
   - **Organization:** elige la que aparece (generalmente tu nombre Gmail)
   - **Name:** pon el nombre del cliente, ejemplo: `tienda-margarita` (sin espacios, solo letras y guiones)
   - **Database Password:** crea una contraseña fuerte y **guardala en un bloc de notas** — la necesitarás después
   - **Region:** elige `South America (São Paulo)` — es el servidor más cercano a Ecuador
4. Haz clic en **"Create new project"**
5. Espera 2-3 minutos mientras Supabase crea todo (verás una pantalla de carga)

### Paso 1.2 — Obtener las credenciales del proyecto

Una vez creado el proyecto:

1. En el menú izquierdo, haz clic en el ícono de engranaje **"Project Settings"** (abajo del todo)
2. Haz clic en **"API"** en el submenú
3. Copia y guarda en un bloc de notas estos dos valores:
   - **Project URL** → algo como `https://abcdefghijkl.supabase.co`
   - **anon public** (bajo "Project API keys") → una clave larga que empieza con `eyJ...`

> Necesitarás estos dos valores más adelante en Vercel.

### Paso 1.3 — Ejecutar las migraciones (crear las tablas)

Las migraciones crean todas las tablas de la base de datos. Debes ejecutarlas **en orden**, una por una.

1. En el menú izquierdo de Supabase, haz clic en **"SQL Editor"** (ícono de terminal `>_`)
2. Haz clic en **"New query"** (botón azul arriba a la derecha)

Ahora ejecuta cada archivo de la carpeta `supabase/migrations/` en este orden exacto:

**Migración 1:** Copia el contenido completo del archivo `supabase/migrations/20260408000000_schema_completo.sql` y pégalo en el editor. Haz clic en **"Run"** (botón verde, abajo a la derecha). Espera a que diga `Success`.

**Migración 2:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000001_leads_tallas_ajustes.sql` y ejecuta.

**Migración 3:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000002_storage_buckets.sql` y ejecuta.

**Migración 4:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000003_seed_config.sql` y ejecuta.

**Migración 5:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000004_cobro_fields.sql` y ejecuta.

**Migración 6:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000005_color_primario.sql` y ejecuta.

**Migración 7:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000006_remover_banner.sql` y ejecuta.

**Migración 8:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000007_foto_perfil_portada.sql` y ejecuta.

**Migración 9:** Haz clic en **"New query"**, copia el contenido de `supabase/migrations/20260408000008_demo_user_rls.sql` y ejecuta.

> Si alguna migración da error, detente y revisa el mensaje. Lo más común es ejecutarlas en el orden equivocado.

### Paso 1.4 — Personalizar y ejecutar el seed del cliente

El seed carga los datos iniciales de la tienda (nombre, WhatsApp, etc.).

1. Abre el archivo `supabase/produccion/seed_nuevo_cliente.sql` en tu editor de código (VS Code, por ejemplo)
2. Cambia los valores marcados con `-- <-- cambiar`:
   - `nombre_tienda` → el nombre real de la tienda del cliente (ej: `'Boutique Margarita'`)
   - `descripcion` → descripción breve del negocio
   - `whatsapp` → número de WhatsApp del cliente **solo dígitos**, ej: `'0991234567'`
3. Guarda el archivo
4. En Supabase → SQL Editor → **"New query"**, pega el contenido modificado y haz clic en **"Run"**

### Paso 1.5 — Crear los usuarios del sistema

El sistema maneja dos roles. Crea **únicamente estos dos usuarios** en Supabase → Authentication → Users → "Add user" → "Create new user":

#### Usuario Superadmin (tú, el desarrollador)

| Campo | Valor |
|---|---|
| **Email** | `0604511089@tiendademo.local` (o tu cédula) |
| **Password** | Una contraseña segura que solo tú conozcas |
| **Auto Confirm User** | Activado |
| **User Metadata** | `{ "rol": "superadmin" }` |

> El superadmin te da control total: activar/suspender tienda, gestionar cobros, resetear contraseña del admin.

#### Usuario Admin (el cliente)

| Campo | Valor |
|---|---|
| **Email** | El correo real del cliente, ej: `margarita@gmail.com` |
| **Password** | Contraseña temporal, ej: `Margarita2024` |
| **Auto Confirm User** | Activado |
| **User Metadata** | `{ "rol": "admin" }` |

> El sistema crea automáticamente la fila en la tabla `perfiles` gracias al trigger `tr_crear_perfil_al_registrar`.

> **IMPORTANTE — Usuario demo:** El código incluye un modo demo para que clientes potenciales prueben el sistema antes de comprar. Este modo **solo se activa si existe el usuario `demo@tiendademo.local`** en Supabase Auth. Para proyectos de clientes reales **NO crees ese usuario** y el modo demo quedará completamente inactivo — no afecta el rendimiento ni el funcionamiento de la tienda.

### Paso 1.6 — Verificar el Storage (almacenamiento de imágenes)

1. En el menú izquierdo, haz clic en **"Storage"** (ícono de cubo)
2. Deberías ver estos buckets ya creados (los creó la migración 3):
   - `productos` — para fotos de productos
   - `tienda` — para logo y portada de la tienda
3. Si no aparecen, ejecuta de nuevo la migración `20260408000002_storage_buckets.sql`

---

## PARTE 2 — Preparar el código

### Paso 2.1 — Clonar el repositorio

En tu computadora (no en la del cliente), abre la terminal y ejecuta:

```bash
git clone https://github.com/TU-USUARIO/tiendademo.git tienda-cliente
cd tienda-cliente
npm install
```

> Reemplaza `TU-USUARIO` con tu usuario real de GitHub.

### Paso 2.2 — Crear archivo de variables de entorno local

1. En la carpeta raíz del proyecto, crea un archivo llamado `.env.local` (con el punto al inicio)
2. Pega este contenido y reemplaza los valores con los del cliente:

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXX
NEXT_PUBLIC_SITE_URL=https://tienda-cliente.vercel.app
NEXT_PUBLIC_SOPORTE_WHATSAPP=0982650929
```

- `NEXT_PUBLIC_SUPABASE_URL` → la URL que copiaste en el Paso 1.2
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la clave `anon public` del Paso 1.2
- `NEXT_PUBLIC_SITE_URL` → la URL final en Vercel (la sabrás en el Paso 3 — puedes poner una temporal y actualizarla después)
- `NEXT_PUBLIC_SOPORTE_WHATSAPP` → tu número de WhatsApp de soporte (el tuyo, no el del cliente)

> El archivo `.env.local` está en `.gitignore` — nunca se sube a GitHub. Es solo para pruebas locales.

### Paso 2.3 — Probar localmente (opcional pero recomendado)

```bash
npm run dev
```

Abre http://localhost:3000 en el navegador. Deberías ver la tienda vacía del cliente.

Para entrar al panel admin: http://localhost:3000/admin  
Usa el correo y contraseña que creaste en el Paso 1.5.

---

## PARTE 3 — Publicar en Vercel

### Paso 3.1 — Subir el código a GitHub

Si ya tienes el repositorio en GitHub y solo cambiaste el seed, no necesitas subir nada. Si creaste un nuevo repositorio para el cliente:

```bash
git init
git add .
git commit -m "feat: tienda para [nombre del cliente]"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/tienda-cliente.git
git push -u origin main
```

### Paso 3.2 — Crear proyecto en Vercel

1. Entra a https://vercel.com con el Gmail del cliente (o el tuyo si gestionas tú)
2. Haz clic en **"Add New..."** → **"Project"**
3. Haz clic en **"Import Git Repository"**
4. Si es la primera vez, haz clic en **"Add GitHub Account"** y autoriza el acceso
5. Busca el repositorio de la tienda y haz clic en **"Import"**

### Paso 3.3 — Configurar las variables de entorno en Vercel

En la pantalla de configuración antes de hacer deploy:

1. Baja hasta la sección **"Environment Variables"**
2. Agrega cada variable una por una (haz clic en **"Add"** después de cada una):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` (el de tu cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (la clave anon del cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave `service_role secret` de Supabase → Project Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Lo dejas vacío por ahora — lo actualizas después |
| `NEXT_PUBLIC_SOPORTE_WHATSAPP` | `0982650929` (tu número de soporte) |

> `SUPABASE_SERVICE_ROLE_KEY` es necesaria para que el superadmin pueda resetear la contraseña del admin desde el dashboard. Nunca lleva el prefijo `NEXT_PUBLIC_` y nunca se expone al navegador.

3. Haz clic en **"Deploy"** (botón negro)
4. Espera 3-5 minutos mientras Vercel compila el proyecto

### Paso 3.4 — Obtener la URL final y actualizarla

1. Cuando el deploy termine, Vercel te muestra una URL como `https://tienda-cliente.vercel.app`
2. Copia esa URL
3. Ve a **Settings** → **Environment Variables** en el proyecto de Vercel
4. Busca `NEXT_PUBLIC_SITE_URL`, haz clic en los tres puntos → **"Edit"** y pega la URL
5. Guarda el cambio
6. Ve a **Deployments** y haz clic en los tres puntos del último deploy → **"Redeploy"** para que tome el nuevo valor

---

## PARTE 3.5 — Notificaciones por Telegram (opcional pero recomendado)

Cuando un cliente hace un pedido, el admin puede recibir una notificación automática en Telegram. El código ya está implementado — solo hay que crear el bot y agregar dos variables en Vercel.

### Paso A — Crear el bot con BotFather

1. Abre Telegram y busca **@BotFather**
2. Escribe `/newbot`
3. Ponle un nombre visible (ej: `Notificaciones Tienda Margarita`)
4. Ponle un username que termine en `bot` (ej: `tiendamargarita_notif_bot`)
5. BotFather te entrega el **token** → guárdalo, se ve así:
   ```
   8671299741:AAGrzFQirgtC5ma8e06JQqNPkZ9VB3PffqY
   ```

### Paso B — Obtener el Chat ID del admin

1. En Telegram, busca el bot recién creado por su username y presiona **Start** (o escríbele `hola`)
2. Abre esta URL en el navegador (reemplaza `TU_TOKEN` con el token del paso anterior):
   ```
   https://api.telegram.org/botTU_TOKEN/getUpdates
   ```
3. En el JSON que aparece, busca este campo:
   ```json
   "chat": { "id": 7230368603 }
   ```
4. Ese número es el **Chat ID** — guárdalo

> **¿El resultado viene vacío `{"ok":true,"result":[]}`?**
> El bot no ha recibido ningún mensaje aún. Escríbele algo al bot en Telegram y vuelve a abrir la URL.

> **¿El admin quiere notificaciones en un grupo de Telegram?**
> Agrega el bot al grupo, escríbele un mensaje en el grupo, abre la URL de getUpdates y usa el `chat.id` del grupo (empieza con `-`, número negativo).

### Paso C — Agregar las variables en Vercel

En el proyecto del cliente en Vercel → **Settings → Environment Variables**, agrega:

| Variable | Valor |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | El token que dio BotFather |
| `TELEGRAM_CHAT_ID` | El número de chat ID obtenido en el paso B |

Guardar → Vercel hace redeploy automático → listo.

### Cómo se ve la notificación que le llega al admin

```
🛒 Nuevo pedido — ORD-0001

👤 Juan Pérez
📞 0991234567
🚚 Delivery → Quito, Pichincha

Productos:
  • Camiseta blanca x2 — $25.00
  • Pantalón negro x1 — $35.00

💰 Total: $60.00
```

> Si no se configuran estas variables, la tienda funciona igual — simplemente no llegan notificaciones. No genera ningún error.

---

## PARTE 4 — Personalización inicial

### Rutas del panel de administración

Una vez que el cliente entre a `/admin` con su correo y contraseña, encontrará:

| Ruta | Qué hace |
|---|---|
| `/admin` | Pantalla de inicio de sesión |
| `/admin/dashboard/productos` | Crear, editar y eliminar productos |
| `/admin/dashboard/categorias` | Organizar categorías y subcategorías |
| `/admin/dashboard/cupones` | Crear códigos de descuento |
| `/admin/dashboard/promociones` | Modales de promoción con captura de teléfonos |
| `/admin/dashboard/envios` | Zonas de envío con precios |
| `/admin/dashboard/leads` | Ver teléfonos capturados por las promociones |
| `/admin/dashboard/resenas` | Ver y gestionar reseñas de productos |
| `/admin/dashboard/perfil` | Datos de la tienda, logo, portada, redes sociales |
| `/admin/dashboard/mensajes` | Mensajes del superadmin al admin |

### Rutas de la tienda pública

| Ruta | Qué muestra |
|---|---|
| `/` | Página principal con productos destacados |
| `/buscar` | Buscador con filtros de precio |
| `/categorias` | Listado de todas las categorías |
| `/categoria/[slug]` | Productos de una categoría específica |
| `/producto/[slug]` | Detalle de un producto |
| `/carrito` | Carrito de compras (se envía por WhatsApp) |
| `/favoritos` | Productos guardados (se guarda en el navegador) |
| `/perfil-tienda` | Información pública del negocio |

### Checklist de personalización con el cliente

Pídele al cliente que entre al panel y complete esto:

- [ ] **Logo y portada** → `/admin/dashboard/perfil` → sube el logo y la foto de portada
- [ ] **Datos del negocio** → nombre, descripción, dirección, WhatsApp
- [ ] **Redes sociales** → Facebook, Instagram, TikTok, etc.
- [ ] **Categorías** → crear al menos 2-3 categorías antes de subir productos
- [ ] **Productos** → subir al menos 5 productos con foto, precio y categoría
- [ ] **Zonas de envío** → agregar las ciudades donde hace envíos con sus precios
- [ ] **Color de la tienda** → en `/admin/dashboard/perfil` puede elegir el color principal

---

## PARTE 5 — Dominio personalizado (opcional)

Si el cliente tiene un dominio propio (ej: `www.boutiquemargarita.com`):

1. En Vercel → proyecto del cliente → **"Settings"** → **"Domains"**
2. Haz clic en **"Add"** y escribe el dominio del cliente
3. Vercel te dará instrucciones para agregar registros DNS en donde el cliente tiene su dominio (GoDaddy, Namecheap, etc.)
4. Generalmente se agrega un registro **CNAME** apuntando a `cname.vercel-dns.com`
5. Una vez verificado, actualiza la variable `NEXT_PUBLIC_SITE_URL` con el dominio real y vuelve a hacer deploy

---

## PARTE 6 — Gestión del cobro (solo tú como superadmin)

El sistema tiene un módulo de cobro para controlar el acceso de los clientes que no pagan.

### Credenciales de superadmin

- **Email:** `0604511089` (o el que configures)
- **Password:** `0604511089`

> El superadmin se crea una sola vez en Supabase Auth con metadatos `{ "rol": "superadmin" }`.

### Activar el cobro a un cliente

1. Entra como superadmin a `/admin`
2. Ve a **Perfil** → sección **Cobro**
3. Activa **"Cobro activo"** y establece la **fecha de inicio** y los **días de pago** (ej: 30 días)
4. Si el cliente no paga, activa **"Tienda suspendida"** desde el mismo panel
5. El cliente verá el mensaje de suspensión en lugar de la tienda

---

## PARTE 7 — Solución de problemas comunes

### La tienda muestra error en blanco o "Internal Server Error"
- Verifica que las 4 variables de entorno estén bien escritas en Vercel (sin espacios al inicio o al final)
- Verifica que las migraciones se hayan ejecutado todas en orden

### El cliente no puede entrar al admin
- Verifica que el usuario esté creado en Supabase → Authentication → Users
- Verifica que tenga el metadato `{ "rol": "admin" }` en User Metadata
- Prueba con **"Send password reset email"** desde Supabase para que el cliente cambie su contraseña

### Las imágenes no se suben
- Verifica que los buckets `productos` y `tienda` existan en Supabase → Storage
- Si no existen, ejecuta de nuevo la migración `20260408000002_storage_buckets.sql`

### Los cambios en Vercel no se ven
- Ve a Vercel → proyecto → **Deployments** → haz clic en los tres puntos del último → **"Redeploy"**

### El botón de WhatsApp no funciona
- Verifica que el número en `supabase/produccion/seed_nuevo_cliente.sql` no tenga el `+593` ni espacios, solo los 10 dígitos: `0991234567`

---

## Resumen de archivos importantes

```
tiendademo/
├── supabase/
│   ├── migrations/          ← Ejecutar en Supabase, en orden (Paso 1.3)
│   │   ├── 20260408000000_schema_completo.sql
│   │   ├── 20260408000001_leads_tallas_ajustes.sql
│   │   ├── 20260408000002_storage_buckets.sql
│   │   ├── 20260408000003_seed_config.sql
│   │   ├── 20260408000004_cobro_fields.sql
│   │   ├── 20260408000005_color_primario.sql
│   │   ├── 20260408000006_remover_banner.sql
│   │   ├── 20260408000007_foto_perfil_portada.sql
│   │   └── 20260408000008_demo_user_rls.sql
│   └── produccion/
│       └── seed_nuevo_cliente.sql   ← Personalizar y ejecutar (Paso 1.4)
├── src/
│   ├── app/
│   │   ├── (tienda)/        ← Tienda pública
│   │   └── admin/           ← Panel de administración
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── cliente.ts   ← Supabase para componentes del navegador
│   │   │   └── servidor.ts  ← Supabase para el servidor
│   │   └── utils.ts         ← Funciones de utilidad
│   └── types/index.ts       ← Tipos TypeScript
├── .env.local               ← Variables locales (NO subir a GitHub)
└── CLAUDE.md                ← Instrucciones para Claude Code
```

---

## Checklist final antes de entregar al cliente

- [ ] Migraciones ejecutadas en orden en Supabase
- [ ] Seed personalizado con nombre y WhatsApp del cliente ejecutado
- [ ] Usuario **superadmin** creado con metadato `{ "rol": "superadmin" }`
- [ ] Usuario **admin** creado con metadato `{ "rol": "admin" }`
- [ ] **NO** se creó el usuario `demo@tiendademo.local` (solo es para la tienda demo propia)
- [ ] Buckets de Storage creados (`productos` y `tienda`)
- [ ] Variables de entorno configuradas en Vercel (incluida `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Deploy exitoso en Vercel (sin errores en rojo)
- [ ] `NEXT_PUBLIC_SITE_URL` actualizado con la URL real
- [ ] Tienda visible en el navegador
- [ ] Login de admin funciona
- [ ] Se puede subir una imagen de prueba
- [ ] El botón de WhatsApp abre correctamente
- [ ] (Opcional) Bot de Telegram creado y variables `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` configuradas en Vercel
- [ ] Entregar al cliente: URL de la tienda, URL del admin, correo y contraseña

---

*Desarrollado por GuambraWeb — soporte: +593 982 650 929*
