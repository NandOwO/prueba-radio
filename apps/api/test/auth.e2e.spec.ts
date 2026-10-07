import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { FakeErpAdapter } from '../src/erp/fake-erp.adapter';
import { MEMBER_PROVIDER } from '../src/erp/member-provider.token';
import { PrismaService } from '../src/prisma.service';

const REFRESH = 'pulsofm_rt';

function refreshCookie(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.find((c) => c.startsWith(`${REFRESH}=`))?.split(';')[0];
}

describe('Auth (ERP credentials)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let erp: FakeErpAdapter;

  beforeAll(async () => {
    erp = new FakeErpAdapter();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(erp)
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
  const login = (username = 'maria.lopez', password = 'gym-1234') =>
    request(server()).post('/auth/login').send({ username, password });

  it('inicia sesión con credenciales del ERP y deja el refresh token en cookie httpOnly', async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      externalId: 'M-10482',
      username: 'maria.lopez',
      role: 'member',
    });
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(refreshCookie(res)).toBeDefined();
  });

  it('responde igual ante contraseña incorrecta y usuario inexistente', async () => {
    const wrongPassword = await login('maria.lopez', 'mal');
    const unknownUser = await login('no.existe', 'gym-1234');

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });

  it('no permite entrar a un socio suspendido en el ERP', async () => {
    const res = await login('juan.perez', 'gym-1234');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEMBER_NOT_ACTIVE');
  });

  it('valida el cuerpo de la petición de login', async () => {
    const res = await request(server()).post('/auth/login').send({ username: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rota el refresh token: el anterior ya no sirve', async () => {
    const first = await login();
    const oldCookie = refreshCookie(first)!;

    const renewed = await request(server()).post('/auth/refresh').set('Cookie', oldCookie);
    expect(renewed.status).toBe(200);
    expect(renewed.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(renewed)).not.toBe(oldCookie);

    const reused = await request(server()).post('/auth/refresh').set('Cookie', oldCookie);
    expect(reused.status).toBe(401);
    expect(reused.body.code).toBe('SESSION_EXPIRED');
  });

  it('revoca la sesión en el siguiente refresh si el ERP suspende al socio', async () => {
    const first = await login();
    erp.setStatus('M-10482', 'suspended', new Date(Date.now() + 1000));

    const res = await request(server()).post('/auth/refresh').set('Cookie', refreshCookie(first)!);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEMBER_NOT_ACTIVE');

    erp.setStatus('M-10482', 'active', new Date(Date.now() + 2000));
    const again = await request(server())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie(first)!);
    expect(again.status).toBe(401);
  });

  it('protege /auth/me con el access token', async () => {
    const res = await login();

    const ok = await request(server())
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(ok.status).toBe(200);
    expect(ok.body.externalId).toBe('M-10482');

    const missing = await request(server()).get('/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body.code).toBe('UNAUTHENTICATED');

    const forged = await request(server())
      .get('/auth/me')
      .set('Authorization', 'Bearer abc.def.ghi');
    expect(forged.status).toBe(401);
    expect(forged.body.code).toBe('TOKEN_INVALID');
  });

  it('cierra sesión y deja de aceptar el refresh token', async () => {
    const first = await login();
    const cookieValue = refreshCookie(first)!;

    const out = await request(server()).post('/auth/logout').set('Cookie', cookieValue);
    expect(out.status).toBe(204);

    const after = await request(server()).post('/auth/refresh').set('Cookie', cookieValue);
    expect(after.status).toBe(401);
  });
});
