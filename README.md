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

En **Authentication → Users → Add user** crear:

- **Superadmin**: email + contraseña del cliente → metadatos: `{ "rol": "superadmin", "nombre": "Nombre" }`
- **Admin** (opcional): email + contraseña → metadatos: `{ "rol": "admin", "nombre": "Nombre" }`

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
