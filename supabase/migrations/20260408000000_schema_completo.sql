-- ============================================================
-- TIENDA DEMO - Schema completo
-- Idioma: Español
-- Fecha: 2026-04-08
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ============================================================
-- FUNCIÓN GLOBAL: actualizar campo updated_at automáticamente
-- ============================================================
create or replace function actualizar_updated_at()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- TABLA 1: PERFILES
-- Extiende auth.users de Supabase con rol y datos adicionales.
-- Se crea automáticamente al registrar un usuario en Auth.
-- ============================================================
create table perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  rol             text not null default 'admin' check (rol in ('admin', 'superadmin')),
  nombre          text,
  telefono        text,
  creado_en       timestamptz default now(),
  actualizado_en  timestamptz default now()
);

create trigger tr_perfiles_updated_at
  before update on perfiles
  for each row execute function actualizar_updated_at();

-- Crear perfil automáticamente cuando se registra un usuario en Auth
create or replace function crear_perfil_nuevo_usuario()
returns trigger as $$
begin
  insert into public.perfiles (id, rol, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'rol', 'admin'),
    coalesce(new.raw_user_meta_data->>'nombre', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger tr_crear_perfil_al_registrar
  after insert on auth.users
  for each row execute function crear_perfil_nuevo_usuario();


-- ============================================================
-- TABLA 2: CONFIGURACIÓN DE LA TIENDA
-- Una sola fila por tienda.
-- ============================================================
create table configuracion_tienda (
  id                  uuid primary key default gen_random_uuid(),
  nombre_tienda       text not null default 'Mi Tienda',
  descripcion         text,
  logo_url            text,
  banner_url          text,
  favicon_url         text,
  whatsapp            text,
  moneda              text not null default 'USD',
  simbolo_moneda      text not null default '$',
  politicas_negocio   text,
  meta_descripcion    text,
  esta_activa         boolean not null default true,
  mensaje_suspension  text not null default 'Esta tienda está temporalmente suspendida. Contáctanos para más información.',
  info_pago           text,
  color_primario      text default '#ef4444',
  tema_id             text default 'claro' check (tema_id in ('claro', 'oscuro', 'midnight', 'calido', 'oceano')),
  creado_en           timestamptz default now(),
  actualizado_en      timestamptz default now()
);

create trigger tr_configuracion_updated_at
  before update on configuracion_tienda
  for each row execute function actualizar_updated_at();


-- ============================================================
-- TABLA 3: DIRECCIONES DEL NEGOCIO
-- Múltiples direcciones físicas de la tienda.
-- ============================================================
create table direcciones_negocio (
  id            uuid primary key default gen_random_uuid(),
  etiqueta      text not null default 'Tienda principal',
  direccion     text not null,
  ciudad        text,
  provincia     text,
  pais          text not null default 'Ecuador',
  es_principal  boolean not null default false,
  creado_en     timestamptz default now()
);


-- ============================================================
-- TABLA 4: REDES SOCIALES
-- Botones de redes sociales del negocio.
-- ============================================================
create table redes_sociales (
  id          uuid primary key default gen_random_uuid(),
  plataforma  text not null check (plataforma in (
    'instagram', 'facebook', 'tiktok', 'youtube',
    'twitter', 'pinterest', 'linkedin', 'snapchat', 'whatsapp'
  )),
  url         text not null,
  esta_activa boolean not null default true,
  orden       int not null default 0
);


-- ============================================================
-- TABLA 5: MENSAJES DEL SUPERADMIN AL ADMIN
-- Aparecen en el dashboard del admin de la tienda.
-- ============================================================
create table mensajes_admin (
  id        uuid primary key default gen_random_uuid(),
  asunto    text,
  cuerpo    text not null,
  leido     boolean not null default false,
  creado_en timestamptz default now()
);


-- ============================================================
-- TABLA 6: CATEGORÍAS
-- Soporta subcategorías mediante parent_id (auto-referencia).
-- ============================================================
create table categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  parent_id   uuid references categorias(id) on delete set null,
  imagen_url  text,
  esta_activa boolean not null default true,
  orden       int not null default 0,
  creado_en   timestamptz default now()
);

