-- ============================================================
-- Fase 1: Corrección de lógica de stock para alquileres
-- ============================================================

-- 1. Agregar estado 'vencido' (fecha_fin pasó, traje no devuelto)
ALTER TABLE alquileres
  DROP CONSTRAINT IF EXISTS alquileres_estado_check;

ALTER TABLE alquileres
  ADD CONSTRAINT alquileres_estado_check
  CHECK (estado IN ('reservado', 'activo', 'vencido', 'devuelto', 'cancelado'));

-- 2. RPC: calcula unidades ocupadas para un producto en un rango de fechas
--    Solo cuenta alquileres que realmente bloquean stock:
--    - 'activo':    traje físicamente afuera → siempre bloquea (aunque esté vencido)
--    - 'vencido':   traje afuera y no devuelto → sigue bloqueando
--    - 'reservado': pedido confirmado + fecha_fin no pasada → bloquea
--    No cuenta: pendiente sin confirmar, cancelados, devueltos
CREATE OR REPLACE FUNCTION verificar_disponibilidad_alquiler(
  p_producto_id   UUID,
  p_fecha_inicio  DATE,
  p_fecha_fin     DATE
)
RETURNS TABLE (
  stock_total      INTEGER,
  cantidad_ocupada INTEGER,
  disponible       INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ocupados AS (
    SELECT COALESCE(SUM(a.cantidad), 0)::INTEGER AS total
    FROM alquileres a
    LEFT JOIN pedidos p ON a.pedido_id = p.id
    WHERE a.producto_id = p_producto_id
      -- solapamiento de fechas
      AND a.fecha_inicio <= p_fecha_fin
      AND a.fecha_fin    >  p_fecha_inicio
      AND (
        -- traje físicamente afuera: siempre bloquea
        a.estado IN ('activo', 'vencido')
        OR (
          -- reservado: solo bloquea si el pedido fue aceptado y la fecha aún no pasó
          a.estado = 'reservado'
          AND a.fecha_fin >= CURRENT_DATE
          AND (
            p.id IS NULL  -- pedido_id nulo (creación directa sin pedido)
            OR p.estado NOT IN ('pendiente', 'cancelado')
          )
        )
      )
  ),
  stock AS (
    SELECT COALESCE(pr.stock, 0)::INTEGER AS total
    FROM productos pr
    WHERE pr.id = p_producto_id
  )
  SELECT
    stock.total                                   AS stock_total,
    ocupados.total                                AS cantidad_ocupada,
    GREATEST(0, stock.total - ocupados.total)     AS disponible
  FROM stock, ocupados;
END;
$$;

-- 3. Política RLS: el público también puede leer alquileres vencidos
--    (necesario para que la RPC funcione con SECURITY DEFINER correctamente)
DROP POLICY IF EXISTS "publico_leer_alquileres_activos" ON alquileres;

CREATE POLICY "publico_leer_alquileres_relevantes" ON alquileres
  FOR SELECT USING (estado IN ('reservado', 'activo', 'vencido'));

-- 4. Función para marcar automáticamente alquileres vencidos
--    Un alquiler 'activo' pasa a 'vencido' cuando fecha_fin < HOY
--    Un alquiler 'reservado' con pedido confirmado y fecha_fin < HOY también vence
--    Retorna el número de filas marcadas
CREATE OR REPLACE FUNCTION marcar_alquileres_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH actualizados AS (
    UPDATE alquileres a
    SET
      estado         = 'vencido',
      actualizado_en = now()
    FROM pedidos p
    WHERE a.pedido_id = p.id
      AND a.fecha_fin < CURRENT_DATE
      AND a.estado IN ('activo', 'reservado')
      AND p.estado NOT IN ('pendiente', 'cancelado')
    RETURNING a.id
  )
  SELECT COUNT(*) INTO v_count FROM actualizados;

  -- También vence reservados sin pedido asociado (pedido_id IS NULL) pasada la fecha
  WITH actualizados_sin_pedido AS (
    UPDATE alquileres
    SET
      estado         = 'vencido',
      actualizado_en = now()
    WHERE pedido_id IS NULL
      AND fecha_fin < CURRENT_DATE
      AND estado IN ('activo', 'reservado')
    RETURNING id
  )
  SELECT v_count + COUNT(*) INTO v_count FROM actualizados_sin_pedido;

  RETURN v_count;
END;
$$;

-- Permisos para llamar desde el cron (service role)
GRANT EXECUTE ON FUNCTION verificar_disponibilidad_alquiler(UUID, DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION marcar_alquileres_vencidos() TO service_role;
