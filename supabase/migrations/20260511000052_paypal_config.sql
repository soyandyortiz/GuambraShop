-- ============================================================
-- PayPal: configuración y campo paypal_order_id en pedidos
-- ============================================================

-- Campos de configuración PayPal en configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS paypal_activo     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paypal_client_id  TEXT,
  ADD COLUMN IF NOT EXISTS paypal_secret     TEXT,
  ADD COLUMN IF NOT EXISTS paypal_modo       TEXT NOT NULL DEFAULT 'sandbox';

-- Referencia del pago en PayPal para trazabilidad
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;

-- Índice para buscar por order_id de PayPal
CREATE INDEX IF NOT EXISTS idx_pedidos_paypal_order_id
  ON pedidos (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;
