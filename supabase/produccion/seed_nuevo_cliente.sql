-- ============================================================
-- SEED PRODUCCIÓN — NUEVO CLIENTE
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- DESPUÉS de haber corrido las migrations con supabase db push
-- ============================================================

-- 1. Configuración inicial de la tienda
--    Personalizar con los datos del cliente antes de ejecutar
--    IMPORTANTE: las migrations ya insertan una fila base.
--    Usar UPDATE en lugar de INSERT para no duplicar.
UPDATE configuracion_tienda SET
  nombre_tienda       = 'Nombre de la Tienda',                         -- <-- cambiar
  descripcion         = 'Descripción de la tienda del cliente.',       -- <-- cambiar
  whatsapp            = '0999999999',                                  -- <-- número WhatsApp del cliente (solo dígitos)
  moneda              = 'USD',
  simbolo_moneda      = '$',
  meta_descripcion    = 'Tienda online — Los mejores productos al mejor precio.',
  mensaje_suspension  = 'Esta tienda está temporalmente suspendida. Para reactivarla comunícate con GuambraWeb al +593982650929.',
  info_pago           = 'Transferencia: Banco Pichincha | Cta: 2200000000 | GuambraWeb',
  esta_activa         = true,
  cobro_activo        = false,                                         -- true si quieres activar cobro desde el inicio
  dias_pago           = 30;
