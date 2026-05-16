-- ============================================================
-- GUAMBRASHOP — Schema unificado
-- Actualizado: 2026-05-11
-- Reemplaza las 52 migraciones incrementales de migrations/
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
  -- Ticket térmico (58mm / 80mm)
  ticket_ancho_papel          text default '80',
  ticket_linea_1              text,
  ticket_linea_2              text,
  ticket_linea_3              text,
  ticket_linea_4              text,
  ticket_texto_pie            text,
  ticket_pie_2                text,
  ticket_mostrar_precio_unit  boolean default true,
  -- PayPal
  paypal_activo               boolean not null default false,
  paypal_client_id            text,
  paypal_secret               text,
  paypal_modo                 text not null default 'sandbox',
  -- Payphone
  payphone_activo             boolean not null default false,
  payphone_token              text,
  payphone_store_id           text,
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
-- tipo_producto: 'producto' | 'servicio' | 'evento' | 'alquiler'
-- Incluye búsqueda full-text en español.
-- ============================================================
create table productos (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  slug                text not null unique,
  descripcion         text,
  tipo_producto       text not null default 'producto'
    check (tipo_producto in ('producto', 'servicio', 'evento', 'alquiler')),
  precio              numeric(10,2) not null check (precio >= 0),
  precio_descuento    numeric(10,2) check (precio_descuento >= 0),
  categoria_id        uuid references categorias(id) on delete set null,
  stock               integer,
  esta_activo         boolean not null default true,
  requiere_tallas     boolean not null default false,
  etiquetas           text[] not null default '{}',
  url_video           text,
  -- Paquetes para productos tipo 'evento'
  -- Estructura: [{ id, icono, nombre, descripcion, precio_min, precio_max }]
  paquetes_evento     jsonb default '[]'::jsonb,
  -- Campos de alquiler (aplica cuando tipo_producto = 'alquiler')
  precio_deposito     numeric(10,2) default null,   -- depósito de garantía opcional
  max_dias_alquiler   integer default null,           -- límite de días (null = sin límite)
  garantia_descripcion text default null,             -- texto libre sobre la garantía
  -- IVA por producto: 15 | 5 | 0 | null (null = usar tarifa global de configuracion_facturacion)
  tarifa_iva          integer default null check (tarifa_iva in (0, 5, 15)),
  vector_busqueda     tsvector,
  creado_en           timestamptz default now(),
  actualizado_en      timestamptz default now(),
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
  stock_variante  integer,
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
  estado             text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago', 'pendiente_validacion', 'procesando', 'en_espera', 'completado', 'cancelado', 'reembolsado', 'fallido')),
  -- Datos SRI que el cliente provee en checkout (opcional)
  datos_facturacion  jsonb,
  -- Comprobante de pago (transferencia bancaria)
  comprobante_url         text,
  comprobante_eliminar_en timestamptz,
  -- PayPal
  paypal_order_id      text,
  -- Payphone
  payphone_payment_id  text,
  -- Timestamps
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);

create index idx_pedidos_tipo      on pedidos(tipo);
create index idx_pedidos_estado    on pedidos(estado);
create index idx_pedidos_creado_en on pedidos(creado_en desc);
create index if not exists idx_pedidos_paypal_order_id on pedidos(paypal_order_id) where paypal_order_id is not null;

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
-- TABLA: alquileres
-- Registra cada período reservado para productos tipo 'alquiler'.
-- stock en productos = unidades disponibles simultáneamente.
-- precio en productos = precio por día.
-- ============================================================
create table alquileres (
  id             uuid        primary key default gen_random_uuid(),
  pedido_id      uuid        references pedidos(id) on delete set null,
  producto_id    uuid        not null references productos(id) on delete cascade,
  fecha_inicio   date        not null,
  fecha_fin      date        not null,
  dias           integer     not null check (dias >= 1),
  cantidad       integer     not null default 1 check (cantidad >= 1),
  hora_recogida  time        default null,
  estado         text        not null default 'reservado'
    check (estado in ('reservado', 'activo', 'vencido', 'devuelto', 'cancelado')),
  creado_en      timestamptz default now(),
  actualizado_en timestamptz default now(),
  constraint fecha_fin_posterior check (fecha_fin >= fecha_inicio)
);

create index idx_alquileres_producto_fechas on alquileres(producto_id, fecha_inicio, fecha_fin);
create index idx_alquileres_pedido          on alquileres(pedido_id);

create trigger tr_alquileres_updated_at
  before update on alquileres
  for each row execute function actualizar_updated_at();


-- ============================================================
-- FUNCIÓN RPC: verificar_disponibilidad_alquiler
-- Calcula unidades disponibles para un producto en un rango de fechas.
-- Solo bloquea: activo/vencido (traje afuera) y reservado con pedido confirmado.
-- ============================================================
create or replace function verificar_disponibilidad_alquiler(
  p_producto_id  uuid,
  p_fecha_inicio date,
  p_fecha_fin    date
)
returns table (
  stock_total      integer,
  cantidad_ocupada integer,
  disponible       integer
)
language plpgsql security definer as $$
begin
  return query
  with ocupados as (
    select coalesce(sum(a.cantidad), 0)::integer as total
    from alquileres a
    left join pedidos p on a.pedido_id = p.id
    where a.producto_id = p_producto_id
      and a.fecha_inicio <= p_fecha_fin
      and a.fecha_fin    >  p_fecha_inicio
      and (
        a.estado in ('activo', 'vencido')
        or (
          a.estado = 'reservado'
          and a.fecha_fin >= current_date
          and (
            p.id is null
            or p.estado not in ('pendiente', 'cancelado')
          )
        )
      )
  ),
  stock as (
    select coalesce(pr.stock, 0)::integer as total
    from productos pr where pr.id = p_producto_id
  )
  select
    stock.total                               as stock_total,
    ocupados.total                            as cantidad_ocupada,
    greatest(0, stock.total - ocupados.total) as disponible
  from stock, ocupados;
