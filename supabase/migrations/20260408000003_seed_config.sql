-- ============================================================
-- MIGRACIÓN 4: Seed inicial — configuración de tienda
-- Se ejecuta solo si la tabla está vacía
-- ============================================================

insert into configuracion_tienda (
  nombre_tienda,
  descripcion,
  whatsapp,
  moneda,
  simbolo_moneda,
  esta_activa,
  mensaje_suspension
)
select
  'Tienda Demo',
  'Tu tienda online profesional',
  '0982650929',
  'USD',
  '$',
  true,
  'Esta tienda está temporalmente suspendida. Contáctanos para más información.'
where not exists (select 1 from configuracion_tienda);
