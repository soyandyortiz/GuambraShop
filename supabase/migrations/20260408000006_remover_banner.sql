-- Eliminar la columna banner_url de la tabla configuracion_tienda
alter table public.configuracion_tienda drop column if exists banner_url;
