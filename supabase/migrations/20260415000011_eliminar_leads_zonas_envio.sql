-- ============================================================
-- LIMPIEZA: Eliminar módulos leads y zonas_envio
-- Estos módulos fueron removidos de la aplicación.
-- Ejecutar en bases de datos existentes de clientes.
-- ============================================================

-- 1. Quitar FK en pedidos antes de eliminar zonas_envio
ALTER TABLE pedidos
  DROP COLUMN IF EXISTS zona_envio_id,
  DROP COLUMN IF EXISTS nombre_zona,
  DROP COLUMN IF EXISTS empresa_envio,
  DROP COLUMN IF EXISTS tiempo_entrega;

-- 2. Eliminar tabla zonas_envio (CASCADE elimina índices y políticas)
DROP TABLE IF EXISTS zonas_envio CASCADE;

-- 3. Eliminar tabla leads (CASCADE elimina índices y políticas)
DROP TABLE IF EXISTS leads CASCADE;
