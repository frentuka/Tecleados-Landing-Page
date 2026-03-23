import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  devToolbar: { enabled: false },
  server: {
    host: '0.0.0.0',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