end;
$$;

grant execute on function verificar_disponibilidad_alquiler(uuid, date, date) to anon, authenticated;


-- ============================================================
-- FUNCIÓN RPC: disponibilidad_alquileres_hoy
-- Versión batch: disponibilidad para múltiples productos en una sola query.
-- Usada en listados de tienda para mostrar "X disponibles hoy".
-- ============================================================
create or replace function disponibilidad_alquileres_hoy(p_ids uuid[])
returns table (producto_id uuid, disponible integer)
language sql security definer as $$
  with ocupados as (
    select
      a.producto_id,
      coalesce(sum(a.cantidad), 0)::integer as total
    from alquileres a
    left join pedidos p on a.pedido_id = p.id
    where a.producto_id = any(p_ids)
      and a.fecha_inicio <= current_date
      and a.fecha_fin    >  current_date
      and (
        a.estado in ('activo', 'vencido')
        or (
          a.estado = 'reservado'
          and (
            p.id is null
            or p.estado not in ('pendiente', 'cancelado')
          )
        )
      )
    group by a.producto_id
  )
  select
    pr.id                                                  as producto_id,
    greatest(0, pr.stock - coalesce(o.total, 0))::integer  as disponible
  from productos pr
  left join ocupados o on o.producto_id = pr.id
  where pr.id = any(p_ids);
$$;

grant execute on function disponibilidad_alquileres_hoy(uuid[]) to anon, authenticated;


-- ============================================================
-- FUNCIÓN RPC: marcar_alquileres_vencidos
-- Pasa a 'vencido' los alquileres activos/reservados con fecha_fin < HOY.
-- Llamada por cron diario (Vercel) via /api/alquileres/marcar-vencidos.
-- ============================================================
create or replace function marcar_alquileres_vencidos()
returns integer language plpgsql security definer as $$
declare
  v_count integer;
begin
  with actualizados as (
    update alquileres a
    set estado = 'vencido', actualizado_en = now()
    from pedidos p
    where a.pedido_id = p.id
      and a.fecha_fin < current_date
      and a.estado in ('activo', 'reservado')
      and p.estado not in ('pendiente', 'cancelado')
    returning a.id
  )
  select count(*) into v_count from actualizados;

  with actualizados_sin_pedido as (
    update alquileres
    set estado = 'vencido', actualizado_en = now()
    where pedido_id is null
      and fecha_fin < current_date
      and estado in ('activo', 'reservado')
    returning id
  )
  select v_count + count(*) into v_count from actualizados_sin_pedido;

  return v_count;
end;
$$;

grant execute on function marcar_alquileres_vencidos() to service_role;


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

  -- Solo proceder si el pedido no fue ya procesado/completado/reembolsado
  if v_estado_actual in ('procesando', 'completado', 'reembolsado', 'cancelado') then
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
        set stock_variante = greatest(0, coalesce(stock_variante, 0) - v_cantidad)
        where id = v_variante_id and stock_variante is not null;
    elsif v_talla_texto is not null then
      update tallas_producto
        set stock = greatest(0, coalesce(stock, 0) - v_cantidad)
        where producto_id = v_producto_id and talla = v_talla_texto and stock is not null;
    else
      update productos
        set stock = greatest(0, coalesce(stock, 0) - v_cantidad)
        where id = v_producto_id and stock is not null;
    end if;
  end loop;

  -- Actualizar estado del pedido a 'procesando'
  update pedidos
    set estado = 'procesando', actualizado_en = now()
    where id = p_pedido_id;

  -- Confirmar citas vinculadas al pedido
  update citas
    set estado = 'confirmada'
    where pedido_id = p_pedido_id and estado in ('pendiente', 'reservada');

  return true;
end;
$$;


-- ============================================================
-- TABLA: pedidos_temporales
-- Almacena datos del pedido 15 minutos mientras el cliente
-- sube el comprobante de pago. Se elimina al convertirse en
-- pedido real o al expirar (cron cada 5 min).
-- ============================================================
create sequence if not exists pedidos_temporales_seq start 1;

create table if not exists pedidos_temporales (
  id               uuid        primary key default gen_random_uuid(),
  numero_temporal  text        unique not null,
  nombres          text        not null,
  email            text        not null,
  whatsapp         text        not null,
  tipo             text        not null check (tipo in ('delivery', 'local')),
  provincia        text,
  ciudad           text,
  direccion        text,
  detalles_direccion text,
  items            jsonb       not null default '[]',
  simbolo_moneda   text        not null default '$',
  subtotal         numeric(10,2) not null default 0,
  descuento_cupon  numeric(10,2) not null default 0,
  cupon_codigo     text,
  costo_envio      numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  datos_facturacion jsonb,
  citas_ids        uuid[]      not null default '{}',
  alquileres_ids   uuid[]      not null default '{}',
  expira_en        timestamptz not null default (now() + interval '15 minutes'),
  creado_en        timestamptz not null default now()
);

