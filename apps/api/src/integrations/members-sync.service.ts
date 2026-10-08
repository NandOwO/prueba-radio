import { Inject, Injectable } from '@nestjs/common';
import type { Member, MemberProvider } from '@pulsofm/shared';
import { AuditService } from '../audit/audit.service';
import { MEMBER_PROVIDER } from '../erp/member-provider.token';
import { PrismaService } from '../prisma.service';

export type SyncOutcome = 'created' | 'updated' | 'ignored';

/** Aplica datos de socios que vienen del ERP (por webhook o por sincronización). */
@Injectable()
export class MembersSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(MEMBER_PROVIDER) private readonly erp: MemberProvider,
  ) {}

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
