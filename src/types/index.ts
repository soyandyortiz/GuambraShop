// ============================================================
// TIPOS TYPESCRIPT - Tienda Demo
// Reflejan exactamente las tablas de Supabase
// ============================================================

export type Rol = 'admin' | 'superadmin'

export interface Perfil {
  id: string
  rol: Rol
  nombre: string | null
  telefono: string | null
  creado_en: string
  actualizado_en: string
}

export interface ConfiguracionTienda {
  id: string
  nombre_tienda: string
  descripcion: string | null
  logo_url: string | null
  favicon_url: string | null
  foto_perfil_url: string | null
  foto_portada_url: string | null
  whatsapp: string | null
  moneda: string
  simbolo_moneda: string
  politicas_negocio: string | null
  meta_descripcion: string | null
  esta_activa: boolean
  mensaje_suspension: string
  info_pago: string | null
  habilitar_citas: boolean
  hora_apertura: string
  hora_cierre: string
  duracion_cita_minutos: number
  capacidad_citas_simultaneas: number
  seleccion_empleado: boolean
  pais: string
  creado_en: string
  actualizado_en: string
}

export interface EmpleadoCita {
  id: string
  nombre_completo: string
  activo: boolean
  orden: number
  creado_en: string
}

export interface DireccionNegocio {
  id: string
  etiqueta: string
  direccion: string
  ciudad: string | null
  provincia: string | null
  pais: string
  es_principal: boolean
  enlace_mapa: string | null
  creado_en: string
}

export interface RedSocial {
  id: string
  plataforma: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'twitter' | 'pinterest' | 'linkedin' | 'snapchat' | 'whatsapp'
  url: string
  esta_activa: boolean
  orden: number
}

export interface MensajeAdmin {
  id: string
  asunto: string | null
  cuerpo: string
  leido: boolean
  creado_en: string
}

export interface Categoria {
  id: string
  nombre: string
  slug: string
  parent_id: string | null
  imagen_url: string | null
  esta_activa: boolean
  orden: number
  creado_en: string
  subcategorias?: Categoria[]
}

export interface ImagenProducto {
  id: string
  producto_id: string
  url: string
  orden: number
  creado_en: string
}

export interface PaqueteEvento {
  id: string
  icono: string
  nombre: string
  descripcion?: string | null
  precio_min?: number | null
  precio_max?: number | null
}

export interface VarianteProducto {
  id: string
  producto_id: string
  nombre: string
  descripcion: string | null
  precio_variante: number | null
  imagen_url?: string | null
  esta_activa: boolean
  orden: number
  creado_en: string
  stock?: number | null
  tipo_precio?: 'reemplaza' | 'suma' | null  // 'reemplaza' = sustituye precio base; 'suma' = add-on
}

export interface ResenaProducto {
  id: string
  producto_id: string
  nombre_cliente: string
  cedula: string
  calificacion: number
  comentario: string | null
  es_visible: boolean
  creado_en: string
}

export type TipoProducto = 'producto' | 'servicio' | 'evento' | 'alquiler'

export type EstadoSolicitud = 'nueva' | 'en_conversacion' | 'cotizacion_enviada' | 'confirmada' | 'rechazada'

export interface SolicitudEvento {
  id: string
  numero_solicitud: string
  producto_id: string | null
  producto_nombre: string
  nombre_cliente: string
  email: string
  whatsapp: string
  fecha_evento: string | null       // DATE → "YYYY-MM-DD"
  hora_evento: string | null        // TIME → "HH:MM:SS"
  ciudad: string | null
  tipo_evento: string | null
  presupuesto_aproximado: number | null
  notas: string | null
  estado: EstadoSolicitud
  pedido_id: string | null
  creado_en: string
  actualizado_en: string
}

export interface Cita {
  id: string
  pedido_id: string | null
  producto_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: 'pendiente' | 'reservada' | 'confirmada' | 'cancelada'
  creado_en: string
  actualizado_en: string
}

export interface Alquiler {
  id: string
  pedido_id: string | null
  producto_id: string
  fecha_inicio: string   // DATE → "YYYY-MM-DD"
  fecha_fin: string      // DATE → "YYYY-MM-DD"
  dias: number
  cantidad: number
  hora_recogida: string | null  // TIME → "HH:MM:SS"
  estado: 'reservado' | 'activo' | 'vencido' | 'devuelto' | 'cancelado'
  creado_en: string
  actualizado_en: string
}

export interface Producto {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  tipo_producto: TipoProducto
  precio: number
  precio_descuento: number | null
  categoria_id: string | null
  stock?: number | null
  esta_activo: boolean
  requiere_tallas: boolean
  etiquetas: string[]
  url_video?: string | null
  paquetes_evento?: PaqueteEvento[]
  precio_deposito?: number | null      // Solo alquiler: depósito de garantía (legado)
  max_dias_alquiler?: number | null    // Solo alquiler: máximo de días
  garantia_descripcion?: string | null // Solo alquiler: texto de garantía (cédula, laptop, etc.)
  tarifa_iva?: number | null           // null = usar tarifa global de configuracion_facturacion
  creado_en: string
  actualizado_en: string
  // Relaciones (joins)
  imagenes?: ImagenProducto[]
  variantes?: VarianteProducto[]
  tallas?: TallaProducto[]
  categoria?: Categoria | null
  likes_count?: number
  calificacion_promedio?: number
  total_resenas?: number
}

