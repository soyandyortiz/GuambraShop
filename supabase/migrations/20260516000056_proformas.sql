-- Migración 056: Módulo de Proformas
-- Genera proformas/cotizaciones con PDF enviado por email al cliente

-- Secuencia para numeración correlativa PRO-001, PRO-002, ...
CREATE SEQUENCE IF NOT EXISTS proformas_numero_seq START 1;

-- Tabla principal de proformas
CREATE TABLE proformas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero         TEXT NOT NULL UNIQUE, -- PRO-001, PRO-002, ...

  -- Cliente (puede ser de la BD o datos manuales si es nuevo)
  cliente_id     UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_email  TEXT NOT NULL,
  cliente_telefono TEXT,

  -- Ítems: array JSONB [{ producto_id, nombre, cantidad, precio_unitario, subtotal }]
  items          JSONB NOT NULL DEFAULT '[]',

  -- Totales
  subtotal       NUMERIC(10,2) NOT NULL DEFAULT 0, -- suma de items sin descuento
  descuento_tipo TEXT CHECK (descuento_tipo IN ('porcentaje', 'fijo')),
  descuento_valor NUMERIC(10,2) NOT NULL DEFAULT 0, -- % o monto ingresado
  descuento_monto NUMERIC(10,2) NOT NULL DEFAULT 0, -- monto real descontado
  base_imponible NUMERIC(10,2) NOT NULL DEFAULT 0, -- subtotal - descuento
  iva_porcentaje NUMERIC(5,2)  NOT NULL DEFAULT 15,
  iva_monto      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Vigencia
  vigencia_horas INTEGER, -- NULL = sin vigencia definida
  vence_en       TIMESTAMPTZ,  -- emitida_en + vigencia_horas (calculado al crear)

  -- Estado
  email_enviado  BOOLEAN NOT NULL DEFAULT false,
  email_enviado_en TIMESTAMPTZ,
  nota           TEXT, -- nota interna opcional del admin

  -- Auditoría
  creado_por     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar actualizado_en
CREATE OR REPLACE FUNCTION actualizar_proforma_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_proformas_updated_at
  BEFORE UPDATE ON proformas
  FOR EACH ROW EXECUTE FUNCTION actualizar_proforma_timestamp();

-- Función para generar el número correlativo PRO-XXX
CREATE OR REPLACE FUNCTION generar_numero_proforma()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_num INTEGER;
BEGIN
  v_num := nextval('proformas_numero_seq');
  RETURN 'PRO-' || LPAD(v_num::TEXT, 3, '0');
END;
$$;

-- Índices útiles para búsqueda y filtrado
CREATE INDEX idx_proformas_cliente_id  ON proformas(cliente_id);
CREATE INDEX idx_proformas_cliente_email ON proformas(cliente_email);
CREATE INDEX idx_proformas_creado_en   ON proformas(creado_en DESC);
CREATE INDEX idx_proformas_vence_en    ON proformas(vence_en);

-- RLS: solo admins autenticados acceden
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_gestionar_proformas"
  ON proformas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comentarios de columnas para claridad
COMMENT ON TABLE proformas IS 'Proformas/cotizaciones generadas y enviadas por email al cliente';
COMMENT ON COLUMN proformas.numero IS 'Número correlativo: PRO-001, PRO-002, ...';
COMMENT ON COLUMN proformas.items IS 'Array JSONB: [{ producto_id, nombre, cantidad, precio_unitario, subtotal }]';
COMMENT ON COLUMN proformas.descuento_tipo IS 'porcentaje = % sobre subtotal | fijo = monto fijo en dinero';
COMMENT ON COLUMN proformas.descuento_monto IS 'Monto real descontado (calculado)';
COMMENT ON COLUMN proformas.vigencia_horas IS 'Horas de validez desde emisión. NULL = sin fecha límite';
COMMENT ON COLUMN proformas.vence_en IS 'Timestamp exacto de vencimiento = creado_en + vigencia_horas';
