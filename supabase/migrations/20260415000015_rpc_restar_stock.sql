-- ============================================================
-- FASE 3: RPC para Confirmar Pedidos y Restar Stock
-- ============================================================

CREATE OR REPLACE FUNCTION confirmar_pedido(p_pedido_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_producto_id UUID;
  v_variante_id UUID;
  v_talla_texto TEXT;
  v_cantidad INT;
  v_estado_actual TEXT;
BEGIN
  -- Obtener estado actual del pedido
  SELECT estado INTO v_estado_actual FROM pedidos WHERE id = p_pedido_id;
  
  -- Solo proceder si no está ya confirmado, enviado o entregado
  IF v_estado_actual IN ('confirmado', 'enviado', 'entregado') THEN
    RETURN false;
  END IF;

  -- Iterar sobre items (JSON array extraído desde la columna o tabla de items si la hay)
  -- Wait, el modelo actual guarda lost items como JSONB `items` dentro de `pedidos`?
  -- Sí, en la definición type Pedido = { items: ItemPedido[] }
  FOR v_item IN SELECT * FROM jsonb_array_elements((SELECT items::jsonb FROM pedidos WHERE id = p_pedido_id))
  LOOP
    v_producto_id := (v_item.value->>'producto_id')::UUID;
    v_cantidad := (v_item.value->>'cantidad')::INT;
    v_talla_texto := v_item.value->>'talla';
    v_variante_id := (v_item.value->>'variante_id')::UUID;

    -- Lógica de reducción
    IF v_variante_id IS NOT NULL THEN
      UPDATE variantes_producto SET stock = GREATEST(0, stock - v_cantidad) WHERE id = v_variante_id AND stock IS NOT NULL;
    ELSIF v_talla_texto IS NOT NULL THEN
      UPDATE tallas_producto SET stock = GREATEST(0, stock - v_cantidad) WHERE producto_id = v_producto_id AND talla = v_talla_texto AND stock IS NOT NULL;
    ELSE
      UPDATE productos SET stock = GREATEST(0, stock - v_cantidad) WHERE id = v_producto_id AND stock IS NOT NULL;
    END IF;
  END LOOP;

  -- Actualizar estado del pedido
  UPDATE pedidos SET estado = 'confirmado', actualizado_en = now() WHERE id = p_pedido_id;
  
  -- Si hay citas vinculadas a la reserva (fase 4/5), confirmar su estado:
  UPDATE citas SET estado = 'confirmada' WHERE pedido_id = p_pedido_id AND estado = 'reservada';

  RETURN true;
END;
$$;
