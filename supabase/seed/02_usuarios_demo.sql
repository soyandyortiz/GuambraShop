-- ============================================================
-- SEED: Usuarios demo (solo para entorno local)
-- En producción los usuarios se crean desde Supabase Auth
-- ============================================================

-- Superadmin: 0604511089 / 0604511089
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  '0604511089',
  crypt('0604511089', gen_salt('bf')),
  now(),
  '{"rol": "superadmin", "nombre": "GuambraWeb"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- Admin demo: admin@tiendademo.com / admin
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'admin@tiendademo.com',
  crypt('admin', gen_salt('bf')),
  now(),
  '{"rol": "admin", "nombre": "Administrador Demo"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now()
);

-- Configuración inicial de la tienda demo
insert into configuracion_tienda (
  nombre_tienda,
  descripcion,
  whatsapp,
  moneda,
  simbolo_moneda,
  meta_descripcion,
  mensaje_suspension,
  info_pago
) values (
  'Tienda Demo',
  'Bienvenido a nuestra tienda online. Encuentra los mejores productos al mejor precio.',
  '0000000000',
  'USD',
  '$',
  'Tienda online demo — Los mejores productos al mejor precio.',
  'Esta tienda está temporalmente suspendida. Para reactivarla realiza el pago mensual de $10.',
  'Transferencia: Banco Pichincha | Cuenta: 2200000000 | Nombre: GuambraWeb'
);
