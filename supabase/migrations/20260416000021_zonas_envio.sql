-- ============================================================
-- TABLA zonas_envio
-- Precios de envío por ciudad específica
-- ============================================================

CREATE TABLE IF NOT EXISTS zonas_envio (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia       text          NOT NULL,
  ciudad          text          NOT NULL,
  precio          numeric(10,2) NOT NULL DEFAULT 0,
  tiempo_entrega  text,                          -- Ej: "1-2 días hábiles"
  esta_activa     boolean       NOT NULL DEFAULT true,
  creado_en       timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT zonas_envio_ciudad_unica UNIQUE (ciudad)
);

-- Índices
CREATE INDEX idx_zonas_envio_ciudad    ON zonas_envio (ciudad);
CREATE INDEX idx_zonas_envio_provincia ON zonas_envio (provincia);

-- Row Level Security
ALTER TABLE zonas_envio ENABLE ROW LEVEL SECURITY;

-- Anónimos y autenticados pueden consultar zonas activas (necesario para el carrito)
CREATE POLICY "Público puede ver zonas activas" ON zonas_envio
  FOR SELECT TO anon, authenticated
  USING (esta_activa = true);

-- Admin puede ver todas (incluyendo inactivas)
CREATE POLICY "Admin puede ver todas las zonas" ON zonas_envio
  FOR SELECT TO authenticated
  USING (true);

-- Admin puede crear, editar y eliminar
CREATE POLICY "Admin puede insertar zonas" ON zonas_envio
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin puede actualizar zonas" ON zonas_envio
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin puede eliminar zonas" ON zonas_envio
  FOR DELETE TO authenticated
  USING (true);
