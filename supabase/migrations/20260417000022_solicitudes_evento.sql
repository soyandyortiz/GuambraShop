-- ============================================================
-- SOLICITUDES DE EVENTO
-- Flujo de cotización para servicios complejos (eventos, quinceañeras, etc.)
-- No genera pedido directamente; inicia un proceso de negociación.
-- ============================================================

-- Secuencia para número de solicitud (SOL-00001)
CREATE SEQUENCE IF NOT EXISTS solicitudes_numero_seq START 1;

CREATE TABLE IF NOT EXISTS solicitudes_evento (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_solicitud        text          UNIQUE,

  -- Producto/servicio consultado
  producto_id             uuid          REFERENCES productos(id) ON DELETE SET NULL,
  producto_nombre         text          NOT NULL,   -- snapshot del nombre al crear

  -- Datos del cliente
  nombre_cliente          text          NOT NULL,
  email                   text          NOT NULL,
  whatsapp                text          NOT NULL,

  -- Detalles del evento
  fecha_evento            date,
  ciudad                  text,
  tipo_evento             text,
  presupuesto_aproximado  numeric(10,2),
  notas                   text,

  -- Estado del flujo de negociación
  estado                  text          NOT NULL DEFAULT 'nueva'
    CHECK (estado IN ('nueva', 'en_conversacion', 'cotizacion_enviada', 'confirmada', 'rechazada')),

  -- Conversión a pedido al confirmar (Fase 4)
  pedido_id               uuid          REFERENCES pedidos(id) ON DELETE SET NULL,

  -- Timestamps
  creado_en               timestamptz   NOT NULL DEFAULT now(),
  actualizado_en          timestamptz   NOT NULL DEFAULT now()
);

-- Trigger: auto-generar número de solicitud (SOL-00001)
CREATE OR REPLACE FUNCTION generar_numero_solicitud()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero_solicitud IS NULL OR NEW.numero_solicitud = '' THEN
    NEW.numero_solicitud := 'SOL-' || LPAD(nextval('solicitudes_numero_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_generar_numero_solicitud
  BEFORE INSERT ON solicitudes_evento
  FOR EACH ROW
  EXECUTE FUNCTION generar_numero_solicitud();

-- Trigger: actualizar timestamp en UPDATE
CREATE OR REPLACE FUNCTION actualizar_solicitud_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_actualizar_solicitud_ts
  BEFORE UPDATE ON solicitudes_evento
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_solicitud_ts();

-- Índices
CREATE INDEX idx_solicitudes_estado     ON solicitudes_evento(estado);
CREATE INDEX idx_solicitudes_creado_en  ON solicitudes_evento(creado_en DESC);
CREATE INDEX idx_solicitudes_producto   ON solicitudes_evento(producto_id);

-- Row Level Security
ALTER TABLE solicitudes_evento ENABLE ROW LEVEL SECURITY;

-- Clientes anónimos y autenticados pueden crear solicitudes
CREATE POLICY "Clientes pueden crear solicitudes" ON solicitudes_evento
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Solo autenticados (admin) pueden ver solicitudes
CREATE POLICY "Admin puede ver solicitudes" ON solicitudes_evento
  FOR SELECT TO authenticated
  USING (true);

-- Solo autenticados pueden actualizar estado
CREATE POLICY "Admin puede actualizar solicitudes" ON solicitudes_evento
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
