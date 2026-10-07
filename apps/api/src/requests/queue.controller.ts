import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { QueueService } from './queue.service';

@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Get()
  snapshot() {
    return this.queue.snapshot();
  }
}
