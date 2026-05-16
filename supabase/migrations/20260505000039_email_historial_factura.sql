-- Historial de envío de RIDE por email (Fase 4 módulo email)
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS email_enviado_en timestamptz,
  ADD COLUMN IF NOT EXISTS email_enviado_a  text;
