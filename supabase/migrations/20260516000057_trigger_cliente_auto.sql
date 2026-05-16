-- Migración 057: Trigger para crear/vincular cliente automáticamente al insertar un pedido
-- Elimina la necesidad de "importar clientes" manualmente.

CREATE OR REPLACE FUNCTION fn_vincular_cliente_desde_pedido()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cliente_id  UUID;
  v_fac         JSONB;
  v_tipo_id     TEXT;
  v_identificacion TEXT;
  v_es_cf       BOOLEAN;
  v_cliente_es_cf BOOLEAN;
BEGIN
  -- Ignorar ventas manuales sin email real
  IF NEW.email LIKE '%@venta.local' OR NEW.email LIKE '%@manual.local' THEN
    RETURN NEW;
  END IF;

  -- Si el pedido ya tiene cliente_id asignado, no hacer nada
  IF NEW.cliente_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Leer datos de facturación del pedido
  v_fac := NEW.datos_facturacion;

  -- Determinar tipo de identificación
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

  -- ¿Ya existe cliente con ese email?
  SELECT id,
    (tipo_identificacion = 'consumidor_final' OR identificacion = '9999999999999')
  INTO v_cliente_id, v_cliente_es_cf
  FROM clientes
  WHERE email = NEW.email
  LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    -- Cliente existe: actualizar solo si tenemos datos reales y el cliente era CF
    IF v_cliente_es_cf AND NOT v_es_cf THEN
      UPDATE clientes SET
        tipo_identificacion = v_tipo_id,
        identificacion      = v_identificacion,
        razon_social        = NEW.nombres,
        telefono            = COALESCE(NEW.whatsapp, telefono),
        provincia           = COALESCE(NEW.provincia, provincia),
        ciudad              = COALESCE(NEW.ciudad, ciudad),
        actualizado_en      = NOW()
      WHERE id = v_cliente_id;
    END IF;
  ELSE
    -- Cliente no existe: crear
    INSERT INTO clientes (
      tipo_identificacion,
      identificacion,
      razon_social,
      email,
      telefono,
      provincia,
      ciudad
    ) VALUES (
      v_tipo_id,
      v_identificacion,
      NEW.nombres,
      NEW.email,
      NEW.whatsapp,
      NEW.provincia,
      NEW.ciudad
    )
    RETURNING id INTO v_cliente_id;
  END IF;

  -- Vincular el pedido al cliente
  IF v_cliente_id IS NOT NULL THEN
    NEW.cliente_id := v_cliente_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT para poder modificar NEW.cliente_id antes de guardar
CREATE TRIGGER tr_vincular_cliente_al_crear_pedido
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION fn_vincular_cliente_desde_pedido();
