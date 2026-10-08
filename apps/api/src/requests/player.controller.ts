import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PlaybackService } from './playback.service';
import { QueueService } from './queue.service';

/**
 * Control de la reproducción. Lo usan la pantalla del gimnasio (rol display)
 * y el staff. Cada cambio se difunde a todos por el canal de la cola.
 */
@Controller('player')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('display', 'staff', 'admin')
export class PlayerController {
  constructor(
    private readonly queue: QueueService,
    private readonly playback: PlaybackService,
  ) {}

  /** Termina la canción actual y empieza la siguiente de la cola. */
  @Post('next')
  @HttpCode(200)
  next() {
    return this.queue.advance();
  }

  @Post('pause')
  @HttpCode(200)
  async pause() {
    await this.playback.setPaused(true);
    this.queue.notifyChanged();
    return this.queue.snapshot();
  }

  @Post('resume')
  @HttpCode(200)
  async resume() {
    await this.playback.setPaused(false);
    this.queue.notifyChanged();
    return this.queue.snapshot();
  }
}
