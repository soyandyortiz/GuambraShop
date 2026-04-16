-- Agrega imagen opcional por variante de producto
ALTER TABLE variantes_producto
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;
