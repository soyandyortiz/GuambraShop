-- Horario de atención del negocio (JSONB en configuracion_tienda)
-- Estructura: [{ dia: 1, nombre: 'Lunes', apertura: '09:00', cierre: '18:00', abierto: true }, ...]
-- dia: 1=Lunes ... 7=Domingo

ALTER TABLE configuracion_tienda
ADD COLUMN IF NOT EXISTS horario_atencion JSONB;