create index if not exists idx_pedidos_temporales_expira  on pedidos_temporales (expira_en);
create index if not exists idx_pedidos_temporales_numero  on pedidos_temporales (numero_temporal);

create or replace function generar_numero_temporal()
returns trigger language plpgsql as $$
begin
  if new.numero_temporal is null or new.numero_temporal = '' then
    new.numero_temporal := 'GS-' || extract(year from now())::text
                           || '-' || lpad(nextval('pedidos_temporales_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger tr_generar_numero_temporal
  before insert on pedidos_temporales
  for each row execute function generar_numero_temporal();

alter table pedidos_temporales enable row level security;

create policy "publico_crear_pedido_temporal" on pedidos_temporales
  for insert to anon, authenticated with check (true);
create policy "publico_leer_pedido_temporal" on pedidos_temporales
  for select to anon, authenticated using (true);
create policy "publico_eliminar_pedido_temporal" on pedidos_temporales
  for delete to anon, authenticated using (true);
create policy "admin_gestionar_pedidos_temporales" on pedidos_temporales
  for all to authenticated
  using (obtener_rol() in ('admin', 'superadmin'));

create index if not exists idx_pedidos_comprobante_eliminar
  on pedidos (comprobante_eliminar_en)
  where comprobante_eliminar_en is not null;

create index if not exists idx_pedidos_pendiente_validacion
  on pedidos (estado, creado_en desc)
  where estado = 'pendiente_validacion';


-- ============================================================
-- RPC: limpiar_pedidos_expirados
-- Elimina temporales vencidos + cancela citas/alquileres.
-- Llamada por cron cada 5 minutos.
-- ============================================================
create or replace function limpiar_pedidos_expirados()
returns integer language plpgsql security definer as $$
declare
  v_count  integer := 0;
  v_row    pedidos_temporales%rowtype;
begin
  for v_row in
    select * from pedidos_temporales where expira_en < now()
  loop
    if array_length(v_row.citas_ids, 1) > 0 then
      update citas set estado = 'cancelada'
        where id = any(v_row.citas_ids) and estado = 'reservada';
    end if;
    if array_length(v_row.alquileres_ids, 1) > 0 then
      update alquileres set estado = 'cancelado'
        where id = any(v_row.alquileres_ids) and estado = 'reservado';
    end if;
    delete from pedidos_temporales where id = v_row.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function limpiar_pedidos_expirados() to service_role, authenticated;


-- ============================================================
-- RPC: marcar_comprobante_para_eliminar(pedido_id)
-- Marca el comprobante para eliminarse en 48 horas tras
-- que el admin confirme el pedido.
-- ============================================================
create or replace function marcar_comprobante_para_eliminar(p_pedido_id uuid)
returns void language plpgsql security definer as $$
begin
  update pedidos
    set comprobante_eliminar_en = now() + interval '48 hours'
    where id = p_pedido_id
      and comprobante_url is not null
      and comprobante_eliminar_en is null;
end;
$$;

grant execute on function marcar_comprobante_para_eliminar(uuid) to authenticated;


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

-- Bucket privado para comprobantes de pago (transferencias bancarias)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes',
  'comprobantes',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) on conflict (id) do nothing;

create policy "publico_subir_comprobante" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'comprobantes');

create policy "admin_leer_comprobante" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes');

create policy "admin_eliminar_comprobante" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes');


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
alter table alquileres              enable row level security;


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


-- ────────────────────────────────────────────
-- ALQUILERES
-- ────────────────────────────────────────────
create policy "admin_gestionar_alquileres" on alquileres
  for all using (obtener_rol() in ('admin', 'superadmin'));

create policy "publico_crear_alquileres" on alquileres
  for insert with check (true);

-- Público lee reservados/activos/vencidos para verificar disponibilidad
create policy "publico_leer_alquileres_relevantes" on alquileres
  for select using (estado in ('reservado', 'activo', 'vencido'));


-- ============================================================
-- FACTURACIÓN ELECTRÓNICA SRI ECUADOR
-- ============================================================

create table if not exists configuracion_facturacion (
  id                      uuid primary key default gen_random_uuid(),
  ruc                     varchar(13) not null,
  razon_social            text not null,
  nombre_comercial        text,
  direccion_matriz        text not null,
  codigo_establecimiento  varchar(3) not null default '001',
  punto_emision           varchar(3) not null default '001',
  ambiente                text not null default 'pruebas' check (ambiente in ('pruebas', 'produccion')),
  obligado_contabilidad   boolean not null default false,
  tarifa_iva              numeric(5,2) not null default 15,
  contribuyente_especial  varchar(20),
  regimen                 text,
  cert_p12_url            text,
  cert_pin                text,
  secuencial_actual       integer not null default 1,
  secuencial_nc_actual    integer not null default 1,
  activo                  boolean not null default true,
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now()
);

create unique index if not exists configuracion_facturacion_unica on configuracion_facturacion ((true));

-- tipo_contribuyente: ruc | rimpe_emprendedor | artesano (artesano fuerza IVA 0% por defecto)
alter table configuracion_facturacion add column if not exists tipo_contribuyente text not null default 'ruc'
  check (tipo_contribuyente in ('ruc', 'rimpe_emprendedor', 'artesano'));

create trigger tr_configuracion_facturacion_updated_at
  before update on configuracion_facturacion
  for each row execute function actualizar_updated_at();

