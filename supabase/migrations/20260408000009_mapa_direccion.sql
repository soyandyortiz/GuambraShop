-- Agrega campo para enlace de Google Maps embed en cada dirección
alter table direcciones_negocio
  add column if not exists enlace_mapa text;
