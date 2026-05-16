-- Agrega campo motivo_anulacion a facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS motivo_anulacion text;
