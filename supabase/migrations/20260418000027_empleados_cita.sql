-- ============================================================
-- Sistema de empleados para citas
-- ============================================================

-- 1. Tabla de empleados asignables a citas
CREATE TABLE IF NOT EXISTS empleados_cita (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  orden           INTEGER NOT NULL DEFAULT 0,
  creado_en       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE empleados_cita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestionar_empleados_cita" ON empleados_cita
  FOR ALL USING (obtener_rol() IN ('admin', 'superadmin'));

-- Público puede leer empleados activos para el selector de citas
CREATE POLICY "publico_leer_empleados_activos" ON empleados_cita
  FOR SELECT USING (activo = true);

-- 2. Nuevos campos en configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS capacidad_citas_simultaneas INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seleccion_empleado          BOOLEAN NOT NULL DEFAULT false;

-- 3. Referencia a empleado en la cita (nullable = sin preferencia / cualquiera)
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES empleados_cita(id) ON DELETE SET NULL;

-- 4. Reemplazar el índice único anterior por uno correcto:
--    • Si hay empleado asignado: único por empleado+fecha+hora
--    • El bloqueo global (sin empleado) lo gestiona la lógica de la app
DROP INDEX IF EXISTS idx_citas_activas_horario;

CREATE UNIQUE INDEX idx_citas_empleado_horario
  ON citas(empleado_id, fecha, hora_inicio)
  WHERE estado IN ('reservada', 'confirmada') AND empleado_id IS NOT NULL;
