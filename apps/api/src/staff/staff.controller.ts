import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../requests/queue.service';
import { StaffService } from './staff.service';

type AuthedRequest = FastifyRequest & { user: CurrentUser };

const reasonSchema = z.object({ reason: z.string().trim().min(1).max(200).optional() }).default({});
const moveSchema = z.object({ direction: z.enum(['up', 'down']) });
const blockRuleSchema = z.object({
  type: z.enum(['track', 'artist', 'keyword']),
  value: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(200).optional(),
});
const userBlockSchema = z.object({
  reason: z.string().trim().min(3).max(200),
  minutes: z
    .number()
    .int()
    .positive()
    .max(60 * 24 * 365)
    .optional(),
});
const searchSchema = z.object({ q: z.string().trim().max(100).optional() });
const auditSchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('staff', 'admin')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
  ) {}

  /** Cola con el nombre completo de quien pidió cada canción. */
  @Get('staff/queue')
  queueForStaff() {
    return this.queue.snapshot({ fullNames: true });
  }

  @Get('staff/ping')
  ping(@Req() req: AuthedRequest) {
    return { ok: true, role: req.user.role };
  }

  @Post('staff/queue/skip')
  @HttpCode(200)
  skip(@Req() req: AuthedRequest) {
    return this.staff.skipCurrent(req.user.id);
  }

  @Post('staff/requests/:id/remove')
  @HttpCode(204)
  remove(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reasonSchema)) body: z.infer<typeof reasonSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.staff.removeQueued(req.user.id, id, body.reason);
  }

  @Post('staff/requests/:id/move')
  @HttpCode(204)
  move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveSchema)) body: z.infer<typeof moveSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.staff.move(req.user.id, id, body.direction);
  }

  @Get('staff/blocklist')
  listBlocklist() {
    return this.staff.listBlocklist();
  }

  @Post('staff/blocklist')
  @HttpCode(201)
  addRule(
    @Body(new ZodValidationPipe(blockRuleSchema)) body: z.infer<typeof blockRuleSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.staff.addBlockRule(req.user.id, body);
  }

  @Delete('staff/blocklist/:id')
  @HttpCode(204)
  removeRule(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.staff.removeBlockRule(req.user.id, id);
  }

  @Get('staff/users')
  listUsers(@Query(new ZodValidationPipe(searchSchema)) query: z.infer<typeof searchSchema>) {
    return this.staff.listUsers(query.q ?? '');
  }

  @Post('staff/users/:id/block')
  @HttpCode(204)
  blockUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userBlockSchema)) body: z.infer<typeof userBlockSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.staff.blockUser(req.user.id, id, body);
  }

  @Delete('staff/users/:id/block')
  @HttpCode(204)
  unblockUser(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.staff.unblockUser(req.user.id, id);
  }

  /** Registro de acciones del staff: solo para administradores. */
  @Get('admin/audit')
  @Roles('admin')
  auditLog(@Query(new ZodValidationPipe(auditSchema)) query: z.infer<typeof auditSchema>) {
    return this.audit.list(query.limit);
  }
}
