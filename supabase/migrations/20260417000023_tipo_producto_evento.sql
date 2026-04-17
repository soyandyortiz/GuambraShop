-- ============================================================
-- Ampliar tipo_producto para soportar 'evento'
-- Los eventos son servicios complejos que requieren cotización
-- previa en lugar de compra directa.
-- ============================================================

-- Eliminar la constraint existente y reemplazarla
ALTER TABLE productos
  DROP CONSTRAINT IF EXISTS productos_tipo_producto_check;

ALTER TABLE productos
  ADD CONSTRAINT productos_tipo_producto_check
    CHECK (tipo_producto IN ('producto', 'servicio', 'evento'));
