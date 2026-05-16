-- ============================================================
-- LIMPIEZA Y SIMPLIFICACIÓN DE ESTADOS (ESTILO WOOCOMMERCE)
-- ============================================================

-- 1. Limpieza total de datos de transacciones previos
DELETE FROM facturas;
DELETE FROM alquileres;
DELETE FROM citas;
DELETE FROM solicitudes_evento;
DELETE FROM pedidos;

-- 2. Actualización de la restricción de estados en la tabla pedidos
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;

-- Nuevos estados simplificados:
-- pendiente_pago : Orden creada, esperando pago.
-- procesando     : Pago recibido, preparando envío/entrega (descuenta stock).
-- en_espera      : Retenido (ej: falta confirmar transferencia).
-- completado     : Finalizado con éxito.
-- cancelado      : Anulado (debería retornar stock si se implementa lógica de cancelación).
-- reembolsado    : Dinero devuelto.
-- fallido        : Error en pago.

ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check 
  CHECK (estado IN (
    'pendiente_pago', 
    'procesando', 
    'en_espera', 
    'completado', 
    'cancelado', 
    'reembolsado', 
    'fallido'
  ));

-- Valor por defecto al crear un pedido nuevo
ALTER TABLE pedidos ALTER COLUMN estado SET DEFAULT 'pendiente_pago';

-- 3. Actualizar la función RPC para que funcione con los nuevos estados
-- Esta función se encarga de restar el stock cuando el pedido se "procesa"
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
  
  -- Solo proceder si no está ya en un estado que ya haya descontado stock
  IF v_estado_actual IN ('procesando', 'completado', 'reembolsado') THEN
    RETURN false;
  END IF;

  -- Iterar sobre los items del pedido guardados en el JSONB
  FOR v_item IN SELECT * FROM jsonb_array_elements((SELECT items::jsonb FROM pedidos WHERE id = p_pedido_id))
  LOOP
    v_producto_id := (v_item.value->>'producto_id')::UUID;
    v_cantidad := (v_item.value->>'cantidad')::INT;
    v_talla_texto := v_item.value->>'talla';
    v_variante_id := (v_item.value->>'variante_id')::UUID;

    -- Lógica de reducción de stock
    IF v_variante_id IS NOT NULL THEN
      UPDATE variantes_producto SET stock = GREATEST(0, stock - v_cantidad) WHERE id = v_variante_id AND stock IS NOT NULL;
    ELSIF v_talla_texto IS NOT NULL THEN
      UPDATE tallas_producto SET stock = GREATEST(0, stock - v_cantidad) WHERE producto_id = v_producto_id AND talla = v_talla_texto AND stock IS NOT NULL;
    ELSE
      UPDATE productos SET stock = GREATEST(0, stock - v_cantidad) WHERE id = v_producto_id AND stock IS NOT NULL;
    END IF;
  END LOOP;

  -- Actualizar estado del pedido a 'procesando'
  UPDATE pedidos SET estado = 'procesando', actualizado_en = now() WHERE id = p_pedido_id;
  
  -- Si hay citas vinculadas, confirmarlas
  UPDATE citas SET estado = 'confirmada' WHERE pedido_id = p_pedido_id AND estado IN ('pendiente', 'reservada');

  RETURN true;
END;
$$;
