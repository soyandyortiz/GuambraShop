-- Tabla de clientes con campos para facturación SRI Ecuador
-- Permite registrar clientes manualmente y vincularlos a pedidos

CREATE TABLE clientes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_identificacion  text NOT NULL DEFAULT 'cedula'
    CHECK (tipo_identificacion IN ('ruc', 'cedula', 'pasaporte', 'consumidor_final')),
  identificacion       text NOT NULL DEFAULT '9999999999999',
  razon_social         text NOT NULL,
  email                text,
  telefono             text,
  direccion            text,
  provincia            text,
  ciudad               text,
  notas                text,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en       timestamptz NOT NULL DEFAULT now()
);

-- FK opcional en pedidos (pedidos online sin cliente vinculado siguen funcionando)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_clientes_identificacion ON clientes(identificacion);
CREATE INDEX IF NOT EXISTS idx_clientes_email         ON clientes(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id     ON pedidos(cliente_id) WHERE cliente_id IS NOT NULL;

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gestiona clientes" ON clientes
  FOR ALL TO authenticated
  USING      (obtener_rol() IN ('admin', 'superadmin'))
  WITH CHECK (obtener_rol() IN ('admin', 'superadmin'));

-- Trigger para actualizar actualizado_en automáticamente
CREATE OR REPLACE FUNCTION actualizar_timestamp_clientes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_clientes_actualizar_ts
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp_clientes();
