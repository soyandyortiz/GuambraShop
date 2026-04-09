-- ============================================================
-- MIGRACIÓN 2: Leads, Tallas y ajustes de productos
-- ============================================================

-- ============================================================
-- TABLA 16: LEADS
-- Se captura el teléfono la primera vez que el cliente
-- intenta agregar al carrito. Exportable a Excel desde el admin.
-- ============================================================
create table leads (
  id          uuid primary key default gen_random_uuid(),
  telefono    text not null unique,
  creado_en   timestamptz default now()
);

create index idx_leads_creado_en on leads(creado_en desc);

-- ============================================================
-- TABLA 17: TALLAS DE PRODUCTO
-- Solo aplica si el producto tiene requiere_tallas = true.
-- Las tallas son independientes de las variantes de precio.
-- ============================================================
create table tallas_producto (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  talla       text not null,        -- "S","M","L","XL","EU 37","38","40", etc.
  disponible  boolean not null default true,
  orden       int not null default 0,
  creado_en   timestamptz default now(),
  unique(producto_id, talla)
);

create index idx_tallas_producto on tallas_producto(producto_id, orden);

-- ============================================================
-- CAMBIOS EN TABLA: productos
-- Agregar campo requiere_tallas
-- (esta_activo ya existía desde la migración inicial)
-- ============================================================
alter table productos
  add column requiere_tallas boolean not null default false;

-- ============================================================
-- RLS: LEADS
-- ============================================================
alter table leads enable row level security;

-- El público puede insertar su propio lead
create policy "publico_registrar_lead" on leads
  for insert with check (
    telefono is not null and
    length(telefono) >= 7
  );

-- Solo admin y superadmin pueden ver y exportar leads
create policy "admin_ver_leads" on leads
  for select using (obtener_rol() in ('admin', 'superadmin'));

create policy "admin_eliminar_lead" on leads
  for delete using (obtener_rol() in ('admin', 'superadmin'));

-- ============================================================
-- RLS: TALLAS
-- ============================================================
alter table tallas_producto enable row level security;

create policy "publico_ver_tallas_disponibles" on tallas_producto
  for select using (disponible = true);

create policy "admin_gestionar_tallas" on tallas_producto
  for all using (obtener_rol() in ('admin', 'superadmin'));
