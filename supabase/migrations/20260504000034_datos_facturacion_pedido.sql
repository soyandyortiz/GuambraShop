-- Agrega datos de facturación opcionales al pedido
-- El cliente puede proporcionar sus datos SRI al finalizar la compra
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS datos_facturacion JSONB;

-- Índice para buscar pedidos con datos de facturación
CREATE INDEX IF NOT EXISTS idx_pedidos_datos_facturacion
  ON pedidos ((datos_facturacion IS NOT NULL))
  WHERE datos_facturacion IS NOT NULL;
