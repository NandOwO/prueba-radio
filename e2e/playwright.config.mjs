import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const chromium = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: here,
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    // La app se prueba en español, el idioma por defecto del gimnasio.
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        launchOptions: chromium ? { executablePath: chromium, args: ['--no-sandbox'] } : {},
      },
    },
  ],
  webServer: [
    {
      command: `node ${join(here, 'start-api.mjs')}`,
      url: 'http://localhost:3100/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @pulsofm/web exec vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173/login',
      env: { API_PROXY_TARGET: 'http://localhost:3100' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
