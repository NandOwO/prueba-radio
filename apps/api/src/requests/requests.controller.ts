import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RequestsService } from './requests.service';

const createRequestSchema = z.object({ trackId: z.string().min(1).max(64) });

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createRequestSchema)) body: z.infer<typeof createRequestSchema>,
    @Req() req: FastifyRequest & { user: CurrentUser },
  ) {
    return { request: await this.requests.create(req.user.id, body.trackId) };
  }

  @Get('mine')
  async mine(@Req() req: FastifyRequest & { user: CurrentUser }) {
    return this.requests.mine(req.user.id);
  }
}
