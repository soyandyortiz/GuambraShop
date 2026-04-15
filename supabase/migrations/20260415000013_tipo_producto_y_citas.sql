-- ============================================================
-- FASE 2: Tipo de producto "servicio" y tabla de Citas
-- ============================================================

-- Añadir el campo de tipo a la tabla de productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS tipo_producto TEXT NOT NULL DEFAULT 'producto'
CHECK (tipo_producto IN ('producto', 'servicio'));

-- Crear tabla independiente de citas para guardar reservas
CREATE TABLE IF NOT EXISTS citas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           UUID REFERENCES pedidos(id) ON DELETE SET NULL, -- Se asigna cuando finaliza la compra
  producto_id         UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  -- Datos de la cita
  fecha               DATE NOT NULL,
  hora_inicio         TIME NOT NULL,
  hora_fin            TIME NOT NULL,
  
  -- Estado de la cita: 'pendiente' (en carrito), 'reservada' (orden pagada/creada confirmada_al_admin = false), 'confirmada', 'cancelada'
  estado              TEXT NOT NULL DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'reservada', 'confirmada', 'cancelada')),
    
  creado_en           TIMESTAMPTZ DEFAULT now(),
  actualizado_en      TIMESTAMPTZ DEFAULT now()
);

-- Evitar conflictos de horario para el mismo producto/servicio (Ej no misma hora)
-- Si es un servicio con "stock o cantidad" podría requerir ajustes. Asumimos 1 cita por bloque en un mismo negocio en general o por servicio.
-- En este caso lo restringiremos solo sobre citas confirmadas o reservadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_activas_horario 
  ON citas(fecha, hora_inicio) 
  WHERE estado IN ('reservada', 'confirmada');

-- Trigger para actualizado_en (asumiendo que existe `actualizar_updated_at` helper function configurado prev y de forma global)
CREATE TRIGGER tr_citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- RLS
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestionar_citas" ON citas
  FOR ALL USING (obtener_rol() IN ('admin', 'superadmin'));

-- Público puede crear citas (estado 'pendiente') al meter al carrito
CREATE POLICY "publico_crear_citas_pendientes" ON citas
  FOR INSERT WITH CHECK (true);

-- Público puede leer las citas 'reservadas' o 'confirmadas' para verificar horarios ocupados
CREATE POLICY "publico_leer_citas_activas" ON citas
  FOR SELECT USING (estado IN ('reservada', 'confirmada'));
