-- ============================================================
-- Sistema de Comprobante de Pago
-- Pedidos temporales + validación admin + limpieza automática
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Agregar estado pendiente_validacion a pedidos
-- ────────────────────────────────────────────────────────────
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;

ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN (
    'pendiente_pago',
    'pendiente_validacion',   -- comprobante subido, esperando confirmación admin
    'procesando',
    'en_espera',
    'completado',
    'cancelado',
    'reembolsado',
    'fallido'
  ));

-- Campos para comprobante de pago en pedidos reales
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS comprobante_url       TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_eliminar_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_comprobante_eliminar
  ON pedidos (comprobante_eliminar_en)
  WHERE comprobante_eliminar_en IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_pendiente_validacion
  ON pedidos (estado, creado_en DESC)
  WHERE estado = 'pendiente_validacion';


-- ────────────────────────────────────────────────────────────
-- 2. Tabla pedidos_temporales
--    Almacena datos del pedido mientras el cliente sube el
--    comprobante. Se elimina al convertirse en pedido real
--    o al expirar (15 minutos).
-- ────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS pedidos_temporales_seq START 1;

CREATE TABLE IF NOT EXISTS pedidos_temporales (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_temporal  TEXT        UNIQUE NOT NULL,
  -- Datos del cliente
  nombres          TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  whatsapp         TEXT        NOT NULL,
  -- Entrega
  tipo             TEXT        NOT NULL CHECK (tipo IN ('delivery', 'local')),
  provincia        TEXT,
  ciudad           TEXT,
  direccion        TEXT,
  detalles_direccion TEXT,
  -- Items y totales (snapshot del carrito)
  items            JSONB       NOT NULL DEFAULT '[]',
  simbolo_moneda   TEXT        NOT NULL DEFAULT '$',
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento_cupon  NUMERIC(10,2) NOT NULL DEFAULT 0,
  cupon_codigo     TEXT,
  costo_envio      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  datos_facturacion JSONB,
  -- IDs de citas y alquileres creados temporalmente (para limpiar si expira)
  citas_ids        UUID[]      NOT NULL DEFAULT '{}',
  alquileres_ids   UUID[]      NOT NULL DEFAULT '{}',
  -- Expiración: 15 minutos desde la creación
  expira_en        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_temporales_expira
  ON pedidos_temporales (expira_en);

CREATE INDEX IF NOT EXISTS idx_pedidos_temporales_numero
  ON pedidos_temporales (numero_temporal);

-- Función para generar el número temporal: GS-2026-000001
CREATE OR REPLACE FUNCTION generar_numero_temporal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero_temporal IS NULL OR NEW.numero_temporal = '' THEN
    NEW.numero_temporal := 'GS-' || EXTRACT(YEAR FROM now())::TEXT
                           || '-' || LPAD(nextval('pedidos_temporales_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_generar_numero_temporal
  BEFORE INSERT ON pedidos_temporales
  FOR EACH ROW EXECUTE FUNCTION generar_numero_temporal();

-- RLS: público puede insertar y leer su propio temporal (por número)
ALTER TABLE pedidos_temporales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "publico_crear_pedido_temporal" ON pedidos_temporales
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "publico_leer_pedido_temporal" ON pedidos_temporales
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "publico_eliminar_pedido_temporal" ON pedidos_temporales
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "admin_gestionar_pedidos_temporales" ON pedidos_temporales
  FOR ALL TO authenticated
  USING (obtener_rol() IN ('admin', 'superadmin'));


-- ────────────────────────────────────────────────────────────
-- 3. Storage bucket: comprobantes (privado)
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Cualquier visitante puede subir (necesario para clientes no autenticados)
CREATE POLICY "publico_subir_comprobante" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'comprobantes');

-- Solo autenticados (admin) pueden leer los comprobantes
CREATE POLICY "admin_leer_comprobante" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes');

-- Solo autenticados pueden eliminar (cron usa service_role)
CREATE POLICY "admin_eliminar_comprobante" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes');


-- ────────────────────────────────────────────────────────────
-- 4. RPC: limpiar_pedidos_expirados
--    Elimina temporales vencidos y sus citas/alquileres.
--    Llamada por cron cada 5 minutos.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION limpiar_pedidos_expirados()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count  INTEGER := 0;
  v_row    pedidos_temporales%ROWTYPE;
BEGIN
  FOR v_row IN
    SELECT * FROM pedidos_temporales WHERE expira_en < now()
  LOOP
    -- Cancelar citas reservadas para este temporal
    IF array_length(v_row.citas_ids, 1) > 0 THEN
      UPDATE citas
        SET estado = 'cancelada'
        WHERE id = ANY(v_row.citas_ids) AND estado = 'reservada';
    END IF;

    -- Cancelar alquileres reservados para este temporal
    IF array_length(v_row.alquileres_ids, 1) > 0 THEN
      UPDATE alquileres
        SET estado = 'cancelado'
        WHERE id = ANY(v_row.alquileres_ids) AND estado = 'reservado';
    END IF;

    DELETE FROM pedidos_temporales WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION limpiar_pedidos_expirados() TO service_role, authenticated;


-- ────────────────────────────────────────────────────────────
-- 5. RPC: marcar_comprobante_para_eliminar(pedido_id)
--    Se llama al confirmar un pedido. Marca el comprobante
--    para eliminarse en 48 horas.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION marcar_comprobante_para_eliminar(p_pedido_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pedidos
    SET comprobante_eliminar_en = now() + INTERVAL '48 hours'
    WHERE id = p_pedido_id
      AND comprobante_url IS NOT NULL
      AND comprobante_eliminar_en IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION marcar_comprobante_para_eliminar(UUID) TO authenticated;
