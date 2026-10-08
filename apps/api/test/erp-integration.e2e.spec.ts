import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import request from 'supertest';
import type { MusicProvider, Track } from '@pulsofm/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { signErpPayload } from '../src/integrations/erp-signature.guard';
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

const SECRET = 'test-secret-with-16-chars-or-more';

describe('Integración con el ERP', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let erp: FakeErpAdapter;

  beforeAll(async () => {
    erp = new FakeErpAdapter();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MEMBER_PROVIDER)
      .useValue(erp)
      .overrideProvider(MUSIC_PROVIDER)
      .useValue(new NoopMusicProvider())
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      rawBody: true,
    });
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // El ERP de prueba es compartido: cada caso empieza con María activa.
    erp.setStatus('M-10482', 'active', new Date('2026-01-01T00:00:00Z'));
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  /** Envía un evento firmado como lo haría el ERP. */
  function sendMemberEvent(body: object, opts: { secret?: string; timestamp?: number } = {}) {
    const raw = JSON.stringify(body);
    const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
    const signature = signErpPayload(opts.secret ?? SECRET, timestamp, raw);
    return request(server())
      .post('/integrations/erp/members')
      .set('Content-Type', 'application/json')
      .set('X-Erp-Timestamp', String(timestamp))
      .set('X-Erp-Signature', signature)
      .send(raw);
  }

  const event = (status: 'active' | 'suspended' | 'inactive', updatedAt = new Date()) => ({
    event: 'member.updated',
    member: { id: 'M-10482', fullName: 'María López', status, updatedAt: updatedAt.toISOString() },
  });

  async function loginMaria() {
    const res = await request(server())
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    return res.body.accessToken as string;
  }

  it('acepta un cambio firmado y actualiza al socio', async () => {
    await loginMaria();
    const res = await sendMemberEvent(event('suspended', new Date(Date.now() + 1000)));

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('updated');
    const user = await prisma.user.findUnique({ where: { externalId: 'M-10482' } });
    expect(user?.status).toBe('suspended');
  });

  it('cierra las sesiones de un socio que deja de estar activo', async () => {
    const token = await loginMaria();
    await sendMemberEvent(event('suspended', new Date(Date.now() + 1000)));
    // El ERP también conoce el cambio: si no, el próximo login volvería a activar al socio.
    erp.setStatus('M-10482', 'suspended', new Date(Date.now() + 1000));

    const me = await request(server()).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(403);
    expect(me.body.code).toBe('MEMBER_NOT_ACTIVE');
    const login = await request(server())
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    expect(login.status).toBe(403);
  });

  it('rechaza firmas incorrectas', async () => {
    const res = await sendMemberEvent(event('suspended'), { secret: 'otro-secreto-de-prueba-123' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('rechaza firmas con más de 5 minutos de antigüedad', async () => {
    const res = await sendMemberEvent(event('suspended'), {
      timestamp: Math.floor(Date.now() / 1000) - 600,
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('STALE_SIGNATURE');
  });

  it('ignora un evento más viejo que el dato local', async () => {
    await loginMaria();
    await sendMemberEvent(event('suspended', new Date('2026-10-09T10:00:00Z')));
    const older = await sendMemberEvent(event('active', new Date('2026-10-09T09:00:00Z')));

    expect(older.body.outcome).toBe('ignored');
    const user = await prisma.user.findUnique({ where: { externalId: 'M-10482' } });
    expect(user?.status).toBe('suspended');
  });

  it('registra el cambio de estado en auditoría', async () => {
    await loginMaria();
    await sendMemberEvent(event('suspended', new Date(Date.now() + 1000)));
    const log = await prisma.auditLog.findFirst({ where: { action: 'erp.member.status' } });
    expect(log?.payload).toMatchObject({ from: 'active', to: 'suspended' });
  });

  it('valida el cuerpo del evento', async () => {
    const res = await sendMemberEvent({ event: 'member.updated', member: { id: '' } });
    expect(res.status).toBe(400);
  });

  it('si el ERP no responde en el login, falla cerrado con 503', async () => {
    const broken = new FakeErpAdapter();
    broken.validateCredentials = async () => {
      throw new Error('ECONNREFUSED');
    };
    const original = erp.validateCredentials.bind(erp);
    erp.validateCredentials = broken.validateCredentials.bind(broken);
    try {
      const res = await request(server())
        .post('/auth/login')
        .send({ username: 'maria.lopez', password: 'gym-1234' });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('ERP_UNAVAILABLE');
    } finally {
      erp.validateCredentials = original;
    }
  });
});
