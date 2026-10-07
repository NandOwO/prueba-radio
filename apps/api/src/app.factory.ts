import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { AppModule } from './app.module';

/** Crea la aplicación con los plugins comunes. Lo usan main.ts y las pruebas e2e. */
export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    rawBody: true,
    logger: process.env.NODE_ENV === 'test' ? false : undefined,
  });
  await app.register(cookie);
  return app;
}
