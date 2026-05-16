-- IVA por producto individual: 0 | 5 | 15 | null (null = usar tarifa global de configuracion_facturacion)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS tarifa_iva integer
    CHECK (tarifa_iva IN (0, 5, 15));
