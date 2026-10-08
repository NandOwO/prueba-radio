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
import { MembersSyncService, LAST_SYNC_KEY } from '../src/integrations/members-sync.service';

class NoopMusicProvider implements MusicProvider {
  readonly name = 'youtube';
  async search(): Promise<Track[]> {
    return [];
  }
}

describe('Sincronización de respaldo con el ERP', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let erp: FakeErpAdapter;
  let sync: MembersSyncService;
  let adminToken: string;
  let staffToken: string;

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
    sync = app.get(MembersSyncService);
  });

  beforeEach(async () => {
    erp.setStatus('M-10482', 'active', new Date('2026-01-01T00:00:00Z'));
    erp.setStatus('M-10517', 'suspended', new Date('2026-01-01T00:00:00Z'));
    erp.setStatus('M-10601', 'active', new Date('2026-01-01T00:00:00Z'));
    for (const model of ['auditLog', 'setting', 'session', 'user'] as const) {
      await (prisma[model] as unknown as { deleteMany(): Promise<unknown> }).deleteMany();
    }
    const server = app.getHttpServer();
    adminToken = await loginWithRole(server, 'maria.lopez', 'admin');
    staffToken = (
      await request(server).post('/auth/login').send({ username: 'ana.ruiz', password: 'gym-1234' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginWithRole(server: unknown, username: string, role: string): Promise<string> {
    const first = await request(server as never)
      .post('/auth/login')
      .send({ username, password: 'gym-1234' });
    await prisma.user.update({ where: { id: first.body.user.id }, data: { role } });
    const second = await request(server as never)
      .post('/auth/login')
      .send({ username, password: 'gym-1234' });
    return second.body.accessToken as string;
  }

  it('aplica al socio los cambios del ERP y guarda el punto de sincronización', async () => {
    // Un socio que ya existe localmente y que el ERP ha suspendido
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'maria.lopez', password: 'gym-1234' });
    erp.setStatus('M-10482', 'suspended', new Date('2026-10-08T10:00:00Z'));

    const res = await request(app.getHttpServer())
      .post('/admin/erp/sync')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.processed).toBeGreaterThan(0);
    const user = await prisma.user.findUnique({ where: { externalId: 'M-10482' } });
    expect(user?.status).toBe('suspended');
    const checkpoint = await prisma.setting.findUnique({ where: { key: LAST_SYNC_KEY } });
    expect(checkpoint).not.toBeNull();
  });

  it('solo administradores pueden lanzar la sincronización', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/erp/sync')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('no avanza el punto de sincronización si el ERP falla a mitad de la lectura', async () => {
    await prisma.setting.create({
      data: { key: LAST_SYNC_KEY, value: '2026-10-01T00:00:00.000Z' },
    });
    const original = erp.listUpdatedSince.bind(erp);
    erp.listUpdatedSince = async () => {
      throw new Error('ERP_UNAVAILABLE: HTTP 500');
    };
    try {
      await expect(sync.syncFromErp()).rejects.toThrow('ERP_UNAVAILABLE');
      const checkpoint = await prisma.setting.findUnique({ where: { key: LAST_SYNC_KEY } });
      expect(checkpoint?.value).toBe('2026-10-01T00:00:00.000Z');
    } finally {
      erp.listUpdatedSince = original;
    }
  });

  it('recorre todas las páginas del ERP antes de avanzar el punto de sincronización', async () => {
    const pages = [
      {
        items: [
          {
            externalId: 'M-10482',
            fullName: 'María López',
            username: 'maria.lopez',
            status: 'active' as const,
            updatedAt: new Date('2026-10-05T00:00:00Z'),
          },
        ],
        nextCursor: 'siguiente',
      },
      {
        items: [
          {
            externalId: 'M-10601',
            fullName: 'Ana Ruiz',
            username: 'ana.ruiz',
            status: 'active' as const,
            updatedAt: new Date('2026-10-05T00:00:00Z'),
          },
        ],
      },
    ];
    const cursors: (string | undefined)[] = [];
    const original = erp.listUpdatedSince.bind(erp);
    erp.listUpdatedSince = async (_since: Date, cursor?: string) => {
      cursors.push(cursor);
      return pages.shift()!;
    };
    try {
      const report = await sync.syncFromErp(new Date('2026-10-08T12:00:00Z'));
      expect(cursors).toEqual([undefined, 'siguiente']);
      expect(report.processed).toBe(2);
      const checkpoint = await prisma.setting.findUnique({ where: { key: LAST_SYNC_KEY } });
      expect(checkpoint?.value).toBe('2026-10-08T11:59:00.000Z');
    } finally {
      erp.listUpdatedSince = original;
    }
  });
});
