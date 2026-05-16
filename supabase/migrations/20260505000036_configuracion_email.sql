create table if not exists configuracion_email (
  id                uuid primary key default gen_random_uuid(),
  proveedor         text not null default 'gmail',   -- 'gmail' | 'smtp' | 'resend'
  smtp_host         text,
  smtp_port         integer default 587,
  smtp_usuario      text,
  smtp_password     text,
  resend_api_key    text,
  from_email        text not null,
  from_nombre       text not null default 'Facturación',
  envio_automatico  boolean not null default false,
  activo            boolean not null default false,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

-- Solo superadmin puede ver/editar
alter table configuracion_email enable row level security;

create policy "superadmin_all_email" on configuracion_email
  for all using (
    exists (
      select 1 from perfiles
      where id = auth.uid() and rol = 'superadmin'
    )
  );
