-- Función que retorna el uso de storage agrupado por bucket.
-- SECURITY DEFINER + search_path = storage permite leer storage.objects
-- sin exponer el esquema directamente. Solo el service_role puede ejecutarla.

CREATE OR REPLACE FUNCTION public.obtener_uso_storage()
RETURNS TABLE (
  bucket_id      text,
  total_bytes    bigint,
  total_archivos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.bucket_id,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0)::bigint AS total_bytes,
    COUNT(*)::bigint                                          AS total_archivos
  FROM storage.objects o
  GROUP BY o.bucket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_uso_storage() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.obtener_uso_storage() TO service_role;
