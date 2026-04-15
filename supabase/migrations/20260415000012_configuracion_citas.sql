-- ============================================================
-- FASE 1, 4 y 5: Configuración de Citas en Tienda
-- ============================================================

-- Agregar columnas a la tabla de configuración de tienda
ALTER TABLE configuracion_tienda 
ADD COLUMN IF NOT EXISTS habilitar_citas BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hora_apertura TIME NOT NULL DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS hora_cierre TIME NOT NULL DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS duracion_cita_minutos INT NOT NULL DEFAULT 30;

-- Asegurar validaciones de los horarios
ALTER TABLE configuracion_tienda
DROP CONSTRAINT IF EXISTS check_horarios_cita;

ALTER TABLE configuracion_tienda
ADD CONSTRAINT check_horarios_cita CHECK (
  hora_apertura < hora_cierre AND
  duracion_cita_minutos > 0
);
