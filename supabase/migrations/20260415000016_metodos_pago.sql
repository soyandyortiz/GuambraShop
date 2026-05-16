-- ============================================================
-- Métodos de pago (bancos/cooperativas)
-- ============================================================

CREATE TABLE IF NOT EXISTS metodos_pago (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco            text NOT NULL,
  tipo_cuenta      text NOT NULL CHECK (tipo_cuenta IN ('corriente', 'ahorros')),
  numero_cuenta    text NOT NULL,
  cedula_titular   text NOT NULL,
  nombre_titular   text NOT NULL,
  esta_activo      boolean NOT NULL DEFAULT true,
  orden            integer NOT NULL DEFAULT 0,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;

-- Público: solo lectura de activos
CREATE POLICY "metodos_pago_lectura_publica"
  ON metodos_pago FOR SELECT
  USING (esta_activo = true);

-- Admin / superadmin: CRUD completo
CREATE POLICY "metodos_pago_admin_todo"
  ON metodos_pago FOR ALL
  USING (obtener_rol() IN ('admin', 'superadmin'))
  WITH CHECK (obtener_rol() IN ('admin', 'superadmin'));
