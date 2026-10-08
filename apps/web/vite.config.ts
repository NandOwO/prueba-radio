import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
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
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'PulsoFM',
        short_name: 'PulsoFM',
        description: 'La radio del gimnasio: pide tu canción',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1120',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Las rutas del API nunca se sirven desde el shell: deben ir siempre a la red.
        navigateFallbackDenylist: API_PREFIXES.map((p) => new RegExp(`^${p}`)),
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
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
