-- Migración: Módulo de Proveedores y Control de Deudas
-- Creado el: 2026-05-08

-- 1. Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  razon_social TEXT,
  ruc TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  pais TEXT DEFAULT 'Ecuador',
  ciudad TEXT,
  direccion TEXT,
  notas TEXT,
  saldo_pendiente DECIMAL(12,2) DEFAULT 0, -- Suma de deudas menos abonos
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Pagos/Abonos a Proveedores
CREATE TABLE IF NOT EXISTS pagos_proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
  egreso_id UUID REFERENCES egresos(id) ON DELETE SET NULL, -- Vinculación con la tabla de egresos
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  fecha DATE DEFAULT CURRENT_DATE,
  notas TEXT,
  creado_por UUID REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedores ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a autenticados en proveedores') THEN
        CREATE POLICY "Permitir todo a autenticados en proveedores" ON proveedores FOR ALL TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a autenticados en pagos_proveedores') THEN
        CREATE POLICY "Permitir todo a autenticados en pagos_proveedores" ON pagos_proveedores FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- 5. Trigger para actualizar el saldo del proveedor automáticamente al insertar un pago
-- Nota: El saldo también puede aumentar si se registra una deuda (esto lo manejaremos por lógica de aplicación o una tabla de facturas_compra en el futuro)
-- Por ahora, los pagos RESTAN del saldo_pendiente.
CREATE OR REPLACE FUNCTION funcion_actualizar_saldo_proveedor()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE proveedores 
    SET saldo_pendiente = saldo_pendiente - NEW.monto
    WHERE id = NEW.proveedor_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE proveedores 
    SET saldo_pendiente = saldo_pendiente + OLD.monto
    WHERE id = OLD.proveedor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_saldo_proveedor ON pagos_proveedores;
CREATE TRIGGER trigger_actualizar_saldo_proveedor
AFTER INSERT OR DELETE ON pagos_proveedores
FOR EACH ROW EXECUTE FUNCTION funcion_actualizar_saldo_proveedor();

-- 6. RPC para incrementar saldo (deudas)
CREATE OR REPLACE FUNCTION incrementar_saldo_proveedor(id_prov UUID, monto DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE proveedores 
  SET saldo_pendiente = saldo_pendiente + monto
  WHERE id = id_prov;
END;
$$ LANGUAGE plpgsql;
