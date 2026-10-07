import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // Vitest usa esbuild, que no emite metadatos de decoradores que necesita la inyección de Nest.
    swc.vite({ module: { type: 'commonjs' } }),
  ],
  test: {
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    passWithNoTests: true,
  },
});
