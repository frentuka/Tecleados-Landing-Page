export interface WoodSpecies {
  name: string;
  scientificName: string;
  origin: string;
  description: string;
  image: string;
  color: string;
}

export const woodSpecies: WoodSpecies[] = [
  {
    name: 'Lenga',
    scientificName: 'Nothofagus pumilio',
    origin: 'Patagonia',
    description: 'Tonos claros con vetas sutiles. Liviana y elegante.',
    image: '/images/wood/lenga-closeup.webp',
    color: '#d4a574',
  },
  {
    name: 'Algarrobo',
    scientificName: 'Prosopis alba',
    origin: 'Norte argentino',
    description: 'Vetas profundas y tonos cálidos. Robusta y expresiva.',
    image: '/images/wood/algarrobo-closeup.webp',
    color: '#8b5e3c',
  },
  {
    name: 'Quebracho',
    scientificName: 'Schinopsis balansae',
    origin: 'Chaco',
    description: 'La madera más dura del mundo. Tonos rojizos intensos.',
    image: '/images/wood/quebracho-closeup.webp',
    color: '#6b2d1a',
  },
  {
    name: 'Guatambú',
    scientificName: 'Balfourodendron riedelianum',
    origin: 'Misiones',
    description: 'Blanco cremoso y grano fino. Perfecta para grabado láser.',
    image: '/images/wood/guatambu-closeup.webp',
    color: '#e8d5b7',
  },
];