create index idx_categorias_parent on categorias(parent_id);
create index idx_categorias_slug on categorias(slug);


-- ============================================================
-- TABLA 7: PRODUCTOS
-- Incluye búsqueda full-text en español.
-- ============================================================
create table productos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  slug             text not null unique,
  descripcion      text,
  precio           numeric(10,2) not null check (precio >= 0),
  precio_descuento numeric(10,2) check (precio_descuento >= 0),
  categoria_id     uuid references categorias(id) on delete set null,
  esta_activo      boolean not null default true,
  etiquetas        text[] not null default '{}',
  vector_busqueda  tsvector,
  creado_en        timestamptz default now(),
  actualizado_en   timestamptz default now(),
  constraint precio_descuento_menor check (
    precio_descuento is null or precio_descuento < precio
  )
);

create index idx_productos_vector_busqueda on productos using gin(vector_busqueda);
create index idx_productos_precio on productos(precio);
create index idx_productos_precio_descuento on productos(precio_descuento);
create index idx_productos_categoria on productos(categoria_id);
create index idx_productos_activo on productos(esta_activo);
create index idx_productos_etiquetas on productos using gin(etiquetas);

-- Actualizar vector de búsqueda en español automáticamente
create or replace function actualizar_vector_busqueda_producto()
returns trigger as $$
begin
  new.vector_busqueda := to_tsvector('spanish',
    unaccent(coalesce(new.nombre, '')) || ' ' ||
    unaccent(coalesce(new.descripcion, '')) || ' ' ||
    unaccent(coalesce(array_to_string(new.etiquetas, ' '), ''))
  );
  return new;
end;
$$ language plpgsql;

create trigger tr_producto_vector_busqueda
  before insert or update on productos
  for each row execute function actualizar_vector_busqueda_producto();

create trigger tr_productos_updated_at
  before update on productos
  for each row execute function actualizar_updated_at();


-- ============================================================
-- TABLA 8: IMÁGENES DE PRODUCTOS
-- Máximo 5 imágenes por producto. orden=0 es la imagen principal.
-- ============================================================
create table imagenes_producto (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  url         text not null,
  orden       int not null default 0,
  creado_en   timestamptz default now()
);

create index idx_imagenes_producto on imagenes_producto(producto_id, orden);


-- ============================================================
-- TABLA 9: VARIANTES DE PRODUCTO
-- El precio_variante reemplaza al precio base cuando se selecciona.
-- ============================================================
create table variantes_producto (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references productos(id) on delete cascade,
  nombre          text not null,
  descripcion     text,
  precio_variante numeric(10,2) check (precio_variante >= 0),
  esta_activa     boolean not null default true,
  orden           int not null default 0,
  creado_en       timestamptz default now()
);

create index idx_variantes_producto on variantes_producto(producto_id);


-- ============================================================
-- TABLA 10: PRODUCTOS RELACIONADOS
-- El admin selecciona manualmente los productos relacionados.
-- ============================================================
create table productos_relacionados (
  producto_id             uuid references productos(id) on delete cascade,
  producto_relacionado_id uuid references productos(id) on delete cascade,
  primary key (producto_id, producto_relacionado_id),
  constraint no_autorelacion check (producto_id <> producto_relacionado_id)
);


-- ============================================================
-- TABLA 11: LIKES DE PRODUCTOS
-- Anónimos: se usa session_id generado en localStorage del cliente.
-- ============================================================
create table likes_producto (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  session_id  text not null,
  creado_en   timestamptz default now(),
  unique(producto_id, session_id)
);

create index idx_likes_producto on likes_producto(producto_id);


