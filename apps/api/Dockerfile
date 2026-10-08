# Imagen del API de PulsoFM. Se construye desde la raíz del repositorio.
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @pulsofm/shared build \
 && pnpm --filter @pulsofm/api exec prisma generate \
 && pnpm --filter @pulsofm/api build \
 && pnpm --filter @pulsofm/api deploy --prod /out

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/fixtures ./fixtures
USER node
EXPOSE 3000
# Aplica las migraciones pendientes antes de arrancar.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
