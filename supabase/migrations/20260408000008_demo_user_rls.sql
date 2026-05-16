-- =============================================================
-- MIGRATION: Demo user RLS policies
-- Bloquea escrituras del usuario demo@tiendademo.local en todas
-- las tablas de contenido administrable.
-- =============================================================

-- Función helper reutilizable
CREATE OR REPLACE FUNCTION es_usuario_demo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.email() = 'demo@tiendademo.local';
$$;

-- =============================================================
-- Políticas de bloqueo por tabla
-- (INSERT, UPDATE, DELETE bloqueados para el demo)
-- =============================================================

-- configuracion_tienda
CREATE POLICY "demo_no_update_config" ON configuracion_tienda
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

-- productos
CREATE POLICY "demo_no_insert_productos" ON productos
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_productos" ON productos
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_productos" ON productos
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- categorias
CREATE POLICY "demo_no_insert_categorias" ON categorias
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_categorias" ON categorias
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_categorias" ON categorias
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- imagenes_producto
CREATE POLICY "demo_no_insert_imagenes" ON imagenes_producto
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_imagenes" ON imagenes_producto
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_imagenes" ON imagenes_producto
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- variantes_producto
CREATE POLICY "demo_no_insert_variantes" ON variantes_producto
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_variantes" ON variantes_producto
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_variantes" ON variantes_producto
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- cupones
CREATE POLICY "demo_no_insert_cupones" ON cupones
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_cupones" ON cupones
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_cupones" ON cupones
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- promociones
CREATE POLICY "demo_no_insert_promociones" ON promociones
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_promociones" ON promociones
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_promociones" ON promociones
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- zonas_envio
CREATE POLICY "demo_no_insert_envios" ON zonas_envio
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_envios" ON zonas_envio
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_envios" ON zonas_envio
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- redes_sociales
CREATE POLICY "demo_no_insert_redes" ON redes_sociales
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_redes" ON redes_sociales
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_redes" ON redes_sociales
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- direcciones_negocio
CREATE POLICY "demo_no_insert_direcciones" ON direcciones_negocio
  FOR INSERT TO authenticated
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_update_direcciones" ON direcciones_negocio
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());

CREATE POLICY "demo_no_delete_direcciones" ON direcciones_negocio
  FOR DELETE TO authenticated
  USING (NOT es_usuario_demo());

-- perfiles (impide que demo cambie su propio rol)
CREATE POLICY "demo_no_update_perfiles" ON perfiles
  FOR UPDATE TO authenticated
  USING (NOT es_usuario_demo())
  WITH CHECK (NOT es_usuario_demo());
