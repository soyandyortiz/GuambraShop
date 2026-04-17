// ============================================================
// Datos de localización: Ecuador, Perú, Colombia
// Provincias / Departamentos con sus principales ciudades
// ============================================================

export type PaisCode = 'EC' | 'PE' | 'CO'

export interface RegionLocal {
  nombre: string
  ciudades: string[]
}

export interface InfoPais {
  nombre: string
  moneda: string
  simboloMoneda: string
  codigoTelefono: string
  etiquetaRegion: string   // "Provincia" | "Departamento" | "Región"
  etiquetaCiudad: string   // "Ciudad" | "Municipio" | "Ciudad"
}

// ─── Ecuador ──────────────────────────────────────────────────────────────────
const ECUADOR: RegionLocal[] = [
  { nombre: 'Azuay',           ciudades: ['Cuenca', 'Gualaceo', 'Paute', 'Sigsig', 'Girón', 'Santa Isabel'] },
  { nombre: 'Bolívar',         ciudades: ['Guaranda', 'Chillanes', 'San Miguel', 'Echeandía'] },
  { nombre: 'Cañar',           ciudades: ['Azogues', 'Biblián', 'La Troncal', 'El Tambo', 'Cañar'] },
  { nombre: 'Carchi',          ciudades: ['Tulcán', 'San Gabriel', 'Mira', 'El Ángel', 'Huaca'] },
  { nombre: 'Chimborazo',      ciudades: ['Riobamba', 'Alausí', 'Guano', 'Chambo', 'Chunchi', 'Cumandá'] },
  { nombre: 'Cotopaxi',        ciudades: ['Latacunga', 'Pujilí', 'Saquisilí', 'La Maná', 'Salcedo'] },
  { nombre: 'El Oro',          ciudades: ['Machala', 'Pasaje', 'Santa Rosa', 'Huaquillas', 'Piñas', 'Zaruma'] },
  { nombre: 'Esmeraldas',      ciudades: ['Esmeraldas', 'Atacames', 'Muisne', 'Quinindé', 'San Lorenzo'] },
  { nombre: 'Galápagos',       ciudades: ['Puerto Baquerizo Moreno', 'Puerto Ayora', 'Puerto Villamil'] },
  { nombre: 'Guayas',          ciudades: ['Guayaquil', 'Durán', 'Samborondón', 'Milagro', 'Daule', 'El Triunfo', 'Naranjito', 'Playas'] },
  { nombre: 'Imbabura',        ciudades: ['Ibarra', 'Otavalo', 'Cotacachi', 'Atuntaqui', 'Pimampiro'] },
  { nombre: 'Loja',            ciudades: ['Loja', 'Catamayo', 'Cariamanga', 'Macará', 'Catacocha', 'Saraguro'] },
  { nombre: 'Los Ríos',        ciudades: ['Babahoyo', 'Quevedo', 'Vinces', 'Ventanas', 'Buena Fe'] },
  { nombre: 'Manabí',          ciudades: ['Portoviejo', 'Manta', 'Chone', 'El Carmen', 'Jipijapa', 'Bahía de Caráquez', 'Pedernales'] },
  { nombre: 'Morona Santiago', ciudades: ['Macas', 'Gualaquiza', 'Sucúa', 'Palora'] },
  { nombre: 'Napo',            ciudades: ['Tena', 'Archidona', 'El Chaco', 'Quijos'] },
  { nombre: 'Orellana',        ciudades: ['Puerto Francisco de Orellana', 'La Joya de los Sachas', 'Loreto'] },
  { nombre: 'Pastaza',         ciudades: ['Puyo', 'Mera', 'Santa Clara'] },
  { nombre: 'Pichincha',       ciudades: ['Quito', 'Cayambe', 'Sangolquí', 'Mejía', 'Pedro Moncayo'] },
  { nombre: 'Santa Elena',     ciudades: ['Santa Elena', 'Salinas', 'La Libertad'] },
  { nombre: 'Santo Domingo de los Tsáchilas', ciudades: ['Santo Domingo', 'La Concordia'] },
  { nombre: 'Sucumbíos',       ciudades: ['Nueva Loja (Lago Agrio)', 'Shushufindi', 'Cascales'] },
  { nombre: 'Tungurahua',      ciudades: ['Ambato', 'Baños', 'Pelileo', 'Pillaro', 'Tisaleo'] },
  { nombre: 'Zamora Chinchipe',ciudades: ['Zamora', 'Yantzaza', 'El Pangui'] },
]

