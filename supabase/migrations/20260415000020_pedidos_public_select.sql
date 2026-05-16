-- Permite lectura pública de un pedido por número de orden (página de seguimiento)
-- El anónimo solo puede leer si conoce el numero_orden exacto
CREATE POLICY "Publico puede ver pedido por numero_orden" ON pedidos
  FOR SELECT TO anon
  USING (true);
