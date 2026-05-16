-- Crea el bucket 'imagenes' como público si no existe.
-- Todas las imágenes (productos, categorías, tienda) se almacenan aquí.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 52428800,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/svg+xml'];

-- Política de lectura pública (cualquiera puede ver las imágenes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'imagenes_lectura_publica'
  ) THEN
    CREATE POLICY "imagenes_lectura_publica" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'imagenes');
  END IF;
END $$;

-- Política de escritura para usuarios autenticados (admin/superadmin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'imagenes_escritura_autenticados'
  ) THEN
    CREATE POLICY "imagenes_escritura_autenticados" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'imagenes');
  END IF;
END $$;

-- Política de eliminación para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'imagenes_eliminacion_autenticados'
  ) THEN
    CREATE POLICY "imagenes_eliminacion_autenticados" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'imagenes');
  END IF;
END $$;
