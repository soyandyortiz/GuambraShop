-- ============================================================
-- GUAMBRASHOP — Schema unificado
-- Generado: 2026-04-20
-- Reemplaza las 27 migraciones incrementales de migrations/
--
-- Para nuevo cliente:
--   1. Copiar este archivo y ejecutarlo en Supabase → SQL Editor
--   2. Ejecutar supabase/seed/01_datos_iniciales.sql
--   3. Crear usuarios en Supabase Auth con metadatos de rol
--   4. Ejecutar supabase/produccion/seed_nuevo_cliente.sql
--
-- Para entorno local (supabase start):
--   Ejecutar supabase/seed/02_usuarios_demo.sql en lugar de los pasos 2-4
-- ============================================================


-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";


-- ============================================================
-- FUNCIONES GLOBALES
-- ============================================================

-- Actualiza automáticamente el campo actualizado_en en cualquier tabla
create or replace function actualizar_updated_at()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

-- Helper RLS: true cuando el usuario activo es el demo de solo-lectura
create or replace function es_usuario_demo()
returns boolean language sql stable security definer as $$
  select auth.email() = 'demo@tiendademo.local';
$$;


-- ============================================================
-- TABLA: perfiles
-- Extiende auth.users con rol y datos del administrador.
-- Se crea automáticamente vía trigger cuando se registra un usuario.
-- ============================================================
create table perfiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  rol            text not null default 'admin' check (rol in ('admin', 'superadmin')),
  nombre         text,
  telefono       text,
  creado_en      timestamptz default now(),
  actualizado_en timestamptz default now()
);

create trigger tr_perfiles_updated_at
  before update on perfiles
  for each row execute function actualizar_updated_at();

-- Crea la fila en perfiles automáticamente al registrar un usuario en Auth
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

-- Helper RLS: devuelve el rol del usuario autenticado (requiere tabla perfiles)
create or replace function obtener_rol()
returns text as $$
  select rol from perfiles where id = auth.uid();
$$ language sql security definer stable;


-- ============================================================
-- TABLA: configuracion_tienda
-- Una sola fila por tienda. Incluye ajustes de citas y cobro.
-- ============================================================
create table configuracion_tienda (
  id                          uuid primary key default gen_random_uuid(),
  -- Datos básicos
  nombre_tienda               text not null default 'Mi Tienda',
  descripcion                 text,
  logo_url                    text,
  favicon_url                 text,
  foto_perfil_url             text,
  foto_portada_url            text,
  whatsapp                    text,
  moneda                      text not null default 'USD',
  simbolo_moneda              text not null default '$',
  politicas_negocio           text,
  meta_descripcion            text,
  color_primario              text default '#ef4444',
  tema_id                     text default 'claro' check (tema_id in ('claro', 'oscuro', 'midnight', 'calido', 'oceano')),
  -- País (determina localización de regiones/ciudades)
  pais                        text default 'EC' check (pais in ('EC', 'PE', 'CO')),
  -- Estado de la tienda
  esta_activa                 boolean not null default true,
  mensaje_suspension          text not null default 'Esta tienda está temporalmente suspendida.',
  info_pago                   text,
  -- Sistema de cobro (solo superadmin puede modificar)
  cobro_activo                boolean not null default false,
  fecha_inicio_sistema        timestamptz,
  dias_pago                   int not null default 30,
  -- Citas y agendamiento
  habilitar_citas             boolean not null default false,
  hora_apertura               time not null default '09:00:00',
  hora_cierre                 time not null default '18:00:00',
  duracion_cita_minutos       int not null default 30,
  capacidad_citas_simultaneas int not null default 1,
  seleccion_empleado          boolean not null default false,
  -- Horario de atención libre (JSONB opcional)
  -- Estructura: [{ dia: 1, nombre: 'Lunes', apertura: '09:00', cierre: '18:00', abierto: true }]
  horario_atencion            jsonb,
  -- Timestamps
  creado_en                   timestamptz default now(),
  actualizado_en              timestamptz default now(),
  -- Validación de horarios cuando las citas están activas
  constraint check_horarios_cita check (hora_apertura < hora_cierre and duracion_cita_minutos > 0)
);

create trigger tr_configuracion_updated_at
  before update on configuracion_tienda
  for each row execute function actualizar_updated_at();


