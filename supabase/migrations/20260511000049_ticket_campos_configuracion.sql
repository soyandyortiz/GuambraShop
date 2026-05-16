-- Agregar campos de configuración de ticket térmico a configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS ticket_ancho_papel TEXT DEFAULT '80',
  ADD COLUMN IF NOT EXISTS ticket_linea_1 TEXT,
  ADD COLUMN IF NOT EXISTS ticket_linea_2 TEXT,
  ADD COLUMN IF NOT EXISTS ticket_linea_3 TEXT,
  ADD COLUMN IF NOT EXISTS ticket_linea_4 TEXT,
  ADD COLUMN IF NOT EXISTS ticket_texto_pie TEXT,
  ADD COLUMN IF NOT EXISTS ticket_pie_2 TEXT,
  ADD COLUMN IF NOT EXISTS ticket_mostrar_precio_unit BOOLEAN DEFAULT true;
