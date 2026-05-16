-- ============================================================
-- Tipo de producto "alquiler" — renta de artículos por días
-- ============================================================

-- 1. Ampliar CHECK constraint de tipo_producto en productos
ALTER TABLE productos
  DROP CONSTRAINT IF EXISTS productos_tipo_producto_check;

ALTER TABLE productos
  ADD CONSTRAINT productos_tipo_producto_check
  CHECK (tipo_producto IN ('producto', 'servicio', 'evento', 'alquiler'));

-- 2. Campos específicos de alquiler en la tabla productos
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_deposito    NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_dias_alquiler  INTEGER        DEFAULT NULL;

-- precio_deposito   : depósito de garantía opcional (se devuelve al retornar el artículo)
-- max_dias_alquiler : límite de días de alquiler (NULL = sin límite)
-- El campo "precio" existente pasa a significar "precio por día" para este tipo.
-- El campo "stock" existente representa las unidades disponibles simultáneamente.

-- 3. Tabla de alquileres — registra cada período reservado
CREATE TABLE IF NOT EXISTS alquileres (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id     UUID          REFERENCES pedidos(id) ON DELETE SET NULL,
  producto_id   UUID          NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  fecha_inicio  DATE          NOT NULL,
  fecha_fin     DATE          NOT NULL,
  dias          INTEGER       NOT NULL CHECK (dias >= 1),
  cantidad      INTEGER       NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
  hora_recogida TIME          DEFAULT NULL,   -- hora acordada de recogida/entrega
  estado        TEXT          NOT NULL DEFAULT 'reservado'
    CHECK (estado IN ('reservado', 'activo', 'devuelto', 'cancelado')),
  creado_en     TIMESTAMPTZ   DEFAULT now(),
  actualizado_en TIMESTAMPTZ  DEFAULT now(),

  CONSTRAINT fecha_fin_posterior CHECK (fecha_fin >= fecha_inicio)
);

-- Índices para consultas de disponibilidad
CREATE INDEX IF NOT EXISTS idx_alquileres_producto_fechas
  ON alquileres (producto_id, fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_alquileres_pedido
  ON alquileres (pedido_id);

-- Trigger actualizado_en
DROP TRIGGER IF EXISTS tr_alquileres_updated_at ON alquileres;
CREATE TRIGGER tr_alquileres_updated_at
  BEFORE UPDATE ON alquileres
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- 4. Row Level Security
ALTER TABLE alquileres ENABLE ROW LEVEL SECURITY;

-- Admin puede gestionar todo
DROP POLICY IF EXISTS "admin_gestionar_alquileres" ON alquileres;
CREATE POLICY "admin_gestionar_alquileres" ON alquileres
  FOR ALL USING (obtener_rol() IN ('admin', 'superadmin'));

-- Público puede crear (al confirmar pedido)
DROP POLICY IF EXISTS "publico_crear_alquileres" ON alquileres;
CREATE POLICY "publico_crear_alquileres" ON alquileres
  FOR INSERT WITH CHECK (true);

-- Público puede leer reservados/activos para verificar disponibilidad
DROP POLICY IF EXISTS "publico_leer_alquileres_activos" ON alquileres;
CREATE POLICY "publico_leer_alquileres_activos" ON alquileres
  FOR SELECT USING (estado IN ('reservado', 'activo'));
