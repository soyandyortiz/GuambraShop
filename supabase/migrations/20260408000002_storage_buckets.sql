-- ============================================================
-- MIGRACIÓN 3: Storage bucket para imágenes
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagenes',
  'imagenes',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
) on conflict (id) do nothing;

-- Cualquier usuario autenticado puede subir imágenes
create policy "subir_imagenes_autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes');

-- Cualquiera puede ver las imágenes (bucket público)
create policy "ver_imagenes_publico" on storage.objects
  for select using (bucket_id = 'imagenes');

-- Autenticado puede eliminar
create policy "eliminar_imagenes_autenticado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes');

-- Autenticado puede actualizar
create policy "actualizar_imagenes_autenticado" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagenes');
