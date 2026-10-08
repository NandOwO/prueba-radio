import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

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
    proxy: {
      ...Object.fromEntries(
        ['/auth', '/tracks', '/requests', '/queue', '/staff', '/health'].map((path) => [
          path,
          {
            target: apiTarget,
            // Una navegación del navegador (HTML) a una ruta de la app, como /queue, se sirve con la web
            // y no con el API. Las llamadas de datos (JSON) sí van al API.
            bypass: (req: { headers: { accept?: string } }) =>
              req.headers.accept?.includes('text/html') ? '/index.html' : undefined,
          },
        ]),
      ),
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