-- ============================================================
-- TABLA: direcciones_negocio
-- Múltiples direcciones físicas del negocio.
-- ============================================================
create table direcciones_negocio (
  id           uuid primary key default gen_random_uuid(),
  etiqueta     text not null default 'Tienda principal',
  direccion    text not null,
  ciudad       text,
  provincia    text,
  pais         text not null default 'Ecuador',
  es_principal boolean not null default false,
  enlace_mapa  text,
  creado_en    timestamptz default now()
);


-- ============================================================
-- TABLA: redes_sociales
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
-- TABLA: mensajes_admin
-- Mensajes del superadmin al admin; aparecen en el dashboard.
-- ============================================================
create table mensajes_admin (
  id        uuid primary key default gen_random_uuid(),
  asunto    text,
  cuerpo    text not null,
  leido     boolean not null default false,
  creado_en timestamptz default now()
);


-- ============================================================
-- TABLA: categorias
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
create index idx_categorias_slug   on categorias(slug);


-- ============================================================
-- TABLA: productos
-- tipo_producto: 'producto' | 'servicio' | 'evento'
-- Incluye búsqueda full-text en español.
-- ============================================================
create table productos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  slug             text not null unique,
  descripcion      text,
  tipo_producto    text not null default 'producto'
    check (tipo_producto in ('producto', 'servicio', 'evento')),
  precio           numeric(10,2) not null check (precio >= 0),
  precio_descuento numeric(10,2) check (precio_descuento >= 0),
  categoria_id     uuid references categorias(id) on delete set null,
  stock            integer,
  esta_activo      boolean not null default true,
  requiere_tallas  boolean not null default false,
  etiquetas        text[] not null default '{}',
  url_video        text,
  -- Paquetes para productos tipo 'evento'
  -- Estructura: [{ id, icono, nombre, descripcion, precio_min, precio_max }]
  paquetes_evento  jsonb default '[]'::jsonb,
  vector_busqueda  tsvector,
  creado_en        timestamptz default now(),
  actualizado_en   timestamptz default now(),
  constraint precio_descuento_menor check (
    precio_descuento is null or precio_descuento < precio
  )
);

create index idx_productos_vector_busqueda on productos using gin(vector_busqueda);
create index idx_productos_precio          on productos(precio);
create index idx_productos_precio_desc     on productos(precio_descuento);
create index idx_productos_categoria       on productos(categoria_id);
create index idx_productos_activo          on productos(esta_activo);
create index idx_productos_etiquetas       on productos using gin(etiquetas);

-- Mantiene el vector de búsqueda en español actualizado
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
-- TABLA: imagenes_producto
-- Máximo 5 imágenes por producto. orden = 0 es la principal.
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
-- TABLA: variantes_producto
-- tipo_precio: 'reemplaza' (sustituye al precio base) | 'suma' (add-on)
-- ============================================================
create table variantes_producto (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references productos(id) on delete cascade,
  nombre          text not null,
  descripcion     text,
  precio_variante numeric(10,2) check (precio_variante >= 0),
  imagen_url      text,
  esta_activa     boolean not null default true,
  orden           int not null default 0,
  stock           integer,
  tipo_precio     text default 'reemplaza' check (tipo_precio in ('reemplaza', 'suma')),
  creado_en       timestamptz default now()
);

create index idx_variantes_producto on variantes_producto(producto_id);


-- ============================================================
-- TABLA: tallas_producto
-- Solo aplica si el producto tiene requiere_tallas = true.
-- ============================================================
create table tallas_producto (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  talla       text not null,
  disponible  boolean not null default true,
  orden       int not null default 0,
  stock       integer,
  creado_en   timestamptz default now(),
  unique(producto_id, talla)
);

create index idx_tallas_producto on tallas_producto(producto_id, orden);


-- ============================================================
-- TABLA: productos_relacionados
-- El admin selecciona manualmente los productos relacionados.
-- ============================================================
create table productos_relacionados (
  producto_id             uuid references productos(id) on delete cascade,
  producto_relacionado_id uuid references productos(id) on delete cascade,
  primary key (producto_id, producto_relacionado_id),
  constraint no_autorelacion check (producto_id <> producto_relacionado_id)
);


-- ============================================================
-- TABLA: likes_producto
-- Anónimos — se usa session_id generado en localStorage del cliente.
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
-- TABLA: resenas_producto
-- Requiere nombre y cédula. 1 reseña por cédula por producto.
-- ============================================================
create table resenas_producto (
  id             uuid primary key default gen_random_uuid(),
  producto_id    uuid not null references productos(id) on delete cascade,
  nombre_cliente text not null,
  cedula         text not null,
  calificacion   int not null check (calificacion between 1 and 5),
  comentario     text,
  es_visible     boolean not null default true,
  creado_en      timestamptz default now(),
  unique(producto_id, cedula)
);

