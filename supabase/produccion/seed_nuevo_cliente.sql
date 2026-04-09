-- ============================================================
-- SEED PRODUCCIÓN — NUEVO CLIENTE
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- DESPUÉS de haber corrido las migrations con supabase db push
-- ============================================================

-- 1. Configuración inicial de la tienda
--    Personalizar con los datos del cliente antes de ejecutar
INSERT INTO configuracion_tienda (
  nombre_tienda,
  descripcion,
  whatsapp,
  moneda,
  simbolo_moneda,
  meta_descripcion,
  mensaje_suspension,
  info_pago,
  esta_activa,
  cobro_activo,
  dias_pago
) VALUES (
  'Nombre de la Tienda',                         -- <-- cambiar
  'Descripción de la tienda del cliente.',       -- <-- cambiar
  '0999999999',                                  -- <-- número WhatsApp del cliente (solo dígitos)
  'USD',
  '$',
  'Tienda online — Los mejores productos al mejor precio.',
  'Esta tienda está temporalmente suspendida. Para reactivarla comunícate con GuambraWeb al +593982650929.',
  'Transferencia: Banco Pichincha | Cta: 2200000000 | GuambraWeb',
  true,
  false,                                         -- true si quieres activar cobro desde el inicio
  30
);
