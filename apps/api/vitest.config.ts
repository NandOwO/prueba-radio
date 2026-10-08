import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // Vitest usa esbuild, que no emite metadatos de decoradores que necesita la inyección de Nest.
    swc.vite(),
  ],
  test: {
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-with-16-chars-or-more',
      ERP_WEBHOOK_SECRET: 'test-secret-with-16-chars-or-more',
      ERP_SYNC_ENABLED: 'false',
      DISPLAY_MEMBER_IDS: 'DISPLAY-01',
      STAFF_MEMBER_IDS: 'M-10601',
    },
    // Las pruebas e2e comparten la base de datos: se ejecutan en serie.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
