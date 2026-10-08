import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** Estado global de la radio: si está en pausa. La canción actual la decide la cola. */
@Injectable()
export class PlaybackService {
  constructor(private readonly prisma: PrismaService) {}

  async isPaused(): Promise<boolean> {
    const state = await this.prisma.playbackState.findUnique({ where: { id: 'singleton' } });
    return state?.paused ?? false;
  }

  async setPaused(paused: boolean): Promise<boolean> {
    const state = await this.prisma.playbackState.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', paused },
      update: { paused },
    });
    return state.paused;
  }
}
