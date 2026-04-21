# GuambraShop — Deploy para nuevo cliente

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. En la pantalla de configuración:
   - Elegir región **América**
   - Marcar solo **Habilitar la API de datos** ✅
   - Dejar **Habilitar RLS automático** sin marcar ☐

## 2. Base de datos

En **SQL Editor** ejecutar en este orden:

1. `supabase/schema.sql` — toda la estructura de tablas, funciones y RLS
2. `supabase/seed/01_datos_iniciales.sql` — datos base requeridos

## 3. Usuarios administradores

### Superadmin

1. En el menú lateral izquierdo de Supabase, click en **Authentication**
2. En el submenú que aparece, click en **Users**
3. En la parte superior derecha, click en el botón verde **Add user** → seleccionar **Create new user**
4. Se abre un formulario. Completar:
   - **Email**: correo del cliente
   - **Password**: contraseña segura
   - Activar el toggle **Auto Confirm User** (evita que Supabase le mande un email de verificación)
5. Click en **Create User** — el usuario aparece en la lista
6. En la lista de usuarios, click en la fila del usuario recién creado para abrir su detalle
7. Dentro del detalle del usuario, bajar hasta encontrar la sección **User Metadata**
8. Se ve un cuadro con `{}` o datos vacíos. Click en el ícono de lápiz (editar) que aparece a la derecha de esa sección
9. Borrar todo el contenido del cuadro y escribir exactamente esto:
```json
{
  "rol": "superadmin",
  "nombre": "Nombre del cliente"
}
```
   _(reemplazar `Nombre del cliente` con el nombre real)_
10. Click en **Save** para guardar

### Admin (opcional)

Repetir exactamente los mismos pasos. En el paso 9 usar estos metadatos:
```json
{
  "rol": "admin",
  "nombre": "Nombre del administrador"
}
```

### Verificar que funcionó

1. En el menú lateral izquierdo, click en **Table Editor**
2. Seleccionar la tabla **perfiles**
3. Debe aparecer una fila por cada usuario creado con el `rol` correcto (`superadmin` o `admin`)

> Si la tabla `perfiles` está vacía después de crear los usuarios, significa que el trigger no se ejecutó. Solución: ir a **SQL Editor** y volver a ejecutar `supabase/schema.sql` desde cero (primero eliminar las tablas existentes con `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`).

## 4. Datos iniciales del cliente

Editar `supabase/produccion/seed_nuevo_cliente.sql` con los datos del cliente (nombre de tienda, WhatsApp, moneda, etc.) y ejecutarlo en **SQL Editor**.

## 5. Deploy en Vercel

1. Ir a [vercel.com](https://vercel.com) → **Add New Project** → importar el repositorio de GitHub
2. En **Environment Variables** agregar:

```
NEXT_PUBLIC_SUPABASE_URL       → Project URL  (Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY  → anon/public key  (Supabase → Settings → API)
NEXT_PUBLIC_SITE_URL           → URL del proyecto en Vercel (completar después del primer deploy)
NEXT_PUBLIC_SOPORTE_WHATSAPP   → número WhatsApp de soporte (solo dígitos, ej: 593982650929)
```

Variables opcionales — notificaciones Telegram y resumen diario:
```
TELEGRAM_BOT_TOKEN             → token del bot
TELEGRAM_CHAT_ID               → id del grupo/canal destino
SUPABASE_SERVICE_ROLE_KEY      → service_role key (Supabase → Settings → API) — requerida para el resumen diario
```

3. Click en **Deploy**

## 6. Post-deploy

- Copiar la URL asignada por Vercel y actualizar `NEXT_PUBLIC_SITE_URL` → hacer redeploy
- Ingresar al admin (`/admin`) y completar: logo, favicon, colores, redes sociales, zonas de envío, etc.
- Si el cliente tiene dominio propio, configurarlo en **Vercel → Domains**
