-- ============================================================
-- Fix: citas creadas al confirmar pedido deben ser 'reservada'
-- ============================================================

-- 1. Actualizar citas 'pendiente' que ya tienen pedido_id → 'reservada'
--    (estas se crean solo al finalizar el checkout, no desde el carrito)
UPDATE citas
SET estado = 'reservada'
WHERE estado = 'pendiente'
  AND pedido_id IS NOT NULL;

-- 2. Corregir el índice único: agregar producto_id para que el bloqueo
--    sea por servicio específico (no global para todo el negocio)
DROP INDEX IF EXISTS idx_citas_activas_horario;

CREATE UNIQUE INDEX idx_citas_activas_horario
  ON citas(producto_id, fecha, hora_inicio)
  WHERE estado IN ('reservada', 'confirmada');