create table if not exists facturas (
  id                    uuid primary key default gen_random_uuid(),
  pedido_id             uuid references pedidos(id) on delete set null,
  numero_secuencial     varchar(9) not null,
  numero_factura        varchar(17),
  clave_acceso          varchar(49),
  numero_autorizacion   varchar(49),
  fecha_emision         date not null default current_date,
  fecha_autorizacion    timestamptz,
  estado                text not null default 'borrador'
                          check (estado in ('borrador','enviada','autorizada','rechazada','anulada')),
  datos_comprador       jsonb not null default '{}',
  items                 jsonb not null default '[]',
  totales               jsonb not null default '{}',
  xml_firmado           text,
  ride_url              text,
  error_sri             text,
  tipo                  text not null default 'factura' check (tipo in ('factura', 'nota_credito')),
  factura_origen_id     uuid references facturas(id) on delete set null,
  motivo_anulacion      text,
  email_enviado_en      timestamptz,
  email_enviado_a       text,
  notas                 text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index if not exists idx_facturas_pedido_id on facturas(pedido_id);
create index if not exists idx_facturas_estado    on facturas(estado);
create index if not exists idx_facturas_fecha     on facturas(fecha_emision desc);
create index if not exists idx_facturas_clave     on facturas(clave_acceso) where clave_acceso is not null;
create index if not exists idx_facturas_tipo      on facturas(tipo);
create index if not exists idx_facturas_origen    on facturas(factura_origen_id) where factura_origen_id is not null;

create trigger tr_facturas_updated_at
  before update on facturas
  for each row execute function actualizar_updated_at();

alter table configuracion_facturacion enable row level security;
alter table facturas enable row level security;

-- ────────────────────────────────────────────
-- FACTURACIÓN — RLS
-- ────────────────────────────────────────────
create policy "superadmin_gestionar_config_facturacion" on configuracion_facturacion
  for all using (obtener_rol() = 'superadmin');

create policy "admin_leer_config_facturacion" on configuracion_facturacion
  for select using (obtener_rol() in ('admin', 'superadmin'));

create policy "admin_gestionar_facturas" on facturas
  for all using (obtener_rol() in ('admin', 'superadmin'));

-- Índice parcial para encontrar pedidos con datos de facturación
create index if not exists idx_pedidos_datos_facturacion
  on pedidos ((datos_facturacion is not null))
  where datos_facturacion is not null;

-- ============================================================
-- TABLA: configuracion_email
-- Credenciales y preferencias de envío de emails (RIDE, notificaciones).
-- Solo superadmin puede leer/escribir.
-- ============================================================
create table if not exists configuracion_email (
  id               uuid primary key default gen_random_uuid(),
  proveedor        text not null default 'gmail'
    check (proveedor in ('gmail', 'smtp', 'resend')),
  smtp_host        text,
  smtp_port        integer not null default 587,
  smtp_usuario     text,
  smtp_password    text,
  resend_api_key   text,
  from_email       text not null default '',
  from_nombre      text not null default 'Facturación',
  envio_automatico boolean not null default false,
  activo           boolean not null default false,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create trigger tr_configuracion_email_updated_at
  before update on configuracion_email
  for each row execute function actualizar_updated_at();

alter table configuracion_email enable row level security;

create policy "superadmin_gestionar_email" on configuracion_email
  for all using (obtener_rol() = 'superadmin');

-- Admin puede leer proveedor/activo para mostrar el contador de uso en dashboard y facturación
create policy "admin_leer_email" on configuracion_email
  for select using (obtener_rol() in ('admin', 'superadmin'));

-- ============================================================
-- STORAGE: bucket privado para certificados .p12 de SRI
-- ============================================================
insert into storage.buckets (id, name, public)
values ('facturacion', 'facturacion', false)
on conflict (id) do nothing;

create policy "superadmin_storage_facturacion" on storage.objects
  for all to authenticated
  using   (bucket_id = 'facturacion' and obtener_rol() = 'superadmin')
  with check (bucket_id = 'facturacion' and obtener_rol() = 'superadmin');

-- ============================================================
-- MÓDULO CLIENTES (migración _042)
-- Tabla de clientes con campos para facturación SRI Ecuador
-- ============================================================
create table clientes (
  id                   uuid primary key default gen_random_uuid(),
  tipo_identificacion  text not null default 'cedula'
    check (tipo_identificacion in ('ruc', 'cedula', 'pasaporte', 'consumidor_final')),
  identificacion       text not null default '9999999999999',
  razon_social         text not null,
  email                text,
  telefono             text,
  direccion            text,
  provincia            text,
  ciudad               text,
  notas                text,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

-- FK opcional en pedidos (pedidos online sin cliente vinculado siguen funcionando)
alter table pedidos
  add column if not exists cliente_id uuid references clientes(id) on delete set null;

create index if not exists idx_clientes_identificacion on clientes(identificacion);
create index if not exists idx_clientes_email          on clientes(email) where email is not null;
create index if not exists idx_pedidos_cliente_id      on pedidos(cliente_id) where cliente_id is not null;

alter table clientes enable row level security;

create policy "admin_gestiona_clientes" on clientes
  for all to authenticated
  using      (obtener_rol() in ('admin', 'superadmin'))
  with check (obtener_rol() in ('admin', 'superadmin'));

create or replace function actualizar_timestamp_clientes()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger tr_clientes_actualizar_ts
  before update on clientes
  for each row execute function actualizar_timestamp_clientes();

-- ============================================================
-- POS — ventas manuales (migración _043)
-- ============================================================
alter table pedidos
  add column if not exists forma_pago      text
    check (forma_pago in ('efectivo', 'transferencia', 'tarjeta', 'otro', 'paypal')),
  add column if not exists es_venta_manual boolean not null default false;

create index if not exists idx_pedidos_manual on pedidos(es_venta_manual) where es_venta_manual = true;

-- ============================================================
-- FUNCIÓN: decrementar_stock (migración _044)
-- Atómica, nunca va a negativo, SECURITY DEFINER evita RLS en UPDATE de stock
-- ============================================================
create or replace function decrementar_stock(
  p_producto_id uuid,
  p_cantidad    int,
  p_variante_id uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  if p_variante_id is not null then
    update variantes_producto
    set    stock_variante = greatest(0, coalesce(stock_variante, 0) - p_cantidad)
    where  id = p_variante_id;
  else
    update productos
    set    stock = greatest(0, coalesce(stock, 0) - p_cantidad)
    where  id = p_producto_id
      and  stock is not null;
  end if;
end;
$$;


-- ============================================================
-- MÓDULO FINANZAS — Egresos y Cierre de Caja (migración _046)
-- ============================================================

create table egresos (
  id          uuid primary key default gen_random_uuid(),
  descripcion text not null,
  monto       decimal(12,2) not null,
  categoria   text not null
    check (categoria in ('proveedores', 'servicios', 'nomina', 'alquiler', 'otros')),
  metodo_pago text not null default 'efectivo'
    check (metodo_pago in ('efectivo', 'transferencia', 'tarjeta')),
  fecha       date default current_date,
  creado_por  uuid references auth.users(id),
  creado_en   timestamptz default now()
);

create table cierres_caja (
  id                  uuid primary key default gen_random_uuid(),
  fecha               date unique not null,
  total_efectivo      decimal(12,2) default 0,
  total_transferencia decimal(12,2) default 0,
  total_tarjeta       decimal(12,2) default 0,
  total_otros         decimal(12,2) default 0,
  total_sistema       decimal(12,2) not null,
  total_real          decimal(12,2) not null,
  diferencia          decimal(12,2) default 0,
  estado              text default 'cerrado',
  notas               text,
  creado_por          uuid references auth.users(id),
  creado_en           timestamptz default now()
);

alter table egresos     enable row level security;
alter table cierres_caja enable row level security;

create policy "Permitir todo a autenticados en egresos" on egresos
  for all to authenticated using (true);

create policy "Permitir todo a autenticados en cierres" on cierres_caja
  for all to authenticated using (true);


-- ============================================================
-- MÓDULO FINANZAS — Proveedores y Pagos (migración _047)
-- ============================================================

create table proveedores (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  razon_social     text,
  ruc              text,
  contacto         text,
  telefono         text,
  email            text,
  pais             text default 'Ecuador',
  ciudad           text,
  direccion        text,
  notas            text,
  saldo_pendiente  decimal(12,2) default 0,
  creado_en        timestamptz default now(),
  actualizado_en   timestamptz default now()
);

create table pagos_proveedores (
  id           uuid primary key default gen_random_uuid(),
  proveedor_id uuid references proveedores(id) on delete cascade,
  egreso_id    uuid references egresos(id) on delete set null,
  monto        decimal(12,2) not null,
  metodo_pago  text not null default 'efectivo'
    check (metodo_pago in ('efectivo', 'transferencia', 'tarjeta')),
  fecha        date default current_date,
  notas        text,
  creado_por   uuid references auth.users(id),
  creado_en    timestamptz default now()
);

alter table proveedores       enable row level security;
alter table pagos_proveedores enable row level security;

create policy "Permitir todo a autenticados en proveedores" on proveedores
  for all to authenticated using (true);

create policy "Permitir todo a autenticados en pagos_proveedores" on pagos_proveedores
  for all to authenticated using (true);

-- Trigger: al insertar/eliminar un pago, actualiza saldo_pendiente del proveedor
create or replace function funcion_actualizar_saldo_proveedor()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update proveedores set saldo_pendiente = saldo_pendiente - new.monto where id = new.proveedor_id;
  elsif (tg_op = 'DELETE') then
    update proveedores set saldo_pendiente = saldo_pendiente + old.monto where id = old.proveedor_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trigger_actualizar_saldo_proveedor
  after insert or delete on pagos_proveedores
  for each row execute function funcion_actualizar_saldo_proveedor();

-- RPC para registrar deuda (incrementar saldo)
create or replace function incrementar_saldo_proveedor(id_prov uuid, monto decimal)
returns void as $$
begin
  update proveedores set saldo_pendiente = saldo_pendiente + monto where id = id_prov;
end;
$$ language plpgsql;


-- MIGRACIÓN _048: stock ya renombrado a stock_variante en la definición inicial de variantes_producto


-- ============================================================
-- MIGRACIÓN _049: Campos de ticket térmico en configuracion_tienda
-- ============================================================
alter table configuracion_tienda
  add column if not exists ticket_ancho_papel        text    default '80',
  add column if not exists ticket_linea_1            text,
  add column if not exists ticket_linea_2            text,
  add column if not exists ticket_linea_3            text,
  add column if not exists ticket_linea_4            text,
  add column if not exists ticket_texto_pie          text,
  add column if not exists ticket_pie_2              text,
  add column if not exists ticket_mostrar_precio_unit boolean default true;


-- ============================================================
-- MIGRACIÓN _050: Actualizar confirmar_pedido() para usar stock_variante
-- ============================================================
create or replace function confirmar_pedido(p_pedido_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_item        record;
  v_producto_id uuid;
  v_variante_id uuid;
  v_talla_texto text;
  v_cantidad    int;
  v_estado_actual text;
begin
  select estado into v_estado_actual from pedidos where id = p_pedido_id;

  if v_estado_actual in ('procesando', 'completado', 'reembolsado') then
    return false;
  end if;

  for v_item in
    select * from jsonb_array_elements(
      (select items::jsonb from pedidos where id = p_pedido_id)
    )
  loop
    v_producto_id := (v_item.value->>'producto_id')::uuid;
    v_cantidad    := (v_item.value->>'cantidad')::int;
    v_talla_texto :=  v_item.value->>'talla';
    v_variante_id := (v_item.value->>'variante_id')::uuid;

    if v_variante_id is not null then
      update variantes_producto
        set stock_variante = greatest(0, coalesce(stock_variante, 0) - v_cantidad)
        where id = v_variante_id and stock_variante is not null;
    elsif v_talla_texto is not null then
      update tallas_producto
        set stock = greatest(0, coalesce(stock, 0) - v_cantidad)
        where producto_id = v_producto_id and talla = v_talla_texto and stock is not null;
    else
      update productos
        set stock = greatest(0, coalesce(stock, 0) - v_cantidad)
        where id = v_producto_id and stock is not null;
    end if;
  end loop;

  update pedidos set estado = 'procesando', actualizado_en = now() where id = p_pedido_id;
  update citas set estado = 'confirmada' where pedido_id = p_pedido_id and estado in ('pendiente', 'reservada');

  return true;
end;
$$;


-- ============================================================
-- MIGRACIÓN _051: Sistema de comprobantes de pago + pedidos temporales
-- ============================================================

-- Nuevo estado pendiente_validacion
alter table pedidos drop constraint if exists pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check
  check (estado in (
    'pendiente_pago', 'pendiente_validacion', 'procesando',
    'en_espera', 'completado', 'cancelado', 'reembolsado', 'fallido'
  ));

alter table pedidos
  add column if not exists comprobante_url           text,
  add column if not exists comprobante_eliminar_en   timestamptz;

create index if not exists idx_pedidos_comprobante_eliminar
  on pedidos (comprobante_eliminar_en) where comprobante_eliminar_en is not null;

create index if not exists idx_pedidos_pendiente_validacion
  on pedidos (estado, creado_en desc) where estado = 'pendiente_validacion';

-- Tabla pedidos_temporales
create sequence if not exists pedidos_temporales_seq start 1;

create table if not exists pedidos_temporales (
  id                 uuid        primary key default gen_random_uuid(),
  numero_temporal    text        unique not null,
  nombres            text        not null,
  email              text        not null,
  whatsapp           text        not null,
  tipo               text        not null check (tipo in ('delivery', 'local')),
  provincia          text,
  ciudad             text,
  direccion          text,
  detalles_direccion text,
  items              jsonb       not null default '[]',
  simbolo_moneda     text        not null default '$',
  subtotal           numeric(10,2) not null default 0,
  descuento_cupon    numeric(10,2) not null default 0,
  cupon_codigo       text,
  costo_envio        numeric(10,2) not null default 0,
  total              numeric(10,2) not null default 0,
  datos_facturacion  jsonb,
  citas_ids          uuid[]      not null default '{}',
  alquileres_ids     uuid[]      not null default '{}',
  expira_en          timestamptz not null default (now() + interval '15 minutes'),
  creado_en          timestamptz not null default now()
);

create index if not exists idx_pedidos_temporales_expira  on pedidos_temporales (expira_en);
create index if not exists idx_pedidos_temporales_numero  on pedidos_temporales (numero_temporal);

create or replace function generar_numero_temporal()
returns trigger language plpgsql as $$
begin
  if new.numero_temporal is null or new.numero_temporal = '' then
    new.numero_temporal := 'GS-' || extract(year from now())::text
                           || '-' || lpad(nextval('pedidos_temporales_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_generar_numero_temporal on pedidos_temporales;
create trigger tr_generar_numero_temporal
  before insert on pedidos_temporales
  for each row execute function generar_numero_temporal();

alter table pedidos_temporales enable row level security;

drop policy if exists "publico_crear_pedido_temporal"    on pedidos_temporales;
drop policy if exists "publico_leer_pedido_temporal"     on pedidos_temporales;
drop policy if exists "publico_eliminar_pedido_temporal" on pedidos_temporales;
drop policy if exists "admin_gestionar_pedidos_temporales" on pedidos_temporales;
create policy "publico_crear_pedido_temporal"    on pedidos_temporales for insert to anon, authenticated with check (true);
create policy "publico_leer_pedido_temporal"     on pedidos_temporales for select to anon, authenticated using (true);
create policy "publico_eliminar_pedido_temporal" on pedidos_temporales for delete to anon, authenticated using (true);
create policy "admin_gestionar_pedidos_temporales" on pedidos_temporales
  for all to authenticated using (obtener_rol() in ('admin', 'superadmin'));

-- Bucket comprobantes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "publico_subir_comprobante"  on storage.objects;
drop policy if exists "admin_leer_comprobante"     on storage.objects;
drop policy if exists "admin_eliminar_comprobante" on storage.objects;
create policy "publico_subir_comprobante"  on storage.objects for insert to anon, authenticated with check (bucket_id = 'comprobantes');
create policy "admin_leer_comprobante"     on storage.objects for select to authenticated using (bucket_id = 'comprobantes');
create policy "admin_eliminar_comprobante" on storage.objects for delete to authenticated using (bucket_id = 'comprobantes');

-- RPCs
create or replace function limpiar_pedidos_expirados()
returns integer language plpgsql security definer as $$
declare
  v_count integer := 0;
  v_row   pedidos_temporales%rowtype;
begin
  for v_row in select * from pedidos_temporales where expira_en < now() loop
    if array_length(v_row.citas_ids, 1) > 0 then
      update citas set estado = 'cancelada' where id = any(v_row.citas_ids) and estado = 'reservada';
    end if;
    if array_length(v_row.alquileres_ids, 1) > 0 then
      update alquileres set estado = 'cancelado' where id = any(v_row.alquileres_ids) and estado = 'reservado';
    end if;
    delete from pedidos_temporales where id = v_row.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function limpiar_pedidos_expirados() to service_role, authenticated;

create or replace function marcar_comprobante_para_eliminar(p_pedido_id uuid)
returns void language plpgsql security definer as $$
begin
  update pedidos
    set comprobante_eliminar_en = now() + interval '48 hours'
    where id = p_pedido_id and comprobante_url is not null and comprobante_eliminar_en is null;
end;
$$;

grant execute on function marcar_comprobante_para_eliminar(uuid) to authenticated;


-- ============================================================
-- MIGRACIÓN _052: Configuración PayPal en configuracion_tienda
-- ============================================================
alter table configuracion_tienda
  add column if not exists paypal_activo    boolean not null default false,
  add column if not exists paypal_client_id text,
  add column if not exists paypal_secret    text,
  add column if not exists paypal_modo      text    not null default 'sandbox';

alter table pedidos
  add column if not exists paypal_order_id text;

create index if not exists idx_pedidos_paypal_order_id
  on pedidos (paypal_order_id) where paypal_order_id is not null;


-- ============================================================
-- MIGRACIÓN _053: Función obtener_uso_storage (monitor de almacenamiento)
-- ============================================================
create or replace function public.obtener_uso_storage()
returns table (
  bucket_id      text,
  total_bytes    bigint,
  total_archivos bigint
)
language plpgsql
security definer
set search_path = storage, public
as $$
begin
  return query
  select
    o.bucket_id,
    coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as total_bytes,
    count(*)::bigint                                         as total_archivos
  from storage.objects o
  group by o.bucket_id;
end;
$$;

revoke all   on function public.obtener_uso_storage() from public, anon, authenticated;
grant execute on function public.obtener_uso_storage() to service_role;

-- ============================================================
-- MIGRACIÓN _054: Bucket 'imagenes' en Storage
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagenes', 'imagenes', true, 52428800,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = 52428800,
  allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/svg+xml'];

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='imagenes_lectura_publica') then
    create policy "imagenes_lectura_publica" on storage.objects for select to public using (bucket_id = 'imagenes');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='imagenes_escritura_autenticados') then
    create policy "imagenes_escritura_autenticados" on storage.objects for insert to authenticated with check (bucket_id = 'imagenes');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='imagenes_eliminacion_autenticados') then
    create policy "imagenes_eliminacion_autenticados" on storage.objects for delete to authenticated using (bucket_id = 'imagenes');
  end if;
end $$;

-- ============================================================
-- MIGRACIÓN _055: Cupones — inicia_en + función atómica
-- ============================================================
alter table cupones add column if not exists inicia_en timestamptz;

create index if not exists idx_cupones_codigo         on cupones(codigo);
create index if not exists idx_cupones_activo_vigente on cupones(esta_activo, inicia_en, vence_en);

create or replace function incrementar_uso_cupon(p_codigo text)
returns void language sql security definer as $$
  update cupones set usos_actuales = usos_actuales + 1 where codigo = p_codigo;
$$;

grant execute on function incrementar_uso_cupon(text) to service_role;

-- ============================================================
-- MIGRACIÓN _056: Módulo de Proformas
-- ============================================================
create sequence if not exists proformas_numero_seq start 1;

create table if not exists proformas (
  id               uuid primary key default gen_random_uuid(),
  numero           text not null unique,
  cliente_id       uuid references clientes(id) on delete set null,
  cliente_nombre   text not null,
  cliente_email    text not null,
  cliente_telefono text,
  items            jsonb not null default '[]',
  subtotal         numeric(10,2) not null default 0,
  descuento_tipo   text check (descuento_tipo in ('porcentaje', 'fijo')),
  descuento_valor  numeric(10,2) not null default 0,
  descuento_monto  numeric(10,2) not null default 0,
  base_imponible   numeric(10,2) not null default 0,
  iva_porcentaje   numeric(5,2)  not null default 15,
  iva_monto        numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  vigencia_horas   integer,
  vence_en         timestamptz,
  email_enviado    boolean not null default false,
  email_enviado_en timestamptz,
  nota             text,
  creado_por       uuid references auth.users(id) on delete set null,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create or replace function actualizar_proforma_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists tr_proformas_updated_at on proformas;
create trigger tr_proformas_updated_at
  before update on proformas
  for each row execute function actualizar_proforma_timestamp();

create or replace function generar_numero_proforma()
returns text language plpgsql as $$
declare v_num integer;
begin
  v_num := nextval('proformas_numero_seq');
  return 'PRO-' || lpad(v_num::text, 3, '0');
end;
$$;

create index if not exists idx_proformas_cliente_id    on proformas(cliente_id);
create index if not exists idx_proformas_cliente_email on proformas(cliente_email);
create index if not exists idx_proformas_creado_en     on proformas(creado_en desc);
create index if not exists idx_proformas_vence_en      on proformas(vence_en);

alter table proformas enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='proformas' and policyname='admins_gestionar_proformas') then
    create policy "admins_gestionar_proformas" on proformas for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ============================================================
-- MIGRACIÓN _057: Trigger — crear/vincular cliente al insertar pedido
-- ============================================================
create or replace function fn_vincular_cliente_desde_pedido()
returns trigger language plpgsql security definer as $$
declare
  v_cliente_id     uuid;
  v_fac            jsonb;
  v_tipo_id        text;
  v_identificacion text;
  v_es_cf          boolean;
  v_cliente_es_cf  boolean;
begin
  if new.email like '%@venta.local' or new.email like '%@manual.local' then
    return new;
  end if;

  if new.cliente_id is not null then
    return new;
  end if;

  v_fac := new.datos_facturacion;

  v_tipo_id := case v_fac->>'tipo_identificacion'
    when '04' then 'ruc'
    when '05' then 'cedula'
    when '06' then 'pasaporte'
    else 'consumidor_final'
  end;

  v_identificacion := coalesce(v_fac->>'identificacion', '9999999999999');

  v_es_cf := (
    v_fac is null
    or v_fac->>'tipo_identificacion' = '07'
    or v_identificacion = '9999999999999'
    or v_identificacion = ''
  );

  select id,
    (tipo_identificacion = 'consumidor_final' or identificacion = '9999999999999')
  into v_cliente_id, v_cliente_es_cf
  from clientes where email = new.email limit 1;

  if v_cliente_id is not null then
    if v_cliente_es_cf and not v_es_cf then
      update clientes set
        tipo_identificacion = v_tipo_id,
        identificacion      = v_identificacion,
        razon_social        = new.nombres,
        telefono            = coalesce(new.whatsapp, telefono),
        provincia           = coalesce(new.provincia, provincia),
        ciudad              = coalesce(new.ciudad, ciudad),
        actualizado_en      = now()
      where id = v_cliente_id;
    end if;
  else
    insert into clientes (tipo_identificacion, identificacion, razon_social, email, telefono, provincia, ciudad)
    values (v_tipo_id, v_identificacion, new.nombres, new.email, new.whatsapp, new.provincia, new.ciudad)
    returning id into v_cliente_id;
  end if;

  if v_cliente_id is not null then
    new.cliente_id := v_cliente_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_vincular_cliente_al_crear_pedido on pedidos;
create trigger tr_vincular_cliente_al_crear_pedido
  before insert on pedidos
  for each row execute function fn_vincular_cliente_desde_pedido();

-- ============================================================
-- MIGRACIÓN _058: Backfill — vincular pedidos históricos a clientes
-- (Ejecutar una sola vez en proyectos existentes)
-- ============================================================
do $$
declare
  r                record;
  v_cliente_id     uuid;
  v_fac            jsonb;
  v_tipo_id        text;
  v_identificacion text;
  v_es_cf          boolean;
  v_cliente_es_cf  boolean;
  v_creados        int := 0;
  v_vinculados     int := 0;
begin
  for r in
    select id, nombres, email, whatsapp, provincia, ciudad, datos_facturacion
    from pedidos
    where cliente_id is null
      and email not like '%@venta.local'
      and email not like '%@manual.local'
    order by creado_en desc
  loop
    v_fac := r.datos_facturacion;
    v_tipo_id := case v_fac->>'tipo_identificacion'
      when '04' then 'ruc' when '05' then 'cedula' when '06' then 'pasaporte'
      else 'consumidor_final'
    end;
    v_identificacion := coalesce(v_fac->>'identificacion', '9999999999999');
    v_es_cf := (v_fac is null or v_fac->>'tipo_identificacion' = '07'
      or v_identificacion = '9999999999999' or v_identificacion = '');

    select id, (tipo_identificacion = 'consumidor_final' or identificacion = '9999999999999')
    into v_cliente_id, v_cliente_es_cf
    from clientes where email = r.email limit 1;

    if v_cliente_id is not null then
      if v_cliente_es_cf and not v_es_cf then
        update clientes set
          tipo_identificacion = v_tipo_id, identificacion = v_identificacion,
          razon_social = r.nombres, telefono = coalesce(r.whatsapp, telefono),
          provincia = coalesce(r.provincia, provincia), ciudad = coalesce(r.ciudad, ciudad),
          actualizado_en = now()
        where id = v_cliente_id;
      end if;
    else
      insert into clientes (tipo_identificacion, identificacion, razon_social, email, telefono, provincia, ciudad)
      values (v_tipo_id, v_identificacion, r.nombres, r.email, r.whatsapp, r.provincia, r.ciudad)
      returning id into v_cliente_id;
      v_creados := v_creados + 1;
    end if;

    if v_cliente_id is not null then
      update pedidos set cliente_id = v_cliente_id where id = r.id;
      v_vinculados := v_vinculados + 1;
    end if;
  end loop;

  raise notice 'Backfill completo: % clientes creados, % pedidos vinculados', v_creados, v_vinculados;
end;
$$;


-- ============================================================
-- MIGRACIÓN _059: Payphone (pasarela de cobro en línea)
-- ============================================================

alter table configuracion_tienda
  add column if not exists payphone_activo   boolean not null default false,
  add column if not exists payphone_token    text,
  add column if not exists payphone_store_id text;

alter table pedidos
  add column if not exists payphone_payment_id text;
$$;
