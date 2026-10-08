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

describe('Control de reproducción', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let displayToken: string;
  let memberToken: string;
  let userId: string;

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
    await prisma.playbackState.deleteMany();
    await prisma.track.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const server = app.getHttpServer();
    const display = await request(server)
      .post('/auth/login')
      .send({ username: 'pantalla.gym', password: 'gym-display' });
    displayToken = display.body.accessToken;
    const member = await request(server)
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    memberToken = member.body.accessToken;
    userId = member.body.user.id;

    for (let i = 1; i <= 3; i++) {
      const track = await prisma.track.create({
        data: {
          provider: 'youtube',
          providerTrackId: `p${i}`,
          title: `Tema ${i}`,
          artist: 'A',
          durationMs: 1000,
        },
      });
      await prisma.request.create({ data: { userId, trackId: track.id, position: i } });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, token: string) =>
    request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`);

  it('asigna el rol display a la cuenta de la pantalla', async () => {
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${displayToken}`);
    expect(me.body.role).toBe('display');
  });

  it('la pantalla avanza a la siguiente canción', async () => {
    const res = await post('/player/next', displayToken);

    expect(res.status).toBe(200);
    expect(res.body.current.track.title).toBe('Tema 1');
    expect(res.body.upcoming).toHaveLength(2);

    const second = await post('/player/next', displayToken);
    expect(second.body.current.track.title).toBe('Tema 2');
    expect(second.body.previous[0].track.title).toBe('Tema 1');
  });

  it('pausa y reanuda la radio, y lo refleja en la cola', async () => {
    const paused = await post('/player/pause', displayToken);
    expect(paused.body.paused).toBe(true);

    const snapshot = await request(app.getHttpServer())
      .get('/queue')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(snapshot.body.paused).toBe(true);

    const resumed = await post('/player/resume', displayToken);
    expect(resumed.body.paused).toBe(false);
  });

  it('el staff también puede controlar la reproducción', async () => {
    const staff = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'ana.ruiz', password: 'gym-1234' });
    const res = await post('/player/next', staff.body.accessToken);
    expect(res.status).toBe(200);
  });

  it('impide que un socio normal controle la reproducción', async () => {
    const res = await post('/player/next', memberToken);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});
