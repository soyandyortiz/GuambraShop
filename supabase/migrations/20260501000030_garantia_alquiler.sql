-- Agregar campo de garantía de texto para productos tipo alquiler
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS garantia_descripcion TEXT;
