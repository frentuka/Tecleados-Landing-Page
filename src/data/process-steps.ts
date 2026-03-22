export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  image: string;
}

export const processSteps: ProcessStep[] = [
  {
    number: '01',
    title: 'Selección de Madera',
    description: 'Cada pieza comienza con la elección cuidadosa de madera nativa argentina. Trabajamos con productores sustentables para obtener lenga, algarrobo y quebracho de la más alta calidad.',
    image: '/images/process/step-01-wood.webp',
  },
  {
    number: '02',
    title: 'Fresado CNC',
    description: 'El diseño digital cobra forma física. Nuestras máquinas CNC tallan cada cuerpo con precisión milimétrica, respetando las vetas naturales de la madera.',
    image: '/images/process/step-02-cnc.webp',
  },
  {
    number: '03',
    title: 'Acabado a Mano',
    description: 'Lijado, aceitado y pulido manual. Cada teclado pasa por las manos de nuestros artesanos, quienes le dan el acabado suave y cálido que define a Tecleados.',
    image: '/images/process/step-03-finish.webp',
  },
  {
    number: '04',
    title: 'Ensamble',
    description: 'Switches, PCB, estabilizadores y keycaps se integran en el cuerpo de madera. Cada componente es testeado individualmente antes del ensamble final.',
    image: '/images/process/step-04-assembly.webp',
  },
  {
    number: '05',
    title: 'Control de Calidad',
    description: 'Cada tecla, cada LED, cada conexión. Probamos exhaustivamente cada unidad antes de que llegue a tus manos. Si no es perfecto, no sale.',
    image: '/images/process/step-05-testing.webp',
  },
];
