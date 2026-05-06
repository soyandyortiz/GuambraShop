# GuambraShop — Deploy para nuevo cliente

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. En la pantalla de configuración:
   - Elegir región **América**
   - Marcar solo **Habilitar la API de datos** ✅
   - Dejar **Habilitar RLS automático** sin marcar ☐

## 2. Base de datos

En **SQL Editor** de Supabase ejecutar en este orden exacto:

### Paso 1 — Schema completo (tablas, funciones, RLS)

Abrir el archivo `supabase/schema.sql` → copiar todo el contenido → pegarlo en SQL Editor → **Run**.

> Este archivo es el schema unificado que reemplaza las migraciones 1–27. Cubre todas las tablas, políticas RLS, triggers y funciones del sistema.

### Paso 2 — Migraciones posteriores al schema

Estas migraciones se crearon después de la última versión del `schema.sql` y **deben ejecutarse una por una**, en el orden indicado:

| # | Archivo | Qué agrega |
|---|---------|------------|
| 1 | `20260421000028_tema_id.sql` | Campo `tema_id` en `configuracion_tienda` (selector de tema visual) |
| 2 | `20260501000029_tipo_alquiler.sql` | Tipo de producto `alquiler`, campos `precio_deposito` / `max_dias_alquiler` y tabla `alquileres` |
| 3 | `20260501000030_garantia_alquiler.sql` | Campo `garantia_descripcion` en `productos` |
| 4 | `20260502000031_stock_alquiler_correcto.sql` | Corrección de stock para productos de alquiler |
| 5 | `20260504000032_disponibilidad_batch_alquiler.sql` | Consulta batch de disponibilidad de alquileres |
| 6 | `20260504000033_facturacion_sri.sql` | **Módulo Facturación SRI** — tablas `configuracion_facturacion` y `facturas`, bucket privado `facturacion` en Storage |
| 7 | `20260504000034_datos_facturacion_pedido.sql` | Campo `datos_facturacion` en `pedidos` (datos SRI que el cliente ingresa en checkout) |
| 8 | `20260505000035_factura_anulacion.sql` | Campo `motivo_anulacion` en `facturas` |
| 9 | `20260505000036_configuracion_email.sql` | **Módulo Email** — tabla `configuracion_email` (credenciales SMTP/Resend, envío automático) |
| 10 | `20260505000037_tipo_contribuyente.sql` | Campo `tipo_contribuyente` en `configuracion_facturacion` (RUC / RIMPE / Artesano) |
| 11 | `20260505000038_tarifa_iva_producto.sql` | Campo `tarifa_iva` en `productos` (IVA individual por producto: 0, 5 o 15%) |
| 12 | `20260505000039_email_historial_factura.sql` | Campos `email_enviado_en` y `email_enviado_a` en `facturas` (historial de envío de RIDE) |
| 13 | `20260505000040_email_lectura_admin.sql` | Política RLS: admin puede leer `configuracion_email` (para contador de uso en dashboard y facturación) |
| 14 | `20260505000041_notas_credito.sql` | Notas de Crédito Electrónicas: campo `tipo` y `factura_origen_id` en `facturas`; campo `secuencial_nc_actual` en `configuracion_facturacion` |

Para cada una: abrir el archivo → copiar contenido → pegar en SQL Editor → **Run**.

### Paso 3 — Datos iniciales

Ejecutar `supabase/seed/01_datos_iniciales.sql` — crea la fila base en `configuracion_tienda` con valores genéricos para que la tienda arranque sin errores.

> **Nota para futuras migraciones:** cada vez que se agregue un archivo nuevo en `supabase/migrations/` con número mayor al `_028`, deberá ejecutarse manualmente aquí después del schema. El archivo `schema.sql` solo se actualiza periódicamente.

## 3. Usuarios administradores

### Crear el usuario

