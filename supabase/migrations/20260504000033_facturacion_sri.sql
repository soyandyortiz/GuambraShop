-- ============================================================
-- FACTURACIÓN ELECTRÓNICA SRI ECUADOR
-- Fase 2: Tablas de configuración y facturas
-- ============================================================

-- Bucket privado para certificados .p12
-- (Ejecutar si no existe; ignorar si ya está creado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('facturacion', 'facturacion', false)
ON CONFLICT (id) DO NOTHING;

-- Tabla: configuracion_facturacion
CREATE TABLE IF NOT EXISTS configuracion_facturacion (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc                     VARCHAR(13) NOT NULL,
  razon_social            TEXT NOT NULL,
  nombre_comercial        TEXT,
  direccion_matriz        TEXT NOT NULL,
  codigo_establecimiento  VARCHAR(3) NOT NULL DEFAULT '001',
  punto_emision           VARCHAR(3) NOT NULL DEFAULT '001',
  ambiente                TEXT NOT NULL DEFAULT 'pruebas' CHECK (ambiente IN ('pruebas', 'produccion')),
  obligado_contabilidad   BOOLEAN NOT NULL DEFAULT FALSE,
  tarifa_iva              NUMERIC(5,2) NOT NULL DEFAULT 15,
  contribuyente_especial  VARCHAR(20),
  regimen                 TEXT,
  cert_p12_url            TEXT,
  cert_pin                TEXT,
  secuencial_actual       INTEGER NOT NULL DEFAULT 1,
  activo                  BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo debe haber una fila
CREATE UNIQUE INDEX IF NOT EXISTS configuracion_facturacion_unica ON configuracion_facturacion ((TRUE));

-- Trigger updated_at
DROP TRIGGER IF EXISTS tr_configuracion_facturacion_updated_at ON configuracion_facturacion;
CREATE TRIGGER tr_configuracion_facturacion_updated_at
  BEFORE UPDATE ON configuracion_facturacion
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- Tabla: facturas
CREATE TABLE IF NOT EXISTS facturas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id             UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  numero_secuencial     VARCHAR(9) NOT NULL,
  numero_factura        VARCHAR(17),           -- "001-001-000000001"
  clave_acceso          VARCHAR(49),           -- Clave de 49 dígitos generada por SRI
  numero_autorizacion   VARCHAR(49),           -- Igual a clave_acceso si autorizada
  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion    TIMESTAMPTZ,
  estado                TEXT NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador','enviada','autorizada','rechazada','anulada')),
  datos_comprador       JSONB NOT NULL DEFAULT '{}',  -- {nombre, cedula, email, direccion, telefono}
  items                 JSONB NOT NULL DEFAULT '[]',  -- [{descripcion, cantidad, precio_unitario, descuento, subtotal, iva}]
  totales               JSONB NOT NULL DEFAULT '{}',  -- {subtotal_0, subtotal_iva, total_iva, descuento, total}
  xml_firmado           TEXT,
  ride_url              TEXT,
  error_sri             TEXT,
  notas                 TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_pedido_id    ON facturas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado       ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha        ON facturas(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_clave        ON facturas(clave_acceso) WHERE clave_acceso IS NOT NULL;

DROP TRIGGER IF EXISTS tr_facturas_updated_at ON facturas;
CREATE TRIGGER tr_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- RLS
ALTER TABLE configuracion_facturacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_gestionar_config_facturacion" ON configuracion_facturacion;
CREATE POLICY "superadmin_gestionar_config_facturacion" ON configuracion_facturacion
  FOR ALL USING (obtener_rol() = 'superadmin');

DROP POLICY IF EXISTS "admin_leer_config_facturacion" ON configuracion_facturacion;
CREATE POLICY "admin_leer_config_facturacion" ON configuracion_facturacion
  FOR SELECT USING (obtener_rol() IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "admin_gestionar_facturas" ON facturas;
CREATE POLICY "admin_gestionar_facturas" ON facturas
  FOR ALL USING (obtener_rol() IN ('admin', 'superadmin'));

-- Policy de Storage: solo admin/superadmin pueden subir/leer certificados
CREATE POLICY "superadmin_storage_facturacion"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'facturacion' AND obtener_rol() = 'superadmin')
  WITH CHECK (bucket_id = 'facturacion' AND obtener_rol() = 'superadmin');
