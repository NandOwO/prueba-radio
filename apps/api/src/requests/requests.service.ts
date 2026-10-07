import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';
import { loadConfig } from '../config';
import { PrismaService } from '../prisma.service';
import { BlocklistService } from './blocklist.service';
import { evaluateRequestLimits } from './request-limits';

const ACTIVE_STATUSES = ['queued', 'playing'];

export interface CreatedRequest {
  id: string;
  status: string;
  position: number;
  track: { id: string; title: string; artist: string };
  createdAt: Date;
}

@Injectable()
export class RequestsService {
  private readonly limits = loadConfig().requestLimit;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blocklist: BlocklistService,
  ) {}

  /**
   * Crea una solicitud. Entra a la cola automáticamente.
   * La comprobación de límites y la inserción van en la misma transacción, con el socio bloqueado
   * (FOR UPDATE), para que dos peticiones simultáneas no superen el límite.
   */
  async create(userId: string, trackId: string): Promise<CreatedRequest> {
    const userBlock = await this.blocklist.activeUserBlock(userId);
    if (userBlock) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'USER_REQUESTS_BLOCKED', userBlock);
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

      const now = new Date();
      const counted = await tx.request.findMany({
        where: { userId, status: { not: 'blocked' } },
        orderBy: { createdAt: 'desc' },
        take: this.limits.maxInWindow + 1,
        select: { createdAt: true },
      });
      const verdict = evaluateRequestLimits(
        now,
        counted.map((r) => r.createdAt),
        this.limits,
      );
      if (!verdict.allowed) {
        const message =
          verdict.code === 'REQUEST_COOLDOWN'
            ? 'Espera un poco antes de pedir otra canción'
            : 'Llegaste al límite de solicitudes por ahora';
        throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, verdict.code, message, {
          retryAfterSeconds: verdict.retryAfterSeconds,
          nextAllowedAt: verdict.nextAllowedAt,
        });
      }

      const track = await tx.track.findUnique({ where: { id: trackId } });
      if (!track) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'TRACK_NOT_FOUND', 'La canción no existe');
      }

      const blockedReason = await this.blocklist.matchTrack(track);
      if (blockedReason) {
        // Se guarda para auditoría, pero no cuenta para los límites ni entra a la cola.
        await tx.request.create({
          data: { userId, trackId, position: 0, status: 'blocked', reason: blockedReason },
        });
        return { blocked: true as const, reason: blockedReason };
      }

      const last = await tx.request.aggregate({
        where: { status: { in: ACTIVE_STATUSES } },
        _max: { position: true },
      });
      const request = await tx.request.create({
        data: { userId, trackId, position: (last._max.position ?? 0) + 1, status: 'queued' },
      });

      return {
        blocked: false as const,
        request: {
          id: request.id,
          status: request.status,
          position: request.position,
          track: { id: track.id, title: track.title, artist: track.artist },
          createdAt: request.createdAt,
        },
      };
    });

    if (outcome.blocked) {
      throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'TRACK_BLOCKED', outcome.reason);
    }
    return outcome.request;
  }

  /** Solicitudes del socio y sus límites restantes. */
  async mine(userId: string) {
    const now = new Date();
    const [items, recent] = await Promise.all([
      this.prisma.request.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { track: { select: { id: true, title: true, artist: true, coverUrl: true } } },
      }),
      this.prisma.request.findMany({
        where: { userId, status: { not: 'blocked' } },
        orderBy: { createdAt: 'desc' },
        take: this.limits.maxInWindow + 1,
        select: { createdAt: true },
      }),
    ]);

    const verdict = evaluateRequestLimits(
      now,
      recent.map((r) => r.createdAt),
      this.limits,
    );
    // Puesto actual: cuántas canciones en cola van antes que esta, más uno.
    const queued = await this.prisma.request.findMany({
      where: { status: 'queued' },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const queuePlace = new Map(queued.map((q, index) => [q.id, index + 1]));

    return {
      items: items.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        track: r.track,
        queuePosition: queuePlace.get(r.id) ?? null,
      })),
      limits: {
        remaining: verdict.remaining,
        maxInWindow: this.limits.maxInWindow,
        windowMinutes: this.limits.windowMinutes,
        cooldownMinutes: this.limits.cooldownMinutes,
        nextAllowedAt: verdict.nextAllowedAt,
      },
    };
  }
}
