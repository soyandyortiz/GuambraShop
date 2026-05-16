-- Tipo de contribuyente SRI: ruc | rimpe_emprendedor | artesano
-- Artesano fuerza tarifa IVA 0% por defecto al generar facturas
ALTER TABLE configuracion_facturacion
  ADD COLUMN IF NOT EXISTS tipo_contribuyente text NOT NULL DEFAULT 'ruc'
    CHECK (tipo_contribuyente IN ('ruc', 'rimpe_emprendedor', 'artesano'));
