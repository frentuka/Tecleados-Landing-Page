export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Martín R.',
    role: 'Desarrollador Full-Stack',
    quote: 'No es solo un teclado, es una pieza de arte que uso todos los días. El sonido de las teclas sobre la madera es algo que no sabía que necesitaba.',
    avatar: '🧑‍💻',
  },
  {
    name: 'Lucía M.',
    role: 'Diseñadora UX',
    quote: 'La atención al detalle es increíble. Cada vez que alguien ve mi teclado en una call, me preguntan de dónde es. Orgullosa de que sea argentino.',
    avatar: '👩‍🎨',
  },
  {
    name: 'Santiago K.',
    role: 'Gamer & Streamer',
    quote: 'Pensé que un teclado de madera iba a ser solo estético, pero la calidad del tipeo y la respuesta de los switches me sorprendieron totalmente.',
    avatar: '🎮',
  },
  {
    name: 'Valentina S.',
    role: 'Escritora',
    quote: 'Escribir en un Tecleados es como volver a descubrir el placer de tipear. Tiene algo orgánico, cálido, que me conecta con lo que escribo.',
    avatar: '✍️',
  },
];
