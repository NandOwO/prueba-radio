# Despliegue de PulsoFM

Guía para poner PulsoFM en un servidor (VPS o la PC del gimnasio) con Docker.

## Requisitos

- Docker y Docker Compose v2.
- Un dominio con **HTTPS**. Las cookies de sesión son `Secure` en producción: sin HTTPS el login funciona, pero la renovación de sesión no.
- Un proxy HTTPS delante de la web (Caddy, nginx o el del proveedor) que apunte al puerto `WEB_PORT`.

## Pasos

1. Clona el repositorio en el servidor y entra en la carpeta.
2. Crea la configuración:

   ```bash
   cp .env.production.example .env.production
   ```

   Cambia como mínimo `POSTGRES_PASSWORD`, `DATABASE_URL` (misma contraseña), `JWT_SECRET`, `ERP_API_KEY`, `ERP_WEBHOOK_SECRET` y los IDs de display, staff y admin.

3. Levanta los servicios. Compose debe leer el mismo archivo de variables:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

4. Comprueba la salud:

   ```bash
   curl -s http://localhost:8080/health
   docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
   ```

   El API aplica las migraciones al arrancar (`prisma migrate deploy`).

5. Apunta tu proxy HTTPS al puerto `WEB_PORT` y abre el dominio desde el móvil.

## Actualizar

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Las migraciones se aplican solas al reiniciar el API. Hacer copia de la base antes de actualizar:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  pg_dump -U pulsofm pulsofm > copia-$(date +%F).sql
```

## Pantalla del gimnasio

- En la PC conectada a los altavoces, abre `https://tu-dominio/display` en Chrome, en pantalla completa.
- Inicia sesión con la cuenta de pantalla (su ID de socio debe estar en `DISPLAY_MEMBER_IDS`).
- Pulsa **Iniciar radio** después de cada reinicio: el navegador exige un clic para reproducir con sonido.
- Para que arranque sola, configúrala como aplicación de inicio del sistema operativo.

## Qué no cubre esta guía todavía

- Copias automáticas de la base: la copia es manual, con el comando de arriba.
- Monitorización y alertas.
- Sincronización con el ERP real: hay que completar `GymErpAdapter` cuando se conozca (ver `docs/erp-integration.md`).
