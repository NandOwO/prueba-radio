import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import request from 'supertest';
import type { MusicProvider, Track } from '@pulsofm/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { FakeErpAdapter } from '../src/erp/fake-erp.adapter';
import { MEMBER_PROVIDER } from '../src/erp/member-provider.token';
import { MUSIC_PROVIDER } from '../src/music/music-provider.token';
import { PrismaService } from '../src/prisma.service';

class NoopMusicProvider implements MusicProvider {
  readonly name = 'youtube';
  async search(): Promise<Track[]> {
    return [];
  }
}

describe('Solicitudes y límites', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let trackId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(new FakeErpAdapter())
      .overrideProvider(MUSIC_PROVIDER)
      .useValue(new NoopMusicProvider())
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.request.deleteMany();
    await prisma.userBlock.deleteMany();
    await prisma.blocklist.deleteMany();
    await prisma.searchCache.deleteMany();
    await prisma.track.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    token = login.body.accessToken;
    userId = login.body.user.id;
    const track = await prisma.track.create({
      data: {
        provider: 'youtube',
        providerTrackId: `vid-${Math.random().toString(36).slice(2)}`,
        title: 'Don’t Stop Me Now',
        artist: 'Queen',
        durationMs: 209_000,
      },
    });
    trackId = track.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (id = trackId) =>
    request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ trackId: id });

  /** Inserta solicitudes con fecha pasada para simular el tiempo sin esperar. */
  async function backdate(minutesAgo: number[]) {
    for (const m of minutesAgo) {
      const t = await prisma.track.create({
        data: {
          provider: 'youtube',
          providerTrackId: `past-${m}-${Math.random().toString(36).slice(2)}`,
          title: `Pasada ${m}`,
          artist: 'Test',
          durationMs: 1000,
        },
      });
      await prisma.request.create({
        data: {
          userId,
          trackId: t.id,
          position: 1,
          createdAt: new Date(Date.now() - m * 60_000),
        },
      });
    }
  }

  it('exige sesión', async () => {
    const res = await request(app.getHttpServer()).post('/requests').send({ trackId });
    expect(res.status).toBe(401);
  });

  it('crea la solicitud en la cola con su número de orden', async () => {
    const res = await post();

    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({
      status: 'queued',
      position: 1,
      track: { title: 'Don’t Stop Me Now' },
    });
  });

  it('asigna números de orden consecutivos a solicitudes distintas', async () => {
    await post();
    const otherTrack = await prisma.track.create({
      data: {
        provider: 'youtube',
        providerTrackId: 'otro',
        title: 'Otra',
        artist: 'X',
        durationMs: 1000,
      },
    });
    // Espera el cooldown simulando una solicitud anterior hace 7 min
    await prisma.request.updateMany({
      where: { userId },
      data: { createdAt: new Date(Date.now() - 7 * 60_000) },
    });
    const res = await post(otherTrack.id);

    expect(res.status).toBe(201);
    expect(res.body.request.position).toBe(2);
  });

  it('aplica cooldown de 6 minutos entre solicitudes', async () => {
    await post();
    const res = await post();

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('REQUEST_COOLDOWN');
    expect(res.body.details.retryAfterSeconds).toBeGreaterThan(300);
    expect(res.body.details.retryAfterSeconds).toBeLessThanOrEqual(360);
  });

  it('aplica el límite de 5 solicitudes en 30 minutos', async () => {
    await backdate([7, 13, 19, 25, 29]);
    const res = await post();

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('REQUEST_QUOTA_EXCEEDED');
    expect(res.body.details.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('bloquea canciones de la blocklist: 422 y no cuentan para los límites', async () => {
    await prisma.blocklist.create({
      data: { type: 'artist', value: 'Queen', reason: 'Letra explícita' },
    });
    const res = await post();

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'TRACK_BLOCKED', message: 'Letra explícita' });
    const saved = await prisma.request.findFirst({ where: { userId } });
    expect(saved?.status).toBe('blocked');
    await prisma.blocklist.deleteMany();
    // Una solicitud bloqueada no activa el cooldown: la siguiente canción sí se acepta.
    const next = await post();
    expect(next.status).toBe(201);
  });

  it('impide solicitar a un socio con bloqueo activo', async () => {
    await prisma.userBlock.create({
      data: { userId, reason: 'Uso indebido', expiresAt: new Date(Date.now() + 3600_000) },
    });
    const res = await post();

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'USER_REQUESTS_BLOCKED', message: 'Uso indebido' });
  });

  it('permite solicitar de nuevo cuando el bloqueo ya venció', async () => {
    await prisma.userBlock.create({
      data: { userId, reason: 'Vencido', expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await post();

    expect(res.status).toBe(201);
  });

  it('responde 404 si la canción no existe', async () => {
    const res = await post('no-existe');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TRACK_NOT_FOUND');
  });

  it('muestra solicitudes propias con límites restantes', async () => {
    await backdate([10, 20]);
    const res = await request(app.getHttpServer())
      .get('/requests/mine')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.limits).toMatchObject({
      remaining: 3,
      maxInWindow: 5,
      windowMinutes: 30,
      cooldownMinutes: 6,
    });
  });
});
