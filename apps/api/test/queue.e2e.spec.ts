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
import { QueueService } from '../src/requests/queue.service';

class NoopMusicProvider implements MusicProvider {
  readonly name = 'youtube';
  async search(): Promise<Track[]> {
    return [];
  }
}

describe('Cola de reproducción', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let queue: QueueService;
  let token: string;
  let userId: string;
  const titles = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho'];

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
    queue = app.get(QueueService);
  });

  beforeEach(async () => {
    await prisma.request.deleteMany();
    await prisma.track.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    token = login.body.accessToken;
    userId = login.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Crea n solicitudes en cola con títulos Uno, Dos, … */
  async function seed(n: number) {
    for (let i = 0; i < n; i++) {
      const track = await prisma.track.create({
        data: {
          provider: 'youtube',
          providerTrackId: `q-${i}-${Math.random().toString(36).slice(2)}`,
          title: titles[i]!,
          artist: 'Artista',
          durationMs: 180_000,
        },
      });
      await prisma.request.create({ data: { userId, trackId: track.id, position: i + 1 } });
    }
  }

  const getQueue = () =>
    request(app.getHttpServer()).get('/queue').set('Authorization', `Bearer ${token}`);

  it('exige sesión', async () => {
    const res = await request(app.getHttpServer()).get('/queue');
    expect(res.status).toBe(401);
  });

  it('muestra la cola en orden: canción actual y siguientes', async () => {
    await seed(3);
    await queue.advance();

    const res = await getQueue();
    expect(res.status).toBe(200);
    expect(res.body.current.track.title).toBe('Uno');
    expect(res.body.upcoming.map((i: { track: { title: string } }) => i.track.title)).toEqual([
      'Dos',
      'Tres',
    ]);
    expect(res.body.previous).toEqual([]);
    expect(res.body.current.requestedBy).toBe('María');
  });

  it('muestra hasta 5 canciones anteriores, de la más reciente a la más antigua', async () => {
    await seed(8);
    // 8 avances: Uno a Siete quedan reproducidas y Ocho está sonando
    for (let i = 0; i < 8; i++) await queue.advance();

    const res = await getQueue();
    expect(res.body.previous.map((i: { track: { title: string } }) => i.track.title)).toEqual([
      'Siete',
      'Seis',
      'Cinco',
      'Cuatro',
      'Tres',
    ]);
    expect(res.body.current.track.title).toBe('Ocho');
    expect(res.body.upcoming).toEqual([]);
  });

  it('marca como saltadas las canciones que se saltan', async () => {
    await seed(2);
    await queue.advance();
    await queue.advance({ skipped: true });

    const res = await getQueue();
    expect(res.body.previous[0]).toMatchObject({ status: 'skipped', track: { title: 'Uno' } });
    expect(res.body.current.track.title).toBe('Dos');
  });

  it('muestra en Mis solicitudes el puesto en la cola', async () => {
    await seed(3);
    const res = await request(app.getHttpServer())
      .get('/requests/mine')
      .set('Authorization', `Bearer ${token}`);

    const places = res.body.items.map((i: { track: { title: string }; queuePosition: number }) => [
      i.track.title,
      i.queuePosition,
    ]);
    expect(places).toEqual(
      expect.arrayContaining([
        ['Uno', 1],
        ['Dos', 2],
        ['Tres', 3],
      ]),
    );
  });
});
