import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../auth/current-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

/** Punto de entrada del panel de staff. Las acciones de moderación llegan en la Fase 6. */
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  @Get('ping')
  @Roles('staff', 'admin')
  ping(@Req() req: FastifyRequest & { user: CurrentUser }) {
    return { ok: true, role: req.user.role };
  }
}
