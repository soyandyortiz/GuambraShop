-- ============================================================
-- SEED: Datos iniciales de la tienda demo
-- IMPORTANTE: Los usuarios se crean desde Supabase Auth
-- Este seed inserta solo la configuración base de la tienda
-- ============================================================

-- Configuración inicial de la tienda
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
  'Tienda online demo - Los mejores productos al mejor precio.',
  'Esta tienda está temporalmente suspendida por falta de pago. Para reactivarla comunícate con GuambraWeb.',
  'Transferencia bancaria: Banco XYZ | Cuenta: 0000000000 | Nombre: GuambraWeb'
);

-- ============================================================
-- INSTRUCCIONES PARA CREAR USUARIOS (ejecutar desde Supabase Auth)
-- ============================================================
-- Los usuarios NO se crean con SQL directo sino desde el panel
-- de Supabase Auth o con el script de setup.
--
-- Usuario SUPERADMIN:
--   Email: 0604511089
--   Password: 0604511089
--   Metadata: { "rol": "superadmin", "nombre": "GuambraWeb" }
--
-- Usuario ADMIN (demo):
--   Email: admin@tiendademo.com
--   Password: admin
--   Metadata: { "rol": "admin", "nombre": "Administrador Demo" }
--
-- El trigger 'tr_crear_perfil_al_registrar' se encargará
-- automáticamente de crear la fila en la tabla 'perfiles'.
-- ============================================================