-- ============================================================
-- TABLA 12: RESEÑAS Y CALIFICACIONES DE PRODUCTOS
-- Requiere nombre y cédula. 1 reseña por cédula por producto.
-- ============================================================
create table resenas_producto (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references productos(id) on delete cascade,
  nombre_cliente  text not null,
  cedula          text not null,
  calificacion    int not null check (calificacion between 1 and 5),
  comentario      text,
  es_visible      boolean not null default true,
  creado_en       timestamptz default now(),
  unique(producto_id, cedula)
);

create index idx_resenas_producto on resenas_producto(producto_id);


-- ============================================================
-- TABLA 13: CUPONES DE DESCUENTO
-- tipo_descuento: 'porcentaje' o 'fijo'
-- ============================================================
create table cupones (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  tipo_descuento  text not null check (tipo_descuento in ('porcentaje', 'fijo')),
  valor_descuento numeric(10,2) not null check (valor_descuento > 0),
  compra_minima   numeric(10,2),
  max_usos        int,
  usos_actuales   int not null default 0,
  esta_activo     boolean not null default true,
  vence_en        timestamptz,
  creado_en       timestamptz default now(),
  constraint usos_no_negativos check (usos_actuales >= 0)
);


-- ============================================================
-- TABLA 14: PROMOCIONES
-- Modal que aparece en la tienda. Imagen en 3 formatos.
-- ============================================================
create table promociones (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  descripcion      text,
  precio           numeric(10,2),
  imagen_url       text not null,
  formato_imagen   text not null default 'cuadrado' check (
    formato_imagen in ('cuadrado', 'horizontal', 'vertical')
  ),
  mensaje_whatsapp text not null,
  esta_activa      boolean not null default true,
  inicia_en        timestamptz,
  termina_en       timestamptz,
  creado_en        timestamptz default now()
);




-- ============================================================
-- RLS: ROW LEVEL SECURITY
-- ============================================================

-- Función helper para obtener el rol del usuario autenticado
create or replace function obtener_rol()
returns text as $$
  select rol from perfiles where id = auth.uid();
$$ language sql security definer stable;

-- Activar RLS en todas las tablas
alter table perfiles                enable row level security;
alter table configuracion_tienda    enable row level security;
alter table direcciones_negocio     enable row level security;
alter table redes_sociales          enable row level security;
alter table mensajes_admin          enable row level security;
alter table categorias              enable row level security;
alter table productos               enable row level security;
alter table imagenes_producto       enable row level security;
alter table variantes_producto      enable row level security;
alter table productos_relacionados  enable row level security;
alter table likes_producto          enable row level security;
alter table resenas_producto        enable row level security;
alter table cupones                 enable row level security;
alter table promociones             enable row level security;

-- ────────────────────────────────────────────
-- PERFILES
-- ────────────────────────────────────────────
create policy "admin_ver_su_perfil" on perfiles
  for select using (auth.uid() = id);

create policy "superadmin_ver_todos_perfiles" on perfiles
  for select using (obtener_rol() = 'superadmin');

create policy "admin_actualizar_su_perfil" on perfiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id and
    -- el admin no puede cambiarse el rol
    rol = (select rol from perfiles where id = auth.uid())
  );

create policy "superadmin_gestionar_perfiles" on perfiles
  for all using (obtener_rol() = 'superadmin');

-- ────────────────────────────────────────────
-- CONFIGURACIÓN DE LA TIENDA
-- ────────────────────────────────────────────
-- Público: puede leer datos básicos (no info_pago)
create policy "publico_ver_config_tienda" on configuracion_tienda
  for select using (true);

-- Admin: puede editar todo EXCEPTO esta_activa e info_pago
create policy "admin_editar_config_tienda" on configuracion_tienda
  for update using (obtener_rol() = 'admin')
  with check (
    obtener_rol() = 'admin' and
    esta_activa = (select esta_activa from configuracion_tienda limit 1)
  );

-- Superadmin: acceso total
create policy "superadmin_gestionar_config_tienda" on configuracion_tienda
  for all using (obtener_rol() = 'superadmin');

