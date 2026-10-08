# PulsoFM

Radio de gimnasio: los socios piden canciones desde el móvil, la PC de la sala las reproduce por los altavoces y el staff modera la cola.

- **Socios:** buscar, pedir, ver la cola en vivo, guardar favoritos y playlists.
- **Pantalla (`/display`):** reproduce la cola con el reproductor de YouTube.
- **Staff (`/panel`):** saltar, quitar y reordenar canciones; blocklist; bloqueo de socios; auditoría (admin).

Documentación del proyecto en [`docs/`](docs/): plan de implementación, integración con el ERP, manual de uso y despliegue.

## Requisitos

- Node.js 22 y pnpm 10 (`corepack enable` los activa).
- Docker con Compose, **o** PostgreSQL 16 instalado en local.
- Para el modo de prueba no hace falta ninguna clave externa. Para buscar canciones reales, una `YOUTUBE_API_KEY`.

## Puesta en marcha en local

```bash
# 1. Dependencias (también activa los hooks de Git)
corepack enable
pnpm install

# 2. Configuración
cp .env.example .env
#    Revisa JWT_SECRET (mínimo 16 caracteres). Para buscar canciones reales, pon YOUTUBE_API_KEY.

# 3. Base de datos (PostgreSQL y Redis con Docker)
docker compose up -d postgres redis
set -a && source .env && set +a        # carga DATABASE_URL en la shell
pnpm --filter @pulsofm/api exec prisma migrate deploy

# 4. Datos de demo (opcional, borra los datos locales)
#    Sin clave de YouTube, la búsqueda devuelve tres canciones de muestra.
docker compose exec -T postgres psql -U pulsofm -d pulsofm < e2e/seed.sql

# 5. Compilar y arrancar el API (puerto 3000)
pnpm build
node --env-file=.env apps/api/dist/main.js

# 6. En otra terminal: la web en modo desarrollo (puerto 5173, reenvía el API)
pnpm --filter @pulsofm/web dev
```

Abre <http://localhost:5173> en el navegador. Para probar la vista de móvil, usa las herramientas de desarrollo del navegador (modo de dispositivo, por ejemplo 390 × 844).

Sin Docker, crea la base a mano (`createdb pulsofm`) y pon su URL en `DATABASE_URL`; los pasos 3 a 6 son iguales, sin `docker compose`. El paso 4 necesita `psql` en lugar de `docker compose exec`.

## Cuentas de prueba

Los socios vienen del ERP de prueba (`apps/api/fixtures/erp-members.json`). Todos usan la contraseña `gym-1234`, salvo la pantalla.

| Usuario        | Contraseña    | Rol                                | Para qué                                   |
| -------------- | ------------- | ---------------------------------- | ------------------------------------------ |
| `maria.lopez`  | `gym-1234`    | admin (por `ADMIN_MEMBER_IDS`)     | Socia que pide canciones y ve la auditoría |
| `ana.ruiz`     | `gym-1234`    | staff (por `STAFF_MEMBER_IDS`)     | Panel de staff                             |
| `juan.perez`   | `gym-1234`    | socio suspendido                   | Debe ser rechazado al entrar               |
| `pantalla.gym` | `gym-display` | display (por `DISPLAY_MEMBER_IDS`) | Pantalla de la sala en `/display`          |

Los roles se asignan por ID de socio en `.env`. Cambios de rol se aplican al renovar la sesión (máximo 15 minutos).

## Pruebas

```bash
pnpm test          # unitarias e integración de todos los paquetes (usa la base pulsofm_test)
pnpm lint
pnpm typecheck
pnpm e2e           # flujos completos en móvil con Playwright
```

Las pruebas de API usan una base aparte. Créala una vez:

```bash
docker compose exec postgres createdb -U pulsofm pulsofm_test
docker compose exec postgres createdb -U pulsofm pulsofm_e2e
export DATABASE_URL=postgresql://pulsofm:pulsofm@localhost:5432/pulsofm_test
```

Las pruebas e2e necesitan Chromium: `pnpm exec playwright install chromium`, o indica uno existente con `PW_CHROMIUM_PATH`.

## Problemas frecuentes

- **La búsqueda responde 503.** Falta `YOUTUBE_API_KEY`, o se agotó la cuota diaria. Con datos de demo (paso 4) la búsqueda funciona sin clave.
- **Login: "No podemos verificar tu cuenta".** El ERP no responde: revisa `ERP_MODE=fake` en `.env`.
- **La pantalla no reproduce.** Pulsa _Iniciar radio_. El navegador exige un clic para reproducir con sonido.
- **Cambié el rol y no aparece.** Cierra sesión y vuelve a entrar.

## Estructura

```
apps/api      NestJS + Fastify + Prisma (API, tiempo real con Socket.IO)
apps/web      React + Vite + Tailwind (PWA)
packages/shared  Tipos y constantes compartidos
e2e/          Pruebas Playwright y datos de demo
docs/         Plan, integración con el ERP, manual de uso y despliegue
```