1. En el menú lateral izquierdo de Supabase, click en **Authentication**
2. En el submenú, click en **Users**
3. En la parte superior derecha, click en **Add user** → **Create new user**
4. Completar el formulario:
   - **Email**: correo del administrador
   - **Password**: contraseña segura
   - Activar el toggle **Auto Confirm User** ✅ (evita email de verificación)
5. Click en **Create User**

### Asignar el rol vía SQL

La interfaz de Supabase ya no permite editar los metadatos visualmente. Hay que hacerlo desde **SQL Editor**.

En el menú lateral, click en **SQL Editor** y ejecutar:

**Superadmin (siempre GuambraWeb):**
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"rol": "superadmin", "nombre": "GuambraWeb"}'
WHERE email = 'andyortiz.ec@gmail.com';
```

**Admin (cuenta del cliente):**
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"rol": "admin", "nombre": "Nombre del cliente"}'
WHERE email = 'correo@delcliente.com';
```

> Reemplazar el email y nombre del admin con los datos reales del cliente.

### Verificar y corregir roles

1. En el menú lateral, click en **Table Editor**
2. Seleccionar la tabla **perfiles**
3. Debe aparecer una fila por cada usuario con el `rol` correcto

> **Problema frecuente:** el trigger crea la fila en `perfiles` en el momento que se crea el usuario, antes de que se ejecute el SQL que asigna los metadatos. Por eso el rol queda como `admin` aunque sea superadmin.

Si el rol en `perfiles` está incorrecto, corregirlo directamente desde **SQL Editor**:

```sql
UPDATE perfiles
SET rol = 'superadmin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'andyortiz.ec@gmail.com');
```

> Si `perfiles` está vacía, el trigger no se ejecutó — probablemente el usuario fue creado antes de correr el `schema.sql`. Solución: eliminar el usuario desde Authentication → Users y volver a crearlo después de haber ejecutado el schema.

### Problema: "Usuario o contraseña incorrectos" al ingresar al admin

Si el login falla con ese mensaje (error 400 en consola), las causas en orden de probabilidad son:

1. **Variables de entorno en Vercel apuntan al proyecto Supabase equivocado** — el usuario existe en otro proyecto. Verificar que `NEXT_PUBLIC_SUPABASE_URL` sea exactamente la URL del proyecto donde se creó el usuario (Supabase → Settings → API → Project URL).

2. **Usuario no creado en ese proyecto** — ir a Authentication → Users y verificar que aparece el email. Si no está, crearlo siguiendo los pasos anteriores.

3. **Contraseña incorrecta** — resetearla desde Authentication → Users → `···` → **Send password recovery** o cambiarla directamente.

> **Importante:** después de cambiar variables de entorno en Vercel siempre hacer **Redeploy** para que tomen efecto.

### URL Configuration en Supabase (para dominios y subdominios)

En Supabase → **Authentication → URL Configuration** agregar el dominio del cliente:
- **Site URL:** `https://tutienda.vercel.app`
- **Redirect URLs:** `https://tutienda.vercel.app/**` y `https://tudominio.com/**` (si tiene dominio propio)

Esto es necesario para que los links de reset de contraseña funcionen. El login con email/password no depende del dominio.

## 4. Datos iniciales del cliente (opcional)

El `01_datos_iniciales.sql` ya crea una fila base en `configuracion_tienda` con datos genéricos, por lo que la tienda funciona sin este paso.

Hay dos opciones:

**Opción A — vía SQL (antes del deploy):** editar `supabase/produccion/seed_nuevo_cliente.sql` con los datos reales del cliente y ejecutarlo en **SQL Editor**.

**Opción B — vía panel admin (después del deploy):** ingresar a `/admin/dashboard/perfil` y completar los datos desde el formulario visual. Es la opción más cómoda.

## 5. Deploy en Vercel

