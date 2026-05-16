-- Agrega fecha de inicio a cupones + función atómica de incremento + índices

-- 1. Columna inicia_en (opcional — null = disponible de inmediato)
ALTER TABLE cupones ADD COLUMN IF NOT EXISTS inicia_en timestamptz;

-- 2. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_cupones_codigo          ON cupones(codigo);
CREATE INDEX IF NOT EXISTS idx_cupones_activo_vigente  ON cupones(esta_activo, inicia_en, vence_en);

-- 3. Función de incremento atómico (evita race conditions en SELECT+UPDATE)
--    Usada por service_role en los routes de confirmación de pedido.
CREATE OR REPLACE FUNCTION incrementar_uso_cupon(p_codigo text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE cupones
  SET    usos_actuales = usos_actuales + 1
  WHERE  codigo = p_codigo;
$$;

GRANT EXECUTE ON FUNCTION incrementar_uso_cupon(text) TO service_role;
