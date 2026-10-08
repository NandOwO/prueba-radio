import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { PrismaService } from '../prisma.service';
import { PlaybackService } from './playback.service';

export const PREVIOUS_LIMIT = 5;

export interface QueueItem {
  id: string;
  status: string;
  position: number;
  track: {
    id: string;
    providerTrackId: string;
    title: string;
    artist: string;
    durationMs: number;
    coverUrl: string | null;
  };
  requestedBy: string;
}

export interface QueueSnapshot {
  previous: QueueItem[];
  current: QueueItem | null;
  upcoming: QueueItem[];
  paused: boolean;
}

/** Primer nombre del socio. La cola es visible para todos los socios, así que no mostramos el apellido. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

@Injectable()
export class QueueService {
  /** Se emite "changed" cada vez que cambia la cola. Lo escucha el canal de tiempo real. */
  readonly changes = new EventEmitter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly playback: PlaybackService,
  ) {}

  /** Si no hay canción sonando, pone la primera de la cola en reproducción. */
  async ensurePlaying(tx: Pick<PrismaService, 'request'> = this.prisma): Promise<void> {
    const playing = await tx.request.findFirst({
      where: { status: 'playing' },
      select: { id: true },
    });
    if (playing) return;
    const next = await tx.request.findFirst({
      where: { status: 'queued' },
      orderBy: { position: 'asc' },
    });
    if (next) await tx.request.update({ where: { id: next.id }, data: { status: 'playing' } });
  }

  notifyChanged(): void {
    this.changes.emit('changed');
  }

  /** Por defecto solo el primer nombre de quien pidió. El staff ve el nombre completo. */
  async snapshot(options: { fullNames?: boolean } = {}): Promise<QueueSnapshot> {
    const [previousRows, currentRow, upcomingRows] = await Promise.all([
      this.prisma.request.findMany({
        where: { status: { in: ['played', 'skipped'] } },
        orderBy: { playedAt: 'desc' },
        take: PREVIOUS_LIMIT,
        include: { track: true, user: true },
      }),
      this.prisma.request.findFirst({
        where: { status: 'playing' },
        include: { track: true, user: true },
      }),
      this.prisma.request.findMany({
        where: { status: 'queued' },
        orderBy: { position: 'asc' },
        include: { track: true, user: true },
      }),
    ]);

    const toItem = (r: (typeof upcomingRows)[number]): QueueItem => ({
      id: r.id,
      status: r.status,
      position: r.position,
      track: {
        id: r.track.id,
        providerTrackId: r.track.providerTrackId,
        title: r.track.title,
        artist: r.track.artist,
        durationMs: r.track.durationMs,
        coverUrl: r.track.coverUrl,
      },
      requestedBy: options.fullNames ? r.user.name : firstName(r.user.name),
    });

    return {
      // Del más reciente al más antiguo, para mostrar "lo que sonó hace poco" arriba.
      previous: previousRows.map(toItem),
      current: currentRow ? toItem(currentRow) : null,
      upcoming: upcomingRows.map(toItem),
      paused: await this.playback.isPaused(),
    };
  }

  /**
   * Termina la canción actual (played o skipped) y pone la siguiente en reproducción.
   * Lo usará el reproductor (Fase 4) y el staff para saltar (Fase 6).
   */
  async advance(options: { skipped?: boolean; decidedBy?: string } = {}): Promise<QueueSnapshot> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({ where: { status: 'playing' } });
      if (current) {
        await tx.request.update({
          where: { id: current.id },
          data: {
            status: options.skipped ? 'skipped' : 'played',
            playedAt: new Date(),
            decidedBy: options.decidedBy ?? null,
          },
        });
      }
      const next = await tx.request.findFirst({
        where: { status: 'queued' },
        orderBy: { position: 'asc' },
      });
      if (next) {
        await tx.request.update({ where: { id: next.id }, data: { status: 'playing' } });
      }
    });
    this.notifyChanged();
    return this.snapshot();
  }
}