-- ────────────────────────────────────────────
-- DIRECCIONES, REDES SOCIALES
-- ────────────────────────────────────────────
create policy "publico_ver_direcciones" on direcciones_negocio
  for select using (true);

create policy "admin_gestionar_direcciones" on direcciones_negocio
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "publico_ver_redes_activas" on redes_sociales
  for select using (esta_activa = true);

create policy "admin_gestionar_redes" on redes_sociales
  for all using (obtener_rol() in ('admin', 'superadmin'));

-- ────────────────────────────────────────────
-- MENSAJES DEL SUPERADMIN
-- ────────────────────────────────────────────
create policy "admin_ver_mensajes" on mensajes_admin
  for select using (obtener_rol() in ('admin', 'superadmin'));

create policy "admin_marcar_leido" on mensajes_admin
  for update using (obtener_rol() = 'admin')
  with check (obtener_rol() = 'admin');

create policy "superadmin_gestionar_mensajes" on mensajes_admin
  for all using (obtener_rol() = 'superadmin');

-- ────────────────────────────────────────────
-- CATEGORÍAS
-- ────────────────────────────────────────────
create policy "publico_ver_categorias_activas" on categorias
  for select using (esta_activa = true);

create policy "admin_gestionar_categorias" on categorias
  for all using (obtener_rol() in ('admin', 'superadmin'));

-- ────────────────────────────────────────────
-- PRODUCTOS, IMÁGENES, VARIANTES, RELACIONADOS
-- ────────────────────────────────────────────
create policy "publico_ver_productos_activos" on productos
  for select using (esta_activo = true);

create policy "admin_gestionar_productos" on productos
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "publico_ver_imagenes_productos_activos" on imagenes_producto
  for select using (
    exists (
      select 1 from productos p
      where p.id = imagenes_producto.producto_id and p.esta_activo = true
    )
  );

create policy "admin_gestionar_imagenes" on imagenes_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "publico_ver_variantes_activas" on variantes_producto
  for select using (esta_activa = true);

create policy "admin_gestionar_variantes" on variantes_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "publico_ver_relacionados" on productos_relacionados
  for select using (true);

create policy "admin_gestionar_relacionados" on productos_relacionados
  for all using (obtener_rol() in ('admin', 'superadmin'));

-- ────────────────────────────────────────────
-- LIKES (anónimos)
-- ────────────────────────────────────────────
create policy "publico_ver_likes" on likes_producto
  for select using (true);

create policy "publico_dar_like" on likes_producto
  for insert with check (true);

create policy "publico_quitar_like" on likes_producto
  for delete using (true);

create policy "admin_ver_likes" on likes_producto
  for select using (obtener_rol() in ('admin', 'superadmin'));

-- ────────────────────────────────────────────
-- RESEÑAS (nombre + cédula requeridos)
-- ────────────────────────────────────────────
create policy "publico_ver_resenas_visibles" on resenas_producto
  for select using (es_visible = true);

create policy "publico_crear_resena" on resenas_producto
  for insert with check (
    nombre_cliente is not null and
    cedula is not null and
    length(cedula) >= 8
  );

create policy "admin_gestionar_resenas" on resenas_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));

-- ────────────────────────────────────────────
-- CUPONES
-- ────────────────────────────────────────────
-- Público solo puede validar por código (lectura limitada)
create policy "publico_validar_cupon" on cupones
  for select using (esta_activo = true);

create policy "admin_gestionar_cupones" on cupones
  for all using (obtener_rol() in ('admin', 'superadmin'));

-- ────────────────────────────────────────────
-- PROMOCIONES
-- ────────────────────────────────────────────
create policy "publico_ver_promociones_activas" on promociones
  for select using (
    esta_activa = true and
    (inicia_en is null or inicia_en <= now()) and
    (termina_en is null or termina_en >= now())
  );

create policy "admin_gestionar_promociones" on promociones
  for all using (obtener_rol() in ('admin', 'superadmin'));

