-- Migración: Cierres de Caja y Egresos (Finanzas)
-- Creado el: 2026-05-08

-- 1. Tabla de Egresos (Gastos)
CREATE TABLE IF NOT EXISTS egresos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descripcion TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  categoria TEXT NOT NULL, -- 'proveedores', 'servicios', 'nomina', 'alquiler', 'otros'
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo', -- 'efectivo', 'transferencia', 'tarjeta'
  fecha DATE DEFAULT CURRENT_DATE,
  creado_por UUID REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Cierres de Caja
CREATE TABLE IF NOT EXISTS cierres_caja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE UNIQUE NOT NULL,
  total_efectivo DECIMAL(12,2) DEFAULT 0,
  total_transferencia DECIMAL(12,2) DEFAULT 0,
  total_tarjeta DECIMAL(12,2) DEFAULT 0,
  total_otros DECIMAL(12,2) DEFAULT 0,
  total_sistema DECIMAL(12,2) NOT NULL,
  total_real DECIMAL(12,2) NOT NULL,
  diferencia DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'cerrado',
  notas TEXT,
  creado_por UUID REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar RLS (Seguridad)
ALTER TABLE egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a autenticados en egresos') THEN
        CREATE POLICY "Permitir todo a autenticados en egresos" ON egresos FOR ALL TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a autenticados en cierres') THEN
        CREATE POLICY "Permitir todo a autenticados en cierres" ON cierres_caja FOR ALL TO authenticated USING (true);
    END IF;
END $$;
