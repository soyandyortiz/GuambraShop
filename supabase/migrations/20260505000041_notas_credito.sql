-- Soporte para Notas de Crédito Electrónicas (código SRI 04)
-- Las NC se almacenan en la misma tabla `facturas` con tipo = 'nota_credito'

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tipo             text NOT NULL DEFAULT 'factura'
    CHECK (tipo IN ('factura', 'nota_credito')),
  ADD COLUMN IF NOT EXISTS factura_origen_id uuid REFERENCES facturas(id) ON DELETE SET NULL;

-- Secuencial independiente para Notas de Crédito
ALTER TABLE configuracion_facturacion
  ADD COLUMN IF NOT EXISTS secuencial_nc_actual integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas(tipo);
CREATE INDEX IF NOT EXISTS idx_facturas_origen ON facturas(factura_origen_id) WHERE factura_origen_id IS NOT NULL;
