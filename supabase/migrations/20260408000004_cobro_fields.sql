-- ============================================================
-- MIGRACIÓN 5: Campos de cobro en configuracion_tienda
-- ============================================================

alter table configuracion_tienda
  add column if not exists fecha_inicio_sistema  timestamptz,
  add column if not exists dias_pago             int not null default 30,
  add column if not exists cobro_activo          boolean not null default false;
