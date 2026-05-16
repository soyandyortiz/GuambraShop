-- Función batch: disponibilidad de alquiler para hoy (múltiples productos a la vez)
-- Usa la misma lógica que verificar_disponibilidad_alquiler pero en un solo query.
CREATE OR REPLACE FUNCTION disponibilidad_alquileres_hoy(p_ids UUID[])
RETURNS TABLE (producto_id UUID, disponible INTEGER)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH ocupados AS (
    SELECT
      a.producto_id,
      COALESCE(SUM(a.cantidad), 0)::INTEGER AS total
    FROM alquileres a
    LEFT JOIN pedidos p ON a.pedido_id = p.id
    WHERE a.producto_id = ANY(p_ids)
      AND a.fecha_inicio <= CURRENT_DATE
      AND a.fecha_fin    >  CURRENT_DATE
      AND (
        a.estado IN ('activo', 'vencido')
        OR (
          a.estado = 'reservado'
          AND (
            p.id IS NULL
            OR p.estado NOT IN ('pendiente', 'cancelado')
          )
        )
      )
    GROUP BY a.producto_id
  )
  SELECT
    pr.id                                                  AS producto_id,
    GREATEST(0, pr.stock - COALESCE(o.total, 0))::INTEGER  AS disponible
  FROM productos pr
  LEFT JOIN ocupados o ON o.producto_id = pr.id
  WHERE pr.id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION disponibilidad_alquileres_hoy(UUID[]) TO anon, authenticated;
