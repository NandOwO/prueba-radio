import { Inject, Injectable } from '@nestjs/common';
import type { Member, MemberProvider } from '@pulsofm/shared';
import { AuditService } from '../audit/audit.service';
import { MEMBER_PROVIDER } from '../erp/member-provider.token';
import { PrismaService } from '../prisma.service';

export type SyncOutcome = 'created' | 'updated' | 'ignored';

export const LAST_SYNC_KEY = 'erp.lastSyncAt';
/** Margen hacia atrás para no perder cambios por diferencias de reloj. Aplicar dos veces es seguro. */
const SYNC_OVERLAP_MS = 60_000;

export interface SyncReport {
  processed: number;
  created: number;
  updated: number;
  ignored: number;
}

/** Aplica datos de socios que vienen del ERP (por webhook o por sincronización). */
@Injectable()
export class MembersSyncService {
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(MEMBER_PROVIDER) private readonly erp: MemberProvider,
  ) {}

  /**
   * Sincronización de respaldo: lee los socios cambiados desde la última pasada.
   * La fecha solo avanza si todas las páginas se procesaron; si algo falla, la próxima pasada reintenta.
   */
  async syncFromErp(now: Date = new Date()): Promise<SyncReport> {
    if (this.running) return { processed: 0, created: 0, updated: 0, ignored: 0 };
    this.running = true;
    try {
      const stored = await this.prisma.setting.findUnique({ where: { key: LAST_SYNC_KEY } });
      const since = stored ? new Date(stored.value as string) : new Date(0);
      const report: SyncReport = { processed: 0, created: 0, updated: 0, ignored: 0 };

      let cursor: string | undefined;
      do {
        const page = await this.erp.listUpdatedSince(since, cursor);
        for (const member of page.items) {
          const outcome = await this.applyMember(member);
          report.processed += 1;
          report[outcome] += 1;
        }
        cursor = page.nextCursor;
      } while (cursor);

      const next = new Date(now.getTime() - SYNC_OVERLAP_MS).toISOString();
      await this.prisma.setting.upsert({
        where: { key: LAST_SYNC_KEY },
        create: { key: LAST_SYNC_KEY, value: next },
        update: { value: next },
      });
      return report;
    } finally {
      this.running = false;
    }
  }

  async applyMember(member: Member): Promise<SyncOutcome> {
    const existing = await this.prisma.user.findUnique({
      where: { externalId: member.externalId },
    });

    // Un evento más viejo que el dato local no puede pisarlo.
    if (existing?.erpUpdatedAt && existing.erpUpdatedAt >= member.updatedAt) {
      return 'ignored';
    }

    const data = {
      username: member.username,
      name: member.fullName,
      status: member.status,
      erpUpdatedAt: member.updatedAt,
      lastSyncedAt: new Date(),
    };
    const user = await this.prisma.user.upsert({
      where: { externalId: member.externalId },
      create: { externalId: member.externalId, ...data },
      update: data,
    });

    if (member.status !== 'active') {
      // Un socio que deja de estar activo pierde sus sesiones de inmediato.
      await this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (existing?.status !== member.status) {
      await this.audit.record({
        actorId: null,
        action: 'erp.member.status',
        entity: 'user',
        entityId: user.id,
        payload: { from: existing?.status ?? null, to: member.status },
      });
    }
    return existing ? 'updated' : 'created';
  }
}
