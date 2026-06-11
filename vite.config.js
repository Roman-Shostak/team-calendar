import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// У режимі розробки фронтенд (5173) проксює /api на бекенд (3001),
// тож код працює як з одного джерела — без CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
