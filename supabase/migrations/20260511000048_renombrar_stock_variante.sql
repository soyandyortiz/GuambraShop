-- Renombrar columna stock → stock_variante en variantes_producto
-- El código (POS, formulario de productos) ya espera el nombre stock_variante.
ALTER TABLE variantes_producto
RENAME COLUMN stock TO stock_variante;
