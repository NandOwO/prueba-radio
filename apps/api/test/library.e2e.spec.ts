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

describe('Biblioteca: favoritos y playlists', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;
  let trackA: string;
  let trackB: string;

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
    await prisma.playlistItem.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.request.deleteMany();
    await prisma.track.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const server = app.getHttpServer();
    token = (
      await request(server)
        .post('/auth/login')
        .send({ username: 'maria.lopez', password: 'gym-1234' })
    ).body.accessToken;
    otherToken = (
      await request(server).post('/auth/login').send({ username: 'ana.ruiz', password: 'gym-1234' })
    ).body.accessToken;
    trackA = (
      await prisma.track.create({
        data: {
          provider: 'youtube',
          providerTrackId: 'a',
          title: 'A',
          artist: 'X',
          durationMs: 1000,
        },
      })
    ).id;
    trackB = (
      await prisma.track.create({
        data: {
          provider: 'youtube',
          providerTrackId: 'b',
          title: 'B',
          artist: 'X',
          durationMs: 1000,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const api = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, t = token) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${t}`);

  it('crea, renombra y lista playlists', async () => {
    const created = await api('post', '/library/playlists').send({ name: 'Cardio' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Cardio', trackCount: 0 });

    const renamed = await api('patch', `/library/playlists/${created.body.id}`).send({
      name: 'Cardio fuerte',
    });
    expect(renamed.body.name).toBe('Cardio fuerte');

    const list = await api('get', '/library/playlists');
    expect(list.body).toEqual([{ id: created.body.id, name: 'Cardio fuerte', trackCount: 0 }]);
  });

  it('valida el nombre de la playlist', async () => {
    const res = await api('post', '/library/playlists').send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('añade canciones sin duplicarlas y las quita', async () => {
    const pl = (await api('post', '/library/playlists').send({ name: 'Mix' })).body;
    await api('post', `/library/playlists/${pl.id}/items`).send({ trackId: trackA });
    await api('post', `/library/playlists/${pl.id}/items`).send({ trackId: trackA });
    await api('post', `/library/playlists/${pl.id}/items`).send({ trackId: trackB });

    const detail = await api('get', `/library/playlists/${pl.id}`);
    expect(detail.body.items.map((i: { title: string }) => i.title)).toEqual(['A', 'B']);

    await api('delete', `/library/playlists/${pl.id}/items/${trackA}`);
    const after = await api('get', `/library/playlists/${pl.id}`);
    expect(after.body.items.map((i: { title: string }) => i.title)).toEqual(['B']);
  });

  it('no deja ver ni cambiar playlists de otro socio', async () => {
    const pl = (await api('post', '/library/playlists').send({ name: 'Privada' })).body;

    expect((await api('get', `/library/playlists/${pl.id}`, otherToken)).status).toBe(404);
    expect(
      (await api('patch', `/library/playlists/${pl.id}`, otherToken).send({ name: 'Hack' })).status,
    ).toBe(404);
    expect((await api('delete', `/library/playlists/${pl.id}`, otherToken)).status).toBe(404);
  });

  it('borra una playlist', async () => {
    const pl = (await api('post', '/library/playlists').send({ name: 'Temporal' })).body;
    const res = await api('delete', `/library/playlists/${pl.id}`);
    expect(res.status).toBe(204);
    expect((await api('get', '/library/playlists')).body).toEqual([]);
  });

  it('limita el número de playlists por socio', async () => {
    for (let i = 0; i < 20; i++) await api('post', '/library/playlists').send({ name: `P${i}` });
    const res = await api('post', '/library/playlists').send({ name: 'Extra' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PLAYLIST_LIMIT');
  });

  it('marca y desmarca favoritos', async () => {
    expect((await api('put', `/library/favorites/${trackA}`)).status).toBe(204);
    await api('put', `/library/favorites/${trackA}`);
    expect(
      (await api('get', '/library/favorites')).body.map((t: { title: string }) => t.title),
    ).toEqual(['A']);

    await api('delete', `/library/favorites/${trackA}`);
    expect((await api('get', '/library/favorites')).body).toEqual([]);
  });

  it('informa si la canción es favorita y en qué playlists está', async () => {
    const pl = (await api('post', '/library/playlists').send({ name: 'Mix' })).body;
    await api('put', `/library/favorites/${trackA}`);
    await api('post', `/library/playlists/${pl.id}/items`).send({ trackId: trackA });

    const state = await api('get', `/library/tracks/${trackA}/save-state`);
    expect(state.body).toEqual({ favorite: true, playlistIds: [pl.id] });
  });

  it('responde 404 al guardar una canción que no existe', async () => {
    const res = await api('put', '/library/favorites/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TRACK_NOT_FOUND');
  });
});
