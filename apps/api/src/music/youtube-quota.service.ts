import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';
import { loadConfig } from '../config';
import { PrismaService } from '../prisma.service';

/** YouTube reinicia la cuota a medianoche hora del Pacífico. */
export function quotaDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

@Injectable()
export class YouTubeQuotaService {
  private readonly limit = loadConfig().youtubeDailyQuota;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserva unidades antes de llamar a YouTube. Si el día supera el límite,
   * revierte la reserva y lanza SEARCH_QUOTA_EXHAUSTED.
   */
  async reserve(units: number, now: Date = new Date()): Promise<void> {
    const day = quotaDay(now);
    const row = await this.prisma.quotaUsage.upsert({
      where: { day },
      create: { day, units },
      update: { units: { increment: units } },
    });
    if (row.units > this.limit) {
      await this.prisma.quotaUsage.update({
        where: { day },
        data: { units: { decrement: units } },
      });
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SEARCH_QUOTA_EXHAUSTED',
        'Se alcanzó el límite diario de búsquedas. Intenta más tarde.',
      );
    }
  }

  async usedToday(now: Date = new Date()): Promise<number> {
    const row = await this.prisma.quotaUsage.findUnique({ where: { day: quotaDay(now) } });
    return row?.units ?? 0;
  }
}
