export interface Product {
  name: string;
  description: string;
  image: string;
  status: 'disponible' | 'proximamente' | 'agotado';
  price: string;
  wood: string;
}

export const products: Product[] = [
  {
    name: 'Lenga 65%',
    description: 'Compacto y elegante, tallado en lenga patagónica con acabado natural.',
    image: '/images/products/keyboard-lenga.webp',
    status: 'disponible',
    wood: 'Lenga',
    price: 'Consultar',
  },
  {
    name: 'Algarrobo TKL',
    description: 'Tenkeyless robusto en algarrobo, con vetas profundas y tonos cálidos.',
    image: '/images/products/keyboard-algarrobo.webp',
    status: 'proximamente',
    wood: 'Algarrobo',
    price: 'Consultar',
  },
  {
    name: 'Quebracho 75%',
    description: 'La dureza legendaria del quebracho en un formato compacto y funcional.',
    image: '/images/products/keyboard-quebracho.webp',
    status: 'proximamente',
    wood: 'Quebracho',
    price: 'Consultar',
  },
  {
    name: 'Guatambú Split',
    description: 'Ergonómico y dividido, tallado en guatambú con tonos claros y suaves.',
    image: '/images/products/keyboard-guatambu.webp',
    status: 'proximamente',
    wood: 'Guatambú',
    price: 'Consultar',
  },
];