create index idx_resenas_producto on resenas_producto(producto_id);


-- ============================================================
-- TABLA: cupones
-- tipo_descuento: 'porcentaje' | 'fijo'
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
-- TABLA: promociones
-- Modal que aparece en la tienda. Imagen en 3 formatos.
-- ============================================================
create table promociones (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  descripcion      text,
  precio           numeric(10,2),
  imagen_url       text not null,
  formato_imagen   text not null default 'cuadrado'
    check (formato_imagen in ('cuadrado', 'horizontal', 'vertical')),
  mensaje_whatsapp text not null,
  esta_activa      boolean not null default true,
  inicia_en        timestamptz,
  termina_en       timestamptz,
  creado_en        timestamptz default now()
);


-- ============================================================
-- TABLA: zonas_envio
-- Precios de envío por ciudad. city es único (clave de búsqueda).
-- ============================================================
create table zonas_envio (
  id             uuid primary key default gen_random_uuid(),
  provincia      text not null,
  ciudad         text not null,
  precio         numeric(10,2) not null default 0,
  tiempo_entrega text,
  esta_activa    boolean not null default true,
  creado_en      timestamptz not null default now(),
  constraint zonas_envio_ciudad_unica unique (ciudad)
);

create index idx_zonas_envio_ciudad    on zonas_envio (ciudad);
create index idx_zonas_envio_provincia on zonas_envio (provincia);


-- ============================================================
-- TABLA: metodos_pago
-- Cuentas bancarias para transferencias. Se muestran tras crear pedido.
-- ============================================================
create table metodos_pago (
  id             uuid primary key default gen_random_uuid(),
  banco          text not null,
  tipo_cuenta    text not null check (tipo_cuenta in ('corriente', 'ahorros')),
  numero_cuenta  text not null,
  cedula_titular text not null,
  nombre_titular text not null,
  esta_activo    boolean not null default true,
  orden          int not null default 0,
  creado_en      timestamptz not null default now()
);


-- ============================================================
-- TABLA: pedidos
-- Órdenes completas de la tienda. Los items se guardan como JSONB.
-- numero_orden se genera automáticamente (ORD-00001).
-- ============================================================
create sequence if not exists pedidos_numero_seq start 1;

create table pedidos (
  id                 uuid primary key default gen_random_uuid(),
  numero_orden       text unique,
  -- Tipo de entrega
  tipo               text not null check (tipo in ('delivery', 'local')),
  -- Datos del cliente
  nombres            text not null,
  email              text not null,
  whatsapp           text not null,
  -- Dirección (solo delivery)
  provincia          text,
  ciudad             text,
  direccion          text,
  detalles_direccion text,
  -- Items del carrito (snapshot en JSONB)
  items              jsonb not null default '[]',
  -- Resumen financiero
  simbolo_moneda     text not null default '$',
  subtotal           numeric(10,2) not null default 0,
  descuento_cupon    numeric(10,2) not null default 0,
  cupon_codigo       text,
  costo_envio        numeric(10,2) not null default 0,
  total              numeric(10,2) not null default 0,
  -- Estado
  estado             text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado')),
  -- Timestamps
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);

create index idx_pedidos_tipo      on pedidos(tipo);
create index idx_pedidos_estado    on pedidos(estado);
create index idx_pedidos_creado_en on pedidos(creado_en desc);

