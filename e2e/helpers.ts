import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://pulsofm:pulsofm@localhost:5432/pulsofm_e2e';

/** Devuelve la base a los datos de ejemplo. Cada prueba empieza en el mismo estado. */
export function resetDatabase(): void {
  execFileSync(
    'psql',
    [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-q', '-f', join(__dirname, 'seed.sql')],
    {
      stdio: 'pipe',
    },
  );
}
