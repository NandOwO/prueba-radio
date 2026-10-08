import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

const API_PREFIXES = [
  '/auth',
  '/tracks',
  '/requests',
  '/queue',
  '/player',
  '/library',
  '/staff',
  '/admin',
  '/integrations',
  '/health',
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Usamos el código fuente de @pulsofm/shared: el build CJS del API no es analizable por Vite.
    alias: {
      '@pulsofm/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    // Rutas del API. Las rutas de la app no usan estos prefijos, así que no hay colisiones.
    proxy: {
      ...Object.fromEntries(API_PREFIXES.map((path) => [path, { target: apiTarget }])),
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
