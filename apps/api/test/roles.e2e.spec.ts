import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { FakeErpAdapter } from '../src/erp/fake-erp.adapter';
import { MEMBER_PROVIDER } from '../src/erp/member-provider.token';
import { PrismaService } from '../src/prisma.service';

describe('Roles en rutas protegidas', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(new FakeErpAdapter())
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  /** El rol se toma de la base de datos al emitir el token, así que se asigna antes de la segunda sesión. */
  async function loginAs(username: string, role?: string): Promise<string> {
    const first = await request(server())
      .post('/auth/login')
      .send({ username, password: 'gym-1234' });
    if (role) {
      await prisma.user.update({
        where: { externalId: first.body.user.externalId },
        data: { role },
      });
      const second = await request(server())
        .post('/auth/login')
        .send({ username, password: 'gym-1234' });
      return second.body.accessToken as string;
    }
    return first.body.accessToken as string;
  }

  it('rechaza sin token', async () => {
    const res = await request(server()).get('/staff/ping');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('rechaza a un socio normal', async () => {
    const token = await loginAs('maria.lopez');
    const res = await request(server()).get('/staff/ping').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('permite al staff tras asignarle el rol', async () => {
    const token = await loginAs('ana.ruiz', 'staff');
    const res = await request(server()).get('/staff/ping').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, role: 'staff' });
  });
});