// ─── Perú ─────────────────────────────────────────────────────────────────────
const PERU: RegionLocal[] = [
  { nombre: 'Amazonas',      ciudades: ['Chachapoyas', 'Bagua', 'Bagua Grande'] },
  { nombre: 'Áncash',        ciudades: ['Huaraz', 'Chimbote', 'Nuevo Chimbote', 'Huari', 'Carhuaz'] },
  { nombre: 'Apurímac',      ciudades: ['Abancay', 'Andahuaylas', 'Chalhuanca'] },
  { nombre: 'Arequipa',      ciudades: ['Arequipa', 'Camaná', 'Mollendo', 'Matarani', 'Ilo'] },
  { nombre: 'Ayacucho',      ciudades: ['Ayacucho', 'Huanta', 'San Francisco', 'Puquio'] },
  { nombre: 'Cajamarca',     ciudades: ['Cajamarca', 'Jaén', 'Chota', 'Cutervo', 'Bambamarca'] },
  { nombre: 'Callao',        ciudades: ['Callao', 'Bellavista', 'La Perla', 'La Punta'] },
  { nombre: 'Cusco',         ciudades: ['Cusco', 'Sicuani', 'Quillabamba', 'Puerto Maldonado'] },
  { nombre: 'Huancavelica',  ciudades: ['Huancavelica', 'Lircay', 'Pampas'] },
  { nombre: 'Huánuco',       ciudades: ['Huánuco', 'Tingo María', 'Leoncio Prado', 'Ambo'] },
  { nombre: 'Ica',           ciudades: ['Ica', 'Nazca', 'Pisco', 'Chincha Alta', 'Palpa'] },
  { nombre: 'Junín',         ciudades: ['Huancayo', 'Tarma', 'La Oroya', 'Satipo', 'Jauja', 'Chanchamayo'] },
  { nombre: 'La Libertad',   ciudades: ['Trujillo', 'Chepén', 'Otuzco', 'Huamachuco', 'Pacasmayo', 'Virú'] },
  { nombre: 'Lambayeque',    ciudades: ['Chiclayo', 'Ferreñafe', 'Lambayeque', 'Monsefú'] },
  { nombre: 'Lima',          ciudades: ['Lima', 'Huacho', 'Barranca', 'Cañete', 'Huaral', 'Ica', 'Matucana'] },
  { nombre: 'Loreto',        ciudades: ['Iquitos', 'Yurimaguas', 'Nauta', 'Contamana'] },
  { nombre: 'Madre de Dios', ciudades: ['Puerto Maldonado', 'Iberia', 'Iñapari'] },
  { nombre: 'Moquegua',      ciudades: ['Moquegua', 'Ilo', 'Omate'] },
  { nombre: 'Pasco',         ciudades: ['Cerro de Pasco', 'Oxapampa', 'La Merced'] },
  { nombre: 'Piura',         ciudades: ['Piura', 'Sullana', 'Talara', 'Paita', 'Chulucanas', 'Tumbes'] },
  { nombre: 'Puno',          ciudades: ['Puno', 'Juliaca', 'Ilave', 'Azángaro', 'Macusani'] },
  { nombre: 'San Martín',    ciudades: ['Moyobamba', 'Tarapoto', 'Rioja', 'Juanjuí', 'Tocache'] },
  { nombre: 'Tacna',         ciudades: ['Tacna', 'Tarata', 'Candarave'] },
  { nombre: 'Tumbes',        ciudades: ['Tumbes', 'Zarumilla', 'Zorritos'] },
  { nombre: 'Ucayali',       ciudades: ['Pucallpa', 'Aguaytía', 'Atalaya'] },
]

