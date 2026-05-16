-- Permite al admin leer configuracion_email (proveedor, activo)
-- para mostrar el contador de uso de emails en dashboard y facturación.
-- La escritura y la página de configuración siguen siendo solo superadmin.
CREATE POLICY "admin_leer_email" ON configuracion_email
  FOR SELECT USING (obtener_rol() IN ('admin', 'superadmin'));
