-- ============================================================
-- FASE 3: Gestión de Stock
-- ============================================================

-- Añadir el campo de stock a los productos para control general
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;

-- Añadir el campo de stock a las variantes para control de múltiples precios/ítems
ALTER TABLE variantes_producto 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;

-- Añadir el campo de stock a las tallas para inventario por medida
ALTER TABLE tallas_producto 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;