create or replace function generar_numero_orden()
returns trigger language plpgsql as $$
begin
  if new.numero_orden is null or new.numero_orden = '' then
    new.numero_orden := 'ORD-' || lpad(nextval('pedidos_numero_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger tr_generar_numero_orden
  before insert on pedidos
  for each row execute function generar_numero_orden();

create trigger tr_pedidos_updated_at
  before update on pedidos
  for each row execute function actualizar_updated_at();


-- ============================================================
-- TABLA: empleados_cita
-- Empleados asignables a citas de servicios.
-- ============================================================
create table empleados_cita (
  id              uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  activo          boolean not null default true,
  orden           int not null default 0,
  creado_en       timestamptz default now()
);


-- ============================================================
-- TABLA: citas
-- Reservas de horario para productos tipo 'servicio'.
-- Se vincula a un pedido al confirmar el checkout.
-- ============================================================
create table citas (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid references pedidos(id) on delete set null,
  producto_id uuid not null references productos(id) on delete cascade,
  empleado_id uuid references empleados_cita(id) on delete set null,
  -- Datos del bloque horario
  fecha       date not null,
  hora_inicio time not null,
  hora_fin    time not null,
  -- Estado: 'reservada' se asigna al crear el pedido; 'confirmada' al confirmar el admin
  estado      text not null default 'pendiente'
    check (estado in ('pendiente', 'reservada', 'confirmada', 'cancelada')),
  creado_en       timestamptz default now(),
  actualizado_en  timestamptz default now()
);

-- Unicidad por empleado+servicio+fecha+hora (bloqueo de agenda por empleado)
create unique index idx_citas_empleado_horario
  on citas(empleado_id, fecha, hora_inicio)
  where estado in ('reservada', 'confirmada') and empleado_id is not null;

create trigger tr_citas_updated_at
  before update on citas
  for each row execute function actualizar_updated_at();


-- ============================================================
-- TABLA: solicitudes_evento
-- Flujo de cotización para productos tipo 'evento'.
-- No genera pedido directamente; inicia un proceso de negociación.
-- numero_solicitud se genera automáticamente (SOL-00001).
-- ============================================================
create sequence if not exists solicitudes_numero_seq start 1;

create table solicitudes_evento (
  id                     uuid primary key default gen_random_uuid(),
  numero_solicitud       text unique,
  -- Producto/servicio consultado
  producto_id            uuid references productos(id) on delete set null,
  producto_nombre        text not null,
  -- Datos del cliente
  nombre_cliente         text not null,
  email                  text not null,
  whatsapp               text not null,
  -- Detalles del evento
  fecha_evento           date,
  hora_evento            time,
  ciudad                 text,
  tipo_evento            text,
  presupuesto_aproximado numeric(10,2),
  notas                  text,
  -- Estado del flujo
  estado                 text not null default 'nueva'
    check (estado in ('nueva', 'en_conversacion', 'cotizacion_enviada', 'confirmada', 'rechazada')),
  -- Conversión a pedido al confirmar
  pedido_id              uuid references pedidos(id) on delete set null,
  -- Timestamps
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now()
);

create index idx_solicitudes_estado    on solicitudes_evento(estado);
create index idx_solicitudes_creado_en on solicitudes_evento(creado_en desc);
create index idx_solicitudes_producto  on solicitudes_evento(producto_id);

create or replace function generar_numero_solicitud()
returns trigger language plpgsql as $$
begin
  if new.numero_solicitud is null or new.numero_solicitud = '' then
    new.numero_solicitud := 'SOL-' || lpad(nextval('solicitudes_numero_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger tr_generar_numero_solicitud
  before insert on solicitudes_evento
  for each row execute function generar_numero_solicitud();

create trigger tr_solicitudes_updated_at
  before update on solicitudes_evento
  for each row execute function actualizar_updated_at();


-- ============================================================
-- FUNCIÓN RPC: confirmar_pedido(pedido_id)
-- Confirma un pedido, descuenta stock y confirma citas vinculadas.
-- Llamada desde el dashboard del admin.
-- ============================================================
create or replace function confirmar_pedido(p_pedido_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_item           record;
  v_producto_id    uuid;
  v_variante_id    uuid;
  v_talla_texto    text;
  v_cantidad       int;
  v_estado_actual  text;
begin
  select estado into v_estado_actual from pedidos where id = p_pedido_id;

  -- Solo proceder si el pedido no fue ya confirmado/enviado/entregado
  if v_estado_actual in ('confirmado', 'enviado', 'entregado') then
    return false;
  end if;

  -- Descontar stock según tipo de ítem
  for v_item in
    select * from jsonb_array_elements(
      (select items::jsonb from pedidos where id = p_pedido_id)
    )
  loop
    v_producto_id := (v_item.value->>'producto_id')::uuid;
    v_cantidad    := (v_item.value->>'cantidad')::int;
    v_talla_texto := v_item.value->>'talla';
    v_variante_id := (v_item.value->>'variante_id')::uuid;

    if v_variante_id is not null then
      update variantes_producto
        set stock = greatest(0, stock - v_cantidad)
        where id = v_variante_id and stock is not null;
    elsif v_talla_texto is not null then
      update tallas_producto
        set stock = greatest(0, stock - v_cantidad)
        where producto_id = v_producto_id and talla = v_talla_texto and stock is not null;
    else
      update productos
        set stock = greatest(0, stock - v_cantidad)
        where id = v_producto_id and stock is not null;
    end if;
  end loop;

  -- Actualizar estado del pedido
  update pedidos
    set estado = 'confirmado', actualizado_en = now()
    where id = p_pedido_id;

  -- Confirmar citas vinculadas al pedido
  update citas
    set estado = 'confirmada'
    where pedido_id = p_pedido_id and estado = 'reservada';

  return true;
end;
$$;


-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagenes',
  'imagenes',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) on conflict (id) do nothing;

create policy "subir_imagenes_autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes');

create policy "ver_imagenes_publico" on storage.objects
  for select using (bucket_id = 'imagenes');

create policy "eliminar_imagenes_autenticado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes');

create policy "actualizar_imagenes_autenticado" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagenes');


-- ============================================================
-- RLS — Activar en todas las tablas
-- ============================================================
alter table perfiles                enable row level security;
alter table configuracion_tienda    enable row level security;
alter table direcciones_negocio     enable row level security;
alter table redes_sociales          enable row level security;
alter table mensajes_admin          enable row level security;
alter table categorias              enable row level security;
alter table productos               enable row level security;
alter table imagenes_producto       enable row level security;
alter table variantes_producto      enable row level security;
alter table tallas_producto         enable row level security;
alter table productos_relacionados  enable row level security;
alter table likes_producto          enable row level security;
alter table resenas_producto        enable row level security;
alter table cupones                 enable row level security;
alter table promociones             enable row level security;
alter table zonas_envio             enable row level security;
alter table metodos_pago            enable row level security;
alter table pedidos                 enable row level security;
alter table empleados_cita          enable row level security;
alter table citas                   enable row level security;
alter table solicitudes_evento      enable row level security;


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
    rol = (select rol from perfiles where id = auth.uid())
  );

create policy "superadmin_gestionar_perfiles" on perfiles
  for all using (obtener_rol() = 'superadmin');

create policy "demo_no_update_perfiles" on perfiles
  for update to authenticated
  using (not es_usuario_demo())
  with check (not es_usuario_demo());


-- ────────────────────────────────────────────
-- CONFIGURACIÓN DE LA TIENDA
-- ────────────────────────────────────────────
create policy "publico_ver_config_tienda" on configuracion_tienda
  for select using (true);

-- Admin puede editar todo EXCEPTO esta_activa e info_pago (campos de cobro)
create policy "admin_editar_config_tienda" on configuracion_tienda
  for update using (obtener_rol() = 'admin')
  with check (
    obtener_rol() = 'admin' and
    esta_activa = (select esta_activa from configuracion_tienda limit 1)
  );

create policy "superadmin_gestionar_config_tienda" on configuracion_tienda
  for all using (obtener_rol() = 'superadmin');

create policy "demo_no_update_config" on configuracion_tienda
  for update to authenticated
  using (not es_usuario_demo())
  with check (not es_usuario_demo());


-- ────────────────────────────────────────────
-- DIRECCIONES DEL NEGOCIO
-- ────────────────────────────────────────────
create policy "publico_ver_direcciones" on direcciones_negocio
  for select using (true);

create policy "admin_gestionar_direcciones" on direcciones_negocio
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_direcciones" on direcciones_negocio
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_direcciones" on direcciones_negocio
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_direcciones" on direcciones_negocio
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- REDES SOCIALES
-- ────────────────────────────────────────────
create policy "publico_ver_redes_activas" on redes_sociales
  for select using (esta_activa = true);

create policy "admin_gestionar_redes" on redes_sociales
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_redes" on redes_sociales
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_redes" on redes_sociales
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_redes" on redes_sociales
  for delete to authenticated using (not es_usuario_demo());


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

create policy "demo_no_write_categorias" on categorias
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_categorias" on categorias
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_categorias" on categorias
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- PRODUCTOS
-- ────────────────────────────────────────────
create policy "publico_ver_productos_activos" on productos
  for select using (esta_activo = true);

create policy "admin_gestionar_productos" on productos
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_productos" on productos
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_productos" on productos
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_productos" on productos
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- IMÁGENES DE PRODUCTOS
-- ────────────────────────────────────────────
create policy "publico_ver_imagenes_productos_activos" on imagenes_producto
  for select using (
    exists (
      select 1 from productos p
      where p.id = imagenes_producto.producto_id and p.esta_activo = true
    )
  );

create policy "admin_gestionar_imagenes" on imagenes_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_imagenes" on imagenes_producto
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_imagenes" on imagenes_producto
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_imagenes" on imagenes_producto
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- VARIANTES DE PRODUCTO
-- ────────────────────────────────────────────
create policy "publico_ver_variantes_activas" on variantes_producto
  for select using (esta_activa = true);

create policy "admin_gestionar_variantes" on variantes_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_variantes" on variantes_producto
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_variantes" on variantes_producto
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_variantes" on variantes_producto
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- TALLAS DE PRODUCTO
-- ────────────────────────────────────────────
create policy "publico_ver_tallas_disponibles" on tallas_producto
  for select using (disponible = true);

create policy "admin_gestionar_tallas" on tallas_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));


-- ────────────────────────────────────────────
-- PRODUCTOS RELACIONADOS
-- ────────────────────────────────────────────
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


-- ────────────────────────────────────────────
-- RESEÑAS
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
create policy "publico_validar_cupon" on cupones
  for select using (esta_activo = true);

create policy "admin_gestionar_cupones" on cupones
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_cupones" on cupones
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_cupones" on cupones
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_cupones" on cupones
  for delete to authenticated using (not es_usuario_demo());


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

create policy "demo_no_write_promociones" on promociones
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_promociones" on promociones
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_promociones" on promociones
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- ZONAS DE ENVÍO
-- ────────────────────────────────────────────
create policy "publico_ver_zonas_activas" on zonas_envio
  for select to anon, authenticated
  using (esta_activa = true);

create policy "admin_ver_todas_zonas" on zonas_envio
  for select to authenticated
  using (true);

create policy "admin_gestionar_zonas" on zonas_envio
  for insert to authenticated
  with check (true);

create policy "admin_actualizar_zonas" on zonas_envio
  for update to authenticated
  using (true) with check (true);

create policy "admin_eliminar_zonas" on zonas_envio
  for delete to authenticated
  using (true);

create policy "demo_no_write_envios" on zonas_envio
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_envios" on zonas_envio
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_envios" on zonas_envio
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- MÉTODOS DE PAGO
-- ────────────────────────────────────────────
create policy "publico_ver_metodos_pago_activos" on metodos_pago
  for select using (esta_activo = true);

create policy "admin_gestionar_metodos_pago" on metodos_pago
  for all using (obtener_rol() in ('admin', 'superadmin'))
  with check (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_metodos_pago" on metodos_pago
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_metodos_pago" on metodos_pago
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_metodos_pago" on metodos_pago
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- PEDIDOS
-- ────────────────────────────────────────────
-- Cualquier visitante puede crear pedidos
create policy "publico_crear_pedidos" on pedidos
  for insert to anon, authenticated
  with check (true);

-- Visitante puede leer su propio pedido por número de orden (página de seguimiento)
create policy "publico_ver_pedido" on pedidos
  for select to anon
  using (true);

-- Admin puede ver y actualizar todos los pedidos
create policy "admin_ver_pedidos" on pedidos
  for select to authenticated
  using (true);

create policy "admin_actualizar_pedidos" on pedidos
  for update to authenticated
  using (true) with check (true);


-- ────────────────────────────────────────────
-- EMPLEADOS DE CITA
-- ────────────────────────────────────────────
create policy "publico_leer_empleados_activos" on empleados_cita
  for select using (activo = true);

create policy "admin_gestionar_empleados_cita" on empleados_cita
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_empleados" on empleados_cita
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_empleados" on empleados_cita
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_empleados" on empleados_cita
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- CITAS
-- ────────────────────────────────────────────
-- Público puede crear citas 'reservada' al completar el checkout
create policy "publico_crear_citas" on citas
  for insert with check (true);

-- Público puede leer horarios ocupados para no ofrecer slots ya reservados
create policy "publico_leer_citas_activas" on citas
  for select using (estado in ('reservada', 'confirmada'));

create policy "admin_gestionar_citas" on citas
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "demo_no_write_citas" on citas
  for insert to authenticated with check (not es_usuario_demo());

create policy "demo_no_update_citas" on citas
  for update to authenticated
  using (not es_usuario_demo()) with check (not es_usuario_demo());

create policy "demo_no_delete_citas" on citas
  for delete to authenticated using (not es_usuario_demo());


-- ────────────────────────────────────────────
-- SOLICITUDES DE EVENTO
-- ────────────────────────────────────────────
create policy "publico_crear_solicitudes" on solicitudes_evento
  for insert to anon, authenticated
  with check (true);

create policy "admin_ver_solicitudes" on solicitudes_evento
  for select to authenticated
  using (true);

create policy "admin_actualizar_solicitudes" on solicitudes_evento
  for update to authenticated
  using (true) with check (true);
