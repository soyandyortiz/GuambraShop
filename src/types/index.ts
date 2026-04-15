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
  creado_en: string
  actualizado_en: string
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

export interface VarianteProducto {
  id: string
  producto_id: string
  nombre: string
  descripcion: string | null
  precio_variante: number | null
  esta_activa: boolean
  orden: number
  creado_en: string
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

export interface Producto {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  precio: number
  precio_descuento: number | null
  categoria_id: string | null
  esta_activo: boolean
  requiere_tallas: boolean
  etiquetas: string[]
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
  ciudad: string | null
  empresa_envio: string
  precio: number
  tiempo_entrega: string | null
  esta_activa: boolean
  orden: number
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
}

export interface Lead {
  id: string
  telefono: string
  creado_en: string
}

export type EstadoPedido = 'pendiente' | 'confirmado' | 'en_proceso' | 'enviado' | 'entregado' | 'cancelado'
export type TipoPedido = 'delivery' | 'local'

export interface ItemPedido {
  producto_id: string
  nombre: string
  slug: string
  imagen_url: string | null
  precio: number
  variante?: string
  talla?: string
  cantidad: number
  subtotal: number
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
  zona_envio_id: string | null
  nombre_zona: string | null
  empresa_envio: string | null
  tiempo_entrega: string | null
  simbolo_moneda: string
  subtotal: number
  descuento_cupon: number
  cupon_codigo: string | null
  costo_envio: number
  total: number
  estado: EstadoPedido
  creado_en: string
  actualizado_en: string
}

// Carrito (solo en cliente, no persiste en DB)
export interface ItemCarrito {
  producto_id: string
  nombre: string
  slug: string
  imagen_url: string | null
  precio: number
  variante_id?: string
  nombre_variante?: string
  talla?: string
  cantidad: number
}
