// Arranca el API compilado contra la base de datos de pruebas, aplicando migraciones antes.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(root, 'apps/api');
const env = {
  ...process.env,
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? 'postgresql://pulsofm:pulsofm@localhost:5432/pulsofm_e2e',
  JWT_SECRET: 'e2e-secret-value-at-least-16-chars',
  ERP_SYNC_ENABLED: 'false',
  DISPLAY_MEMBER_IDS: 'DISPLAY-01',
  STAFF_MEMBER_IDS: 'M-10601',
  PORT: '3100',
};

const migrate = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  cwd: api,
  env,
  stdio: 'inherit',
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const server = spawn('node', ['dist/main.js'], { cwd: api, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
