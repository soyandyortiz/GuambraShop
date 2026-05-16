-- Payphone: configuración en tienda y campo en pedidos

ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS payphone_activo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payphone_token TEXT,
  ADD COLUMN IF NOT EXISTS payphone_store_id TEXT;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS payphone_payment_id TEXT;
