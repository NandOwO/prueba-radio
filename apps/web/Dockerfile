# Imagen de la web de PulsoFM: compila la PWA y la sirve con nginx.
# Se construye desde la raíz del repositorio.
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @pulsofm/shared build \
 && pnpm --filter @pulsofm/web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
