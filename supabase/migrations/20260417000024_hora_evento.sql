-- ============================================================
-- Agregar hora_evento a solicitudes_evento
-- Campo opcional para indicar la hora aproximada del evento
-- ============================================================

ALTER TABLE solicitudes_evento
  ADD COLUMN IF NOT EXISTS hora_evento time;