export interface Cupon {
  id: string
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo'
  valor_descuento: number
  compra_minima: number | null
  max_usos: number | null
  usos_actuales: number
  esta_activo: boolean
  vence_en: string | null
  creado_en: string
}

export type FormatoImagen = 'cuadrado' | 'horizontal' | 'vertical'

export interface Promocion {
  id: string
  nombre: string
  descripcion: string | null
  precio: number | null
  imagen_url: string
  formato_imagen: FormatoImagen
  mensaje_whatsapp: string
  esta_activa: boolean
  inicia_en: string | null
  termina_en: string | null
  creado_en: string
}

export interface ZonaEnvio {
  id: string
  provincia: string
  ciudad: string
  precio: number
  tiempo_entrega: string | null
  esta_activa: boolean
  creado_en: string
}

// Carrito (solo en cliente, no persiste en DB)
export interface TallaProducto {
  id: string
  producto_id: string
  talla: string
  disponible: boolean
  orden: number
  creado_en: string
  stock?: number | null
}

export type EstadoPedido = 'pendiente' | 'confirmado' | 'en_proceso' | 'enviado' | 'entregado' | 'cancelado'
export type TipoPedido = 'delivery' | 'local'

export interface ItemPedido {
  producto_id: string
  nombre: string
  slug: string
  tipo_producto: TipoProducto
  imagen_url: string | null
  precio: number
  variante?: string
  talla?: string
  cantidad: number
  subtotal: number
  cita?: {
    fecha: string
    hora_inicio: string
    hora_fin: string
    empleado_id?: string | null
    empleado_nombre?: string
  }
  alquiler?: {
    fecha_inicio: string
    fecha_fin: string
    dias: number
    hora_recogida?: string
  }
}

export interface Pedido {
  id: string
  numero_orden: string
  tipo: TipoPedido
  nombres: string
  email: string
  whatsapp: string
  provincia: string | null
  ciudad: string | null
  direccion: string | null
  detalles_direccion: string | null
  items: ItemPedido[]
  simbolo_moneda: string
  subtotal: number
  descuento_cupon: number
  cupon_codigo: string | null
  costo_envio: number
  total: number
  estado: EstadoPedido
  datos_facturacion: {
    tipo_identificacion: string
    identificacion: string
    razon_social: string
    email?: string | null
    direccion?: string | null
    telefono?: string | null
  } | null
  creado_en: string
  actualizado_en: string
}

// Carrito (solo en cliente, no persiste en DB)
export interface ItemCarrito {
  producto_id: string
  nombre: string
  slug: string
  tipo_producto: TipoProducto
  imagen_url: string | null
  precio: number
  variante_id?: string
  nombre_variante?: string
  talla?: string
  cantidad: number
  cita?: {
    fecha: string
    hora_inicio: string
    hora_fin: string
    empleado_id?: string | null
    empleado_nombre?: string
  }
  extras?: { id: string; nombre: string; precio: number }[]
}

// ============================================================
// FACTURACIÓN ELECTRÓNICA SRI
// ============================================================

export type AmbienteSRI = 'pruebas' | 'produccion'
export type EstadoFactura = 'borrador' | 'enviada' | 'autorizada' | 'rechazada' | 'anulada'

export type ProveedorEmail = 'gmail' | 'smtp' | 'resend'

export interface ConfiguracionEmail {
  id: string
  proveedor: ProveedorEmail
  smtp_host: string | null
  smtp_port: number
  smtp_usuario: string | null
  smtp_password: string | null
  resend_api_key: string | null
  from_email: string
  from_nombre: string
  envio_automatico: boolean
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface ConfiguracionFacturacion {
  id: string
  ruc: string
  razon_social: string
  nombre_comercial: string | null
  direccion_matriz: string
  codigo_establecimiento: string
  punto_emision: string
  ambiente: AmbienteSRI
  obligado_contabilidad: boolean
  tipo_contribuyente: 'ruc' | 'rimpe_emprendedor' | 'artesano'
  tarifa_iva: number
  contribuyente_especial: string | null
  regimen: string | null
  cert_p12_url: string | null
  cert_pin: string | null
  secuencial_actual: number
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface ItemFactura {
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
  iva: number         // 0 = exento, 15 = 15%
}

export interface TotalesFactura {
  subtotal_0: number    // base sin IVA (productos exentos)
  subtotal_iva: number  // base con IVA
  total_iva: number     // monto IVA calculado
  descuento: number
  total: number
}

export interface CompradorFactura {
  tipo_identificacion: '04' | '05' | '06' | '07'  // 04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor Final
  identificacion: string
  razon_social: string
  email: string | null
  direccion: string | null
  telefono: string | null
}

export interface Factura {
  id: string
  pedido_id: string | null
  numero_secuencial: string
  numero_factura: string | null
  clave_acceso: string | null
  numero_autorizacion: string | null
  fecha_emision: string
  fecha_autorizacion: string | null
  estado: EstadoFactura
  datos_comprador: CompradorFactura
  items: ItemFactura[]
  totales: TotalesFactura
  xml_firmado: string | null
  ride_url: string | null
  error_sri: string | null
  motivo_anulacion: string | null
  email_enviado_en: string | null
  email_enviado_a: string | null
  notas: string | null
  creado_en: string
  actualizado_en: string
}
