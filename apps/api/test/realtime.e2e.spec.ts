import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookie from '@fastify/cookie';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
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

/** Espera el siguiente evento que cumpla la condición. Falla a los 3 s. */
function nextEvent<T>(
  socket: Socket,
  event: string,
  match: (payload: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout esperando ${event}`)), 3000);
    const handler = (payload: T) => {
      if (!match(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

describe('Tiempo real de la cola', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let queue: QueueService;
  let baseUrl: string;
  let token: string;
  let userId: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(new FakeErpAdapter())
      .overrideProvider(MUSIC_PROVIDER)
      .useValue(new NoopMusicProvider())
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
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
    sockets.forEach((s) => s.disconnect());
    await app.close();
  });

  function connect(auth: Record<string, unknown>): Socket {
    const socket = io(baseUrl, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  }

  it('envía la cola completa al conectarse con un token válido', async () => {
    const socket = connect({ token });
    const snapshot = await nextEvent<{ upcoming: unknown[] }>(socket, 'queue:updated');
    expect(snapshot).toMatchObject({ previous: [], current: null, upcoming: [] });
  });

  it('rechaza conexiones sin token válido', async () => {
    const socket = connect({ token: 'no-valido' });
    const error = await nextEvent<{ code: string }>(socket, 'error');
    expect(error.code).toBe('UNAUTHENTICATED');
  });

  it('avisa a los socios conectados cuando se hace una solicitud', async () => {
    const track = await prisma.track.create({
      data: {
        provider: 'youtube',
        providerTrackId: 'rt1',
        title: 'En vivo',
        artist: 'Banda',
        durationMs: 1000,
      },
    });
    const socket = connect({ token });
    await nextEvent(socket, 'queue:updated');

    const update = nextEvent<{
      current: { track: { title: string } } | null;
      upcoming: { track: { title: string } }[];
    }>(socket, 'queue:updated', (p) => p.current !== null || p.upcoming.length > 0);
    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ trackId: track.id });

    const payload = await update;
    expect((payload.current ?? payload.upcoming[0])?.track.title).toBe('En vivo');
  });

  it('avisa cuando la canción actual cambia', async () => {
    const track = await prisma.track.create({
      data: {
        provider: 'youtube',
        providerTrackId: 'rt2',
        title: 'Siguiente',
        artist: 'Banda',
        durationMs: 1000,
      },
    });
    await prisma.request.create({ data: { userId, trackId: track.id, position: 1 } });
    const socket = connect({ token });
    await nextEvent(socket, 'queue:updated');

    const update = nextEvent<{ current: { track: { title: string } } | null }>(
      socket,
      'queue:updated',
      (p) => p.current !== null,
    );
    await queue.advance();

    expect((await update).current?.track.title).toBe('Siguiente');
  });
});
