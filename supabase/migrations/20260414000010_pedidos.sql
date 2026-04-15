-- ============================================================
-- TABLA DE PEDIDOS
-- Reemplaza el módulo de leads con un sistema de órdenes completo
-- ============================================================

-- Secuencia para número de orden (ej: ORD-00001)
CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START 1;

CREATE TABLE IF NOT EXISTS pedidos (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden        text        UNIQUE,

  -- Tipo de entrega
  tipo                text        NOT NULL CHECK (tipo IN ('delivery', 'local')),

  -- Datos del cliente
  nombres             text        NOT NULL,
  email               text        NOT NULL,
  whatsapp            text        NOT NULL,

  -- Dirección (solo delivery)
  provincia           text,
  ciudad              text,
  direccion           text,
  detalles_direccion  text,

  -- Items del carrito (JSON)
  items               jsonb       NOT NULL DEFAULT '[]',

  -- Resumen financiero
  simbolo_moneda      text        NOT NULL DEFAULT '$',
  subtotal            numeric(10,2) NOT NULL DEFAULT 0,
  descuento_cupon     numeric(10,2) NOT NULL DEFAULT 0,
  cupon_codigo        text,
  costo_envio         numeric(10,2) NOT NULL DEFAULT 0,
  total               numeric(10,2) NOT NULL DEFAULT 0,

  -- Estado del pedido
  estado              text        NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado')),

  -- Timestamps
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);

-- Trigger: auto-generar número de orden (ORD-00001)
CREATE OR REPLACE FUNCTION generar_numero_orden()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero_orden IS NULL OR NEW.numero_orden = '' THEN
    NEW.numero_orden := 'ORD-' || LPAD(nextval('pedidos_numero_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_generar_numero_orden
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION generar_numero_orden();

-- Trigger: actualizar timestamp
CREATE OR REPLACE FUNCTION actualizar_pedido_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_actualizar_pedido_ts
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_pedido_ts();

-- Índices
CREATE INDEX idx_pedidos_tipo      ON pedidos(tipo);
CREATE INDEX idx_pedidos_estado    ON pedidos(estado);
CREATE INDEX idx_pedidos_creado_en ON pedidos(creado_en DESC);

-- Row Level Security
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Clientes anónimos y autenticados pueden crear pedidos
CREATE POLICY "Clientes pueden crear pedidos" ON pedidos
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Solo autenticados (admin) pueden ver pedidos
CREATE POLICY "Admin puede ver pedidos" ON pedidos
  FOR SELECT TO authenticated
  USING (true);

-- Solo autenticados pueden actualizar estado
CREATE POLICY "Admin puede actualizar pedidos" ON pedidos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
