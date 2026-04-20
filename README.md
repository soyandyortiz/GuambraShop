# GuambraShop — Deploy para nuevo cliente

## 1. Base de datos (Supabase)

1. Crear nuevo proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `supabase/schema.sql`
3. Ejecutar `supabase/seed/01_datos_iniciales.sql`
4. Crear los usuarios en **Authentication → Users → Add user**:
   - Superadmin: email y contraseña del cliente → metadatos: `{ "rol": "superadmin", "nombre": "Nombre" }`
   - Admin (opcional): email y contraseña → metadatos: `{ "rol": "admin", "nombre": "Nombre" }`
5. Ejecutar `supabase/produccion/seed_nuevo_cliente.sql` (editar los datos del cliente antes)

## 2. Repositorio (GitHub)

Hacer fork o duplicar este repositorio en la cuenta del cliente (o usar el mismo repo con distintos proyectos en Vercel).

## 3. Deploy (Vercel)

1. Ir a [vercel.com](https://vercel.com) → **Add New Project**
2. Importar el repositorio de GitHub
3. En **Environment Variables** agregar:

```
NEXT_PUBLIC_SUPABASE_URL        → Project URL de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY   → Anon/public key de Supabase
NEXT_PUBLIC_SITE_URL            → URL del proyecto en Vercel (después del primer deploy)
NEXT_PUBLIC_SOPORTE_WHATSAPP    → Número WhatsApp de soporte (solo dígitos)
```

Variables opcionales (notificaciones Telegram):
```
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

4. Click en **Deploy**

## 4. Post-deploy

- Actualizar `NEXT_PUBLIC_SITE_URL` con la URL real asignada por Vercel y hacer redeploy
- Configurar dominio personalizado en Vercel si el cliente tiene uno
- Ingresar al admin (`/admin`) y completar los datos de la tienda: logo, colores, WhatsApp, direcciones, etc.