// ─── Colombia ─────────────────────────────────────────────────────────────────
const COLOMBIA: RegionLocal[] = [
  { nombre: 'Amazonas',              ciudades: ['Leticia', 'Puerto Nariño'] },
  { nombre: 'Antioquia',             ciudades: ['Medellín', 'Envigado', 'Itagüí', 'Bello', 'Rionegro', 'Apartadó', 'Turbo'] },
  { nombre: 'Arauca',                ciudades: ['Arauca', 'Saravena', 'Tame'] },
  { nombre: 'Atlántico',             ciudades: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga'] },
  { nombre: 'Bogotá D.C.',           ciudades: ['Bogotá'] },
  { nombre: 'Bolívar',               ciudades: ['Cartagena', 'Magangué', 'El Carmen de Bolívar'] },
  { nombre: 'Boyacá',                ciudades: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'] },
  { nombre: 'Caldas',                ciudades: ['Manizales', 'Villamaría', 'La Dorada', 'Chinchiná'] },
  { nombre: 'Caquetá',               ciudades: ['Florencia', 'San Vicente del Caguán'] },
  { nombre: 'Casanare',              ciudades: ['Yopal', 'Aguazul', 'Villanueva'] },
  { nombre: 'Cauca',                 ciudades: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'] },
  { nombre: 'Cesar',                 ciudades: ['Valledupar', 'Aguachica', 'Codazzi', 'Bosconia'] },
  { nombre: 'Chocó',                 ciudades: ['Quibdó', 'Istmina', 'Riosucio'] },
  { nombre: 'Córdoba',               ciudades: ['Montería', 'Lorica', 'Cereté', 'Sahagún'] },
  { nombre: 'Cundinamarca',          ciudades: ['Soacha', 'Facatativá', 'Zipaquirá', 'Girardot', 'Fusagasugá', 'Chía'] },
  { nombre: 'Guainía',               ciudades: ['Puerto Inírida'] },
  { nombre: 'Guaviare',              ciudades: ['San José del Guaviare'] },
  { nombre: 'Huila',                 ciudades: ['Neiva', 'Pitalito', 'Garzón', 'La Plata'] },
  { nombre: 'La Guajira',            ciudades: ['Riohacha', 'Maicao', 'Uribia', 'Manaure'] },
  { nombre: 'Magdalena',             ciudades: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'] },
  { nombre: 'Meta',                  ciudades: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López'] },
  { nombre: 'Nariño',                ciudades: ['Pasto', 'Ipiales', 'Tumaco', 'Túquerres'] },
  { nombre: 'Norte de Santander',    ciudades: ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'] },
  { nombre: 'Putumayo',              ciudades: ['Mocoa', 'Puerto Asís', 'Orito'] },
  { nombre: 'Quindío',               ciudades: ['Armenia', 'Calarcá', 'Montenegro'] },
  { nombre: 'Risaralda',             ciudades: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'] },
  { nombre: 'San Andrés',            ciudades: ['San Andrés', 'Providencia'] },
  { nombre: 'Santander',             ciudades: ['Bucaramanga', 'Floridablanca', 'Girón', 'Barrancabermeja', 'Socorro'] },
  { nombre: 'Sucre',                 ciudades: ['Sincelejo', 'Corozal', 'Sampués'] },
  { nombre: 'Tolima',                ciudades: ['Ibagué', 'Espinal', 'Melgar', 'Honda'] },
  { nombre: 'Valle del Cauca',       ciudades: ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Buga', 'Cartago'] },
  { nombre: 'Vaupés',                ciudades: ['Mitú'] },
  { nombre: 'Vichada',               ciudades: ['Puerto Carreño'] },
]

// ─── Mapa de países ───────────────────────────────────────────────────────────

const REGIONES: Record<PaisCode, RegionLocal[]> = {
  EC: ECUADOR,
  PE: PERU,
  CO: COLOMBIA,
}

export const INFO_PAIS: Record<PaisCode, InfoPais> = {
  EC: { nombre: 'Ecuador',  moneda: 'USD', simboloMoneda: '$',  codigoTelefono: '+593', etiquetaRegion: 'Provincia',    etiquetaCiudad: 'Ciudad'    },
  PE: { nombre: 'Perú',     moneda: 'PEN', simboloMoneda: 'S/', codigoTelefono: '+51',  etiquetaRegion: 'Región',       etiquetaCiudad: 'Ciudad'    },
  CO: { nombre: 'Colombia', moneda: 'COP', simboloMoneda: '$',  codigoTelefono: '+57',  etiquetaRegion: 'Departamento', etiquetaCiudad: 'Municipio' },
}

/** Devuelve las regiones del país indicado */
export function obtenerRegiones(pais: string): RegionLocal[] {
  return REGIONES[(pais as PaisCode)] ?? ECUADOR
}

/** Devuelve solo los nombres de las regiones */
export function obtenerNombresRegiones(pais: string): string[] {
  return obtenerRegiones(pais).map(r => r.nombre)
}

/** Devuelve las ciudades de una región específica */
export function obtenerCiudades(pais: string, region: string): string[] {
  return obtenerRegiones(pais).find(r => r.nombre === region)?.ciudades ?? []
}

/** Info del país (moneda, etiquetas, etc.) */
export function obtenerInfoPais(pais: string): InfoPais {
  return INFO_PAIS[(pais as PaisCode)] ?? INFO_PAIS.EC
}

// Re-export para compatibilidad con código existente
export { ECUADOR as PROVINCIAS_ECUADOR_LOCALES }
