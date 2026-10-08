import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
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
  constructor(private readonly sync: MembersSyncService) {}

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
