-- Campos para soporte de ventas manuales (POS) en pedidos

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS forma_pago      text
    CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  ADD COLUMN IF NOT EXISTS es_venta_manual boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pedidos_manual ON pedidos(es_venta_manual) WHERE es_venta_manual = true;
