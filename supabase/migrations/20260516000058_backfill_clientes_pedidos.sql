-- Migración 058: Backfill único — vincula pedidos históricos a clientes
-- Ejecutar una sola vez. Después el trigger _057 lo hace automáticamente.

DO $$
DECLARE
  r           RECORD;
  v_cliente_id UUID;
  v_fac        JSONB;
  v_tipo_id    TEXT;
  v_identificacion TEXT;
  v_es_cf      BOOLEAN;
  v_cliente_es_cf BOOLEAN;
  v_creados    INT := 0;
  v_vinculados INT := 0;
BEGIN
  FOR r IN
    SELECT id, nombres, email, whatsapp, provincia, ciudad, datos_facturacion
    FROM pedidos
    WHERE cliente_id IS NULL
      AND email NOT LIKE '%@venta.local'
      AND email NOT LIKE '%@manual.local'
    ORDER BY creado_en DESC
  LOOP
    v_fac := r.datos_facturacion;

    v_tipo_id := CASE v_fac->>'tipo_identificacion'
      WHEN '04' THEN 'ruc'
      WHEN '05' THEN 'cedula'
      WHEN '06' THEN 'pasaporte'
      ELSE 'consumidor_final'
    END;

    v_identificacion := COALESCE(v_fac->>'identificacion', '9999999999999');

    v_es_cf := (
      v_fac IS NULL
      OR v_fac->>'tipo_identificacion' = '07'
      OR v_identificacion = '9999999999999'
      OR v_identificacion = ''
    );

    -- ¿Existe cliente con ese email?
    SELECT id,
      (tipo_identificacion = 'consumidor_final' OR identificacion = '9999999999999')
    INTO v_cliente_id, v_cliente_es_cf
    FROM clientes
    WHERE email = r.email
    LIMIT 1;

    IF v_cliente_id IS NOT NULL THEN
      -- Actualizar si el cliente era CF y el pedido trae datos reales
      IF v_cliente_es_cf AND NOT v_es_cf THEN
        UPDATE clientes SET
          tipo_identificacion = v_tipo_id,
          identificacion      = v_identificacion,
          razon_social        = r.nombres,
          telefono            = COALESCE(r.whatsapp, telefono),
          provincia           = COALESCE(r.provincia, provincia),
          ciudad              = COALESCE(r.ciudad, ciudad),
          actualizado_en      = NOW()
        WHERE id = v_cliente_id;
      END IF;
    ELSE
      -- Crear cliente nuevo
      INSERT INTO clientes (
        tipo_identificacion, identificacion, razon_social,
        email, telefono, provincia, ciudad
      ) VALUES (
        v_tipo_id, v_identificacion, r.nombres,
        r.email, r.whatsapp, r.provincia, r.ciudad
      )
      RETURNING id INTO v_cliente_id;
      v_creados := v_creados + 1;
    END IF;

    -- Vincular pedido
    IF v_cliente_id IS NOT NULL THEN
      UPDATE pedidos SET cliente_id = v_cliente_id WHERE id = r.id;
      v_vinculados := v_vinculados + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill completo: % clientes creados, % pedidos vinculados', v_creados, v_vinculados;
END;
$$;
