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
import { quotaDay, YouTubeQuotaService } from '../src/music/youtube-quota.service';

const SONG: Track = {
  provider: 'youtube',
  providerTrackId: 'abc123',
  title: 'Don’t Stop Me Now',
  artist: 'Queen',
  durationMs: 209_000,
  coverUrl: null,
};

class FakeMusicProvider implements MusicProvider {
  readonly name = 'youtube';
  calls: string[] = [];
  fail = false;
  async search(query: string): Promise<Track[]> {
    this.calls.push(query);
    if (this.fail) throw new Error('YOUTUBE_HTTP_500');
    return [SONG];
  }
}

describe('Búsqueda de canciones', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let music: FakeMusicProvider;
  let token: string;

  beforeAll(async () => {
    music = new FakeMusicProvider();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(new FakeErpAdapter())
      .overrideProvider(MUSIC_PROVIDER)
      .useValue(music)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.searchCache.deleteMany();
    await prisma.track.deleteMany();
    await prisma.quotaUsage.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    music.calls = [];
    music.fail = false;
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const search = (q: string) =>
    request(app.getHttpServer())
      .get('/tracks/search')
      .query({ q })
      .set('Authorization', `Bearer ${token}`);

  it('exige sesión', async () => {
    const res = await request(app.getHttpServer()).get('/tracks/search').query({ q: 'queen' });
    expect(res.status).toBe(401);
  });

  it('valida la longitud de la búsqueda', async () => {
    const res = await search('a');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve canciones normalizadas y las guarda en tracks', async () => {
    const res = await search('  Queen ');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      providerTrackId: 'abc123',
      artist: 'Queen',
      durationMs: 209_000,
    });
    expect(res.body.items[0].id).toEqual(expect.any(String));
    expect(await prisma.track.count()).toBe(1);
  });

  it('usa la caché para la misma búsqueda, sin llamar al proveedor', async () => {
    await search('queen');
    const second = await search('QUEEN');

    expect(second.status).toBe(200);
    expect(second.body.items).toHaveLength(1);
    expect(music.calls).toEqual(['queen']);
  });

  it('responde 503 si el proveedor falla y no hay caché', async () => {
    music.fail = true;
    const res = await search('nadie');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('SEARCH_UNAVAILABLE');
  });

  it('muestra resultados vencidos si el proveedor falla', async () => {
    await search('queen');
    await prisma.searchCache.update({
      where: { query: 'queen' },
      data: { cachedAt: new Date(Date.now() - 48 * 3600_000) },
    });
    music.fail = true;

    const res = await search('queen');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('Cuota diaria de YouTube', () => {
  let prisma: PrismaService;
  let quota: YouTubeQuotaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(new FakeErpAdapter())
      .overrideProvider(MUSIC_PROVIDER)
      .useValue(new FakeMusicProvider())
      .compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    prisma = app.get(PrismaService);
    quota = app.get(YouTubeQuotaService);
  });

  beforeEach(async () => {
    await prisma.quotaUsage.deleteMany();
  });

  it('usa el día de Pacífico para el reinicio de cuota', () => {
    // 2026-10-08 03:00 UTC es 2026-10-07 en Los Ángeles
    expect(quotaDay(new Date('2026-10-08T03:00:00Z'))).toBe('2026-10-07');
    expect(quotaDay(new Date('2026-10-08T09:00:00Z'))).toBe('2026-10-08');
  });

  it('acumula el consumo y rechaza cuando supera el límite', async () => {
    const now = new Date('2026-10-07T12:00:00Z');
    const day = quotaDay(now);
    await prisma.quotaUsage.create({ data: { day, units: 8950 } });

    await quota.reserve(40, now);
    await expect(quota.reserve(100, now)).rejects.toMatchObject({
      response: { code: 'SEARCH_QUOTA_EXHAUSTED' },
    });
    expect(await quota.usedToday(now)).toBe(8990);
  });
});
