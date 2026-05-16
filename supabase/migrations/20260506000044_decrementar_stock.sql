-- Función para decrementar stock de forma atómica al crear una venta manual
-- Usa GREATEST(0, ...) para nunca ir a negativo
-- SECURITY DEFINER para ejecutarse con permisos del owner (evita RLS en update de stock)

CREATE OR REPLACE FUNCTION decrementar_stock(
  p_producto_id uuid,
  p_cantidad    int,
  p_variante_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_variante_id IS NOT NULL THEN
    UPDATE variantes_producto
    SET    stock_variante = GREATEST(0, COALESCE(stock_variante, 0) - p_cantidad)
    WHERE  id = p_variante_id;
  ELSE
    UPDATE productos
    SET    stock = GREATEST(0, COALESCE(stock, 0) - p_cantidad)
    WHERE  id = p_producto_id
      AND  stock IS NOT NULL;   -- No tocar productos sin control de stock
  END IF;
END;
$$;
