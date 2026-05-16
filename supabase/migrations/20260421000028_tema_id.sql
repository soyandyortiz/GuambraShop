-- Agrega columna tema_id a configuracion_tienda
-- Permite seleccionar entre los 5 temas base del sistema (claro, oscuro, midnight, calido, oceano)
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS tema_id text DEFAULT 'claro'
  CHECK (tema_id IN ('claro', 'oscuro', 'midnight', 'calido', 'oceano'));
