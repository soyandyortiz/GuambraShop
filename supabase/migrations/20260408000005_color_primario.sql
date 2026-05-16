-- Agrega columna de color primario a configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS color_primario text DEFAULT '#ef4444';
