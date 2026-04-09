-- Agrega campos de imagen de perfil y portada a configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS foto_perfil_url text,
  ADD COLUMN IF NOT EXISTS foto_portada_url text;
