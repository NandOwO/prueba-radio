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

describe('Panel de staff', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let staffToken: string;
  let memberToken: string;
  let memberId: string;
  let adminToken: string;
  let requestIds: string[] = [];

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
    for (const model of [
      'auditLog',
      'userBlock',
      'blocklist',
      'playlistItem',
      'playlist',
      'favorite',
      'request',
      'track',
      'playbackState',
      'session',
      'user',
    ] as const) {
      await (prisma[model] as unknown as { deleteMany(): Promise<unknown> }).deleteMany();
    }
    const server = app.getHttpServer();
    staffToken = (
      await request(server).post('/auth/login').send({ username: 'ana.ruiz', password: 'gym-1234' })
    ).body.accessToken;
    const member = await request(server)
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    memberToken = member.body.accessToken;
    memberId = member.body.user.id;
    // Admin: el rol se asigna en la base de datos y se toma al emitir el siguiente token.
    await prisma.user.update({ where: { id: memberId }, data: { role: 'admin' } });
    adminToken = (
      await request(server)
        .post('/auth/login')
        .send({ username: 'maria.lopez', password: 'gym-1234' })
    ).body.accessToken;
    await prisma.user.update({ where: { id: memberId }, data: { role: 'member' } });

    requestIds = [];
    for (const [i, title] of ['Uno', 'Dos', 'Tres', 'Cuatro'].entries()) {
      const track = await prisma.track.create({
        data: {
          provider: 'youtube',
          providerTrackId: `s${i}`,
          title,
          artist: 'Artista',
          durationMs: 1000,
        },
      });
      const r = await prisma.request.create({
        data: {
          userId: memberId,
          trackId: track.id,
          position: i + 1,
          status: i === 0 ? 'playing' : 'queued',
        },
      });
      requestIds.push(r.id);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /** Saca al socio del cooldown y del límite: sus solicitudes de prueba son recientes. */
  const clearMemberRequestHistory = () =>
    prisma.request.updateMany({
      where: { userId: memberId },
      data: { createdAt: new Date(Date.now() - 3 * 3600_000) },
    });

  const as = (method: 'get' | 'post' | 'delete', path: string, token = staffToken) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  it('no deja a un socio normal usar el panel', async () => {
    expect((await as('post', '/staff/queue/skip', memberToken)).status).toBe(403);
    expect((await as('get', '/staff/users', memberToken)).status).toBe(403);
  });

  it('salta la canción que suena y lo registra en auditoría', async () => {
    const res = await as('post', '/staff/queue/skip');
    expect(res.status).toBe(200);
    expect(res.body.current.track.title).toBe('Dos');
    expect(res.body.previous[0].track.title).toBe('Uno');

    const log = await as('get', '/admin/audit', adminToken);
    expect(log.body[0]).toMatchObject({ action: 'queue.skip', actor: 'Ana Ruiz' });
  });

  it('quita una solicitud en espera con motivo', async () => {
    const res = await as('post', `/staff/requests/${requestIds[2]}/remove`).send({
      reason: 'Repetida',
    });
    expect(res.status).toBe(204);

    const queue = await request(app.getHttpServer())
      .get('/queue')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(queue.body.upcoming.map((i: { track: { title: string } }) => i.track.title)).toEqual([
      'Dos',
      'Cuatro',
    ]);
    const saved = await prisma.request.findUnique({ where: { id: requestIds[2] } });
    expect(saved).toMatchObject({ status: 'removed', reason: 'Repetida' });
  });

  it('no permite quitar una canción que ya suena', async () => {
    const res = await as('post', `/staff/requests/${requestIds[0]}/remove`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('REQUEST_NOT_QUEUED');
  });

  it('sube y baja canciones en la lista de espera', async () => {
    await as('post', `/staff/requests/${requestIds[3]}/move`).send({ direction: 'up' });
    let queue = await request(app.getHttpServer())
      .get('/queue')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(queue.body.upcoming.map((i: { track: { title: string } }) => i.track.title)).toEqual([
      'Dos',
      'Cuatro',
      'Tres',
    ]);

    await as('post', `/staff/requests/${requestIds[3]}/move`).send({ direction: 'down' });
    queue = await request(app.getHttpServer())
      .get('/queue')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(queue.body.upcoming.map((i: { track: { title: string } }) => i.track.title)).toEqual([
      'Dos',
      'Tres',
      'Cuatro',
    ]);
  });

  it('al bloquear una canción, quita de la cola las solicitudes que coinciden', async () => {
    const track = await prisma.track.findFirst({ where: { title: 'Tres' } });
    const res = await as('post', '/staff/blocklist').send({
      type: 'track',
      value: track!.providerTrackId,
      reason: 'Letra explícita',
    });
    expect(res.status).toBe(201);

    const saved = await prisma.request.findUnique({ where: { id: requestIds[2] } });
    expect(saved).toMatchObject({ status: 'removed', reason: 'Letra explícita' });
    expect((await as('get', '/staff/blocklist')).body).toHaveLength(1);
  });

  it('bloquea por artista: los socios no pueden pedir canciones de ese artista', async () => {
    await as('post', '/staff/blocklist').send({ type: 'artist', value: 'Artista' });
    await clearMemberRequestHistory();
    const track = await prisma.track.create({
      data: {
        provider: 'youtube',
        providerTrackId: 'nuevo',
        title: 'Nueva',
        artist: 'artista',
        durationMs: 1000,
      },
    });
    const res = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ trackId: track.id });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('TRACK_BLOCKED');
  });

  it('no repite una regla de bloqueo ya existente', async () => {
    await as('post', '/staff/blocklist').send({ type: 'keyword', value: 'remix' });
    const res = await as('post', '/staff/blocklist').send({ type: 'keyword', value: 'Remix' });
    expect(res.status).toBe(409);
  });

  it('bloquea a un socio para pedir canciones y lo desbloquea', async () => {
    await clearMemberRequestHistory();
    const track = await prisma.track.create({
      data: {
        provider: 'youtube',
        providerTrackId: 'pb',
        title: 'Pedida',
        artist: 'B',
        durationMs: 1000,
      },
    });
    const blocked = await as('post', `/staff/users/${memberId}/block`).send({
      reason: 'Uso indebido',
      minutes: 60,
    });
    expect(blocked.status).toBe(204);

    const denied = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ trackId: track.id });
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: 'USER_REQUESTS_BLOCKED', message: 'Uso indebido' });

    const listed = await as('get', '/staff/users?q=mar');
    expect(listed.body[0]).toMatchObject({ id: memberId, block: { reason: 'Uso indebido' } });

    await as('delete', `/staff/users/${memberId}/block`);
    const allowed = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ trackId: track.id });
    expect(allowed.status).toBe(201);
  });

  it('el registro de auditoría es solo para administradores', async () => {
    expect((await as('get', '/admin/audit')).status).toBe(403);
    expect((await as('get', '/admin/audit', adminToken)).status).toBe(200);
  });
});
