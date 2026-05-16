-- ============================================================
-- 1. Paquetes de evento (desglose de servicios con rango de precios)
--    Almacenado como JSONB en productos para eventos complejos
-- ============================================================
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS paquetes_evento jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. Tipo de precio en variantes
--    'reemplaza' → comportamiento actual (reemplaza precio base)
--    'suma'      → adicional / add-on (se suma al precio base)
-- ============================================================
ALTER TABLE variantes_producto
  ADD COLUMN IF NOT EXISTS tipo_precio text DEFAULT 'reemplaza'
    CHECK (tipo_precio IN ('reemplaza', 'suma'));

-- ============================================================
-- 3. País de la tienda para localización de provincias/departamentos
-- ============================================================
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'EC'
    CHECK (pais IN ('EC', 'PE', 'CO'));
