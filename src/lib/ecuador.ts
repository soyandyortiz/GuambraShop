export interface ProvinciaEcuador {
  nombre: string
  ciudades: string[]
}

export const PROVINCIAS_ECUADOR: ProvinciaEcuador[] = [
  { nombre: 'Azuay',           ciudades: ['Cuenca', 'Gualaceo', 'Paute', 'Sigsig', 'Girón', 'Nabón', 'Oña', 'Pucará', 'San Fernando', 'Santa Isabel', 'Sevilla de Oro'] },
  { nombre: 'Bolívar',         ciudades: ['Guaranda', 'Chillanes', 'San Miguel', 'Echeandía', 'Caluma', 'Las Naves'] },
  { nombre: 'Cañar',           ciudades: ['Azogues', 'Biblián', 'La Troncal', 'El Tambo', 'Cañar', 'Déleg', 'Suscal'] },
  { nombre: 'Carchi',          ciudades: ['Tulcán', 'San Gabriel', 'Mira', 'El Ángel', 'Huaca', 'La Bonita', 'Bolívar'] },
  { nombre: 'Chimborazo',      ciudades: ['Riobamba', 'Alausí', 'Guano', 'Chambo', 'Chunchi', 'Colta', 'Cumandá', 'Pallatanga', 'Penipe', 'Guamote'] },
  { nombre: 'Cotopaxi',        ciudades: ['Latacunga', 'Pujilí', 'Saquisilí', 'La Maná', 'Pangua', 'Salcedo', 'Sigchos'] },
  { nombre: 'El Oro',          ciudades: ['Machala', 'Pasaje', 'Santa Rosa', 'Huaquillas', 'Piñas', 'Zaruma', 'Arenillas', 'Balsas', 'El Guabo', 'Marcabelí', 'Portovelo'] },
  { nombre: 'Esmeraldas',      ciudades: ['Esmeraldas', 'Atacames', 'Muisne', 'Quinindé', 'Eloy Alfaro', 'Río Verde', 'San Lorenzo'] },
  { nombre: 'Galápagos',       ciudades: ['Puerto Baquerizo Moreno', 'Puerto Ayora', 'Puerto Villamil'] },
  { nombre: 'Guayas',          ciudades: ['Guayaquil', 'Durán', 'Samborondón', 'Milagro', 'Daule', 'El Triunfo', 'Naranjito', 'Playas', 'Balzar', 'Balao', 'Colimes', 'General Antonio Elizalde', 'Isidro Ayora', 'Lomas de Sargentillo', 'Naranjal', 'Nobol', 'Palestina', 'Pedro Carbo', 'Santa Lucía', 'Simón Bolívar', 'Yaguachi'] },
  { nombre: 'Imbabura',        ciudades: ['Ibarra', 'Otavalo', 'Cotacachi', 'Atuntaqui', 'Urcuquí', 'Pimampiro'] },
  { nombre: 'Loja',            ciudades: ['Loja', 'Catamayo', 'Cariamanga', 'Macará', 'Catacocha', 'Alamor', 'Célica', 'Chaguarpamba', 'Espíndola', 'Gonzanamá', 'Paltas', 'Pindal', 'Puyango', 'Saraguro', 'Sozoranga', 'Zapotillo'] },
  { nombre: 'Los Ríos',        ciudades: ['Babahoyo', 'Quevedo', 'Vinces', 'Ventanas', 'Buena Fe', 'Valencia', 'Baba', 'Catarama', 'Mocache', 'Montalvo', 'Palenque', 'Pueblo Viejo', 'Urdaneta'] },
  { nombre: 'Manabí',          ciudades: ['Portoviejo', 'Manta', 'Chone', 'El Carmen', 'Jipijapa', 'Bahía de Caráquez', 'Pedernales', 'Tosagua', 'Bolívar', 'Flavio Alfaro', 'Jaramijó', 'Junín', 'Montecristi', 'Olmedo', 'Paján', 'Pichincha', 'Puerto López', 'Rocafuerte', 'San Vicente', 'Santa Ana', 'Sucre', '24 de Mayo'] },
  { nombre: 'Morona Santiago', ciudades: ['Macas', 'Gualaquiza', 'Palora', 'Sucúa', 'Huamboya', 'Limón Indanza', 'Logroño', 'San Juan Bosco', 'Santiago', 'Taisha', 'Tiwintza'] },
  { nombre: 'Napo',            ciudades: ['Tena', 'Archidona', 'El Chaco', 'Quijos', 'Carlos Julio Arosemena Tola'] },
  { nombre: 'Orellana',        ciudades: ['Puerto Francisco de Orellana', 'La Joya de los Sachas', 'Loreto', 'Aguarico'] },
  { nombre: 'Pastaza',         ciudades: ['Puyo', 'Mera', 'Santa Clara', 'Arajuno'] },
  { nombre: 'Pichincha',       ciudades: ['Quito', 'Cayambe', 'Mejía', 'Pedro Moncayo', 'Rumiñahui', 'Sangolquí', 'Pedro Vicente Maldonado', 'Puerto Quito', 'San Miguel de los Bancos'] },
  { nombre: 'Santa Elena',     ciudades: ['Santa Elena', 'Salinas', 'La Libertad', 'Ancón'] },
  { nombre: 'Santo Domingo de los Tsáchilas', ciudades: ['Santo Domingo', 'La Concordia'] },
  { nombre: 'Sucumbíos',       ciudades: ['Nueva Loja (Lago Agrio)', 'Shushufindi', 'Cascales', 'Cuyabeno', 'Gonzalo Pizarro', 'Putumayo'] },
  { nombre: 'Tungurahua',      ciudades: ['Ambato', 'Baños', 'Pelileo', 'Pillaro', 'Tisaleo', 'Cevallos', 'Mocha', 'Patate', 'Quero'] },
  { nombre: 'Zamora Chinchipe', ciudades: ['Zamora', 'Yantzaza', 'El Pangui', 'Chinchipe', 'Centinela del Cóndor', 'Nangaritza', 'Palanda', 'Paquisha'] },
]

export const CODIGOS_PAIS = [
  { codigo: '+593', bandera: '🇪🇨', pais: 'Ecuador' },
  { codigo: '+1',   bandera: '🇺🇸', pais: 'EE.UU.' },
  { codigo: '+34',  bandera: '🇪🇸', pais: 'España' },
  { codigo: '+51',  bandera: '🇵🇪', pais: 'Perú' },
  { codigo: '+57',  bandera: '🇨🇴', pais: 'Colombia' },
  { codigo: '+52',  bandera: '🇲🇽', pais: 'México' },
  { codigo: '+54',  bandera: '🇦🇷', pais: 'Argentina' },
  { codigo: '+56',  bandera: '🇨🇱', pais: 'Chile' },
]