1. Ir a [vercel.com](https://vercel.com) → **Add New Project** → importar el repositorio de GitHub
2. En **Environment Variables** agregar:

**Requeridas:**
```
NEXT_PUBLIC_SUPABASE_URL       → Project URL  (Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY  → anon/public key  (Supabase → Settings → API)
NEXT_PUBLIC_SITE_URL           → URL del proyecto en Vercel (completar después del primer deploy)
NEXT_PUBLIC_SOPORTE_WHATSAPP   → número WhatsApp de soporte (solo dígitos, ej: 593982650929)
SUPABASE_SERVICE_ROLE_KEY      → service_role key (Supabase → Settings → API) — requerida para facturación SRI y envío de email
```

**Opcionales — notificaciones Telegram:**
```
TELEGRAM_BOT_TOKEN             → token del bot
TELEGRAM_CHAT_ID               → id del grupo/canal destino
```

3. Click en **Deploy**

## 6. Post-deploy

- Copiar la URL asignada por Vercel y actualizar `NEXT_PUBLIC_SITE_URL` → hacer redeploy
- Ingresar al admin (`/admin`) y completar: logo, favicon, tema, colores, redes sociales, zonas de envío, etc.
- Si el cliente tiene dominio propio, configurarlo en **Vercel → Domains**

## 7. Módulo Facturación SRI (si el cliente lo usa)

Solo para clientes que necesiten emitir facturas electrónicas al SRI Ecuador.

1. Ir a `/admin/dashboard/facturacion/configuracion` (solo superadmin)
2. Completar: RUC, razón social, dirección, establecimiento, punto de emisión
3. Seleccionar tipo de contribuyente: **RUC General**, **RIMPE Emprendedor** o **Artesano JNDA**
4. Subir el certificado `.p12` y ingresar el PIN
5. Seleccionar ambiente: **Pruebas** para probar, **Producción** cuando el contador apruebe
6. Guardar — el sistema queda listo para emitir facturas desde Pedidos o desde Facturación

> **Nota:** el certificado `.p12` lo emite el Banco Central del Ecuador o un proveedor autorizado. El cliente debe solicitarlo con su RUC en el portal del SRI.

### Funciones disponibles en la tabla de facturas

| Botón | Cuándo aparece | Qué hace |
|-------|----------------|----------|
| **Consultar SRI** | Factura en estado *Pendiente SRI* (enviada) | Re-consulta la autorización al SRI usando la clave de acceso guardada |
| **NC** | Factura autorizada sin Nota de Crédito activa | Abre modal para emitir una Nota de Crédito Electrónica (código 04) que la revierte |
| **Email** | Factura autorizada con email del comprador | Envía el RIDE PDF al comprador |
| **RIDE** | Factura o NC autorizada | Descarga el PDF en formato estándar SRI con logo y código de barras |
| **XML** | Cualquier factura con XML firmado | Descarga el XML firmado |

### Notas de Crédito Electrónicas

Las Notas de Crédito (NC) son el mecanismo oficial del SRI para anular una factura ya autorizada. El sistema las emite con código de comprobante `04` y las envía directamente al SRI.

**Plazo para emitirlas:** hasta el día de vencimiento de la declaración de IVA del mes siguiente, que depende del último dígito del RUC:

| Último dígito RUC | Fecha límite |
|-------------------|--------------|
| 1 | Día 10 |
| 2 | Día 12 |
| 3 | Día 14 |
| 4 | Día 16 |
| 5 | Día 18 |
| 6 | Día 20 |
| 7 | Día 22 |
| 8 | Día 24 |
| 9 | Día 26 |
| 0 | Día 28 |

El sistema muestra un indicador visual (verde / ámbar / rojo) con los días restantes al abrir el modal de NC.

### RIDE PDF

El RIDE sigue el formato estándar SRI Ecuador:
- **Logo** tomado desde `/admin/dashboard/perfil` → pestaña Imágenes → campo *Logotipo del Menú*. Usar imagen con fondo blanco o transparente.
- **Código de barras** Code 128 generado automáticamente a partir de la clave de acceso de 49 dígitos.

## 8. Módulo Email (envío de RIDE al cliente)

Permite enviar el PDF de la factura (RIDE) al email del comprador, de forma manual o automática.

1. Ir a `/admin/dashboard/email` (solo superadmin)
2. Elegir proveedor:
   - **Gmail** — usar una cuenta Gmail + contraseña de aplicación de 16 caracteres (myaccount.google.com/apppasswords)
   - **SMTP propio** — servidor, puerto, usuario y contraseña del hosting
   - **Resend** — API key de resend.com (requiere dominio verificado, 3 000 emails/mes gratis)
3. Completar nombre y email del remitente
4. Activar **Envío activo** ✅
5. Activar **Envío automático** si se quiere que el RIDE llegue solo al autorizarse la factura
6. Usar **Probar envío** para confirmar que las credenciales son correctas antes de guardar

## Notificaciones Telegram (opcional)

El sistema puede enviar notificaciones automáticas al grupo o canal de Telegram del cliente cuando ocurren eventos: nuevo pedido, nueva cita, nueva solicitud de evento, stock bajo y resumen diario.

### Paso 1 — Crear el bot con BotFather

1. Abrir Telegram y buscar **@BotFather**
2. Iniciar conversación y escribir `/newbot`
3. BotFather pedirá dos cosas:
   - **Nombre del bot** — el nombre visible, ej: `Notificaciones Ferretería Pérez`
   - **Username del bot** — debe terminar en `bot`, ej: `ferreterianotif_bot`
4. BotFather responderá con el token, algo así:
   ```
   Done! Use this token to access the HTTP API:
   7412365890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Copiar ese token — es el valor de `TELEGRAM_BOT_TOKEN`

### Paso 2 — Crear el grupo y obtener el Chat ID

1. En Telegram, crear un **grupo nuevo** (ej: "Alertas Tienda Cliente")
2. Agregar al bot recién creado como miembro del grupo
3. Escribir cualquier mensaje en el grupo (ej: "hola")
4. En el navegador, abrir esta URL reemplazando el token:
   ```
   https://api.telegram.org/bot{TOKEN}/getUpdates
   ```
   Ejemplo real:
   ```
   https://api.telegram.org/bot7412365890:AAFxxx/getUpdates
   ```
5. En la respuesta JSON buscar el campo `"id"` dentro de `"chat"`. Será un número negativo, ej:
   ```json
   "chat": { "id": -1002345678901, "title": "Alertas Tienda" }
   ```
6. Ese número negativo (con el `-` incluido) es el valor de `TELEGRAM_CHAT_ID`

> Si el JSON aparece vacío `{"ok":true,"result":[]}`, escribir otro mensaje en el grupo e intentar de nuevo.

### Paso 3 — Agregar las variables en Vercel

En el proyecto del cliente en Vercel → **Settings → Environment Variables**:

```
TELEGRAM_BOT_TOKEN        → el token de BotFather
TELEGRAM_CHAT_ID          → el id del grupo (número negativo)
SUPABASE_SERVICE_ROLE_KEY → service_role key (Supabase → Settings → API)
```

Hacer **redeploy** después de agregar las variables.

### Paso 4 — Verificar que funciona

Crear un pedido de prueba en la tienda. Debe llegar un mensaje al grupo de Telegram en segundos.

> Si no llega nada, verificar que el bot esté en el grupo y que el `TELEGRAM_CHAT_ID` tenga el `-` al inicio.

---

## Personalización visual

Desde `/admin/dashboard/perfil` → pestaña **Colores**:

- **Tema base** — 5 opciones: Claro, Oscuro, Midnight, Cálido, Océano. Cambia fondos, cards y textos.
- **Color de acento** — 28 paletas predefinidas para botones y elementos interactivos.

Ambos ajustes son independientes y se aplican en tiempo real sin redeploy.
