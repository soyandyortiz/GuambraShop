-- Actualizar confirmar_pedido() para usar stock_variante (renombrado en _048)
CREATE OR REPLACE FUNCTION confirmar_pedido(p_pedido_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item        record;
  v_producto_id UUID;
  v_variante_id UUID;
  v_talla_texto TEXT;
  v_cantidad    INT;
  v_estado_actual TEXT;
BEGIN
  SELECT estado INTO v_estado_actual FROM pedidos WHERE id = p_pedido_id;

  IF v_estado_actual IN ('procesando', 'completado', 'reembolsado') THEN
    RETURN false;
  END IF;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements(
      (SELECT items::jsonb FROM pedidos WHERE id = p_pedido_id)
    )
  LOOP
    v_producto_id := (v_item.value->>'producto_id')::UUID;
    v_cantidad    := (v_item.value->>'cantidad')::INT;
    v_talla_texto :=  v_item.value->>'talla';
    v_variante_id := (v_item.value->>'variante_id')::UUID;

    IF v_variante_id IS NOT NULL THEN
      UPDATE variantes_producto
      SET    stock_variante = GREATEST(0, COALESCE(stock_variante, 0) - v_cantidad)
      WHERE  id = v_variante_id AND stock_variante IS NOT NULL;
    ELSIF v_talla_texto IS NOT NULL THEN
      UPDATE tallas_producto
      SET    stock = GREATEST(0, COALESCE(stock, 0) - v_cantidad)
      WHERE  producto_id = v_producto_id AND talla = v_talla_texto AND stock IS NOT NULL;
    ELSE
      UPDATE productos
      SET    stock = GREATEST(0, COALESCE(stock, 0) - v_cantidad)
      WHERE  id = v_producto_id AND stock IS NOT NULL;
    END IF;
  END LOOP;

  UPDATE pedidos SET estado = 'procesando', actualizado_en = now() WHERE id = p_pedido_id;
  UPDATE citas SET estado = 'confirmada' WHERE pedido_id = p_pedido_id AND estado IN ('pendiente', 'reservada');

  RETURN true;
END;
$$;
