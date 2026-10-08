import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/roles.decorator';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ErpSignatureGuard } from './erp-signature.guard';
import { MembersSyncService } from './members-sync.service';

const memberEventSchema = z.object({
  event: z.literal('member.updated'),
  member: z.object({
    id: z.string().min(1).max(64),
    fullName: z.string().trim().min(1).max(200),
    username: z.string().trim().min(1).max(100).optional(),
    status: z.enum(['active', 'suspended', 'inactive']),
    updatedAt: z.coerce.date(),
  }),
});

@Controller('integrations/erp')
export class ErpIntegrationsController {
  constructor(
    private readonly sync: MembersSyncService,
    private readonly audit: AuditService,
  ) {}

  @Post('members')
  @HttpCode(200)
  @UseGuards(ErpSignatureGuard)
  async member(
    @Body(new ZodValidationPipe(memberEventSchema)) body: z.infer<typeof memberEventSchema>,
  ) {
    const outcome = await this.sync.applyMember({
      externalId: body.member.id,
      fullName: body.member.fullName,
      username: body.member.username ?? body.member.id,
      status: body.member.status,
      updatedAt: body.member.updatedAt,
    });
    return { outcome };
  }
}

/** Disparo manual de la sincronización (administradores). */
@Controller('admin/erp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ErpAdminController {
  constructor(
    private readonly sync: MembersSyncService,
    private readonly audit: AuditService,
  ) {}

  @Post('sync')
  @HttpCode(200)
  async syncNow(@Req() req: FastifyRequest & { user: CurrentUser }) {
    const report = await this.sync.syncFromErp();
    await this.audit.record({
      actorId: req.user.id,
      action: 'erp.sync',
      entity: 'erp',
      payload: { ...report },
    });
    return report;
  }
}
