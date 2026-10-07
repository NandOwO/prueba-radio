import { Injectable } from '@nestjs/common';
import type { Track } from '@pulsofm/shared';
import { PrismaService } from '../prisma.service';

/** Reglas de bloqueo que aplican a una canción. Devuelve el motivo o null si no coincide. */
export function matchBlocklist(
  track: Pick<Track, 'providerTrackId' | 'title' | 'artist'>,
  rules: { type: string; value: string; reason: string | null }[],
): string | null {
  const title = track.title.toLowerCase();
  const artist = track.artist.toLowerCase();
  for (const rule of rules) {
    const value = rule.value.trim().toLowerCase();
    const hit =
      (rule.type === 'track' && rule.value === track.providerTrackId) ||
      (rule.type === 'artist' && value === artist) ||
      (rule.type === 'keyword' &&
        value.length > 0 &&
        (title.includes(value) || artist.includes(value)));
    if (hit) return rule.reason ?? 'Esta canción no está permitida en la radio';
  }
  return null;
}

@Injectable()
export class BlocklistService {
  constructor(private readonly prisma: PrismaService) {}

  async matchTrack(
    track: Pick<Track, 'providerTrackId' | 'title' | 'artist'>,
  ): Promise<string | null> {
    const rules = await this.prisma.blocklist.findMany({
      select: { type: true, value: true, reason: true },
    });
    return matchBlocklist(track, rules);
  }

  /** Motivo del bloqueo activo del socio, o null si puede pedir canciones. */
  async activeUserBlock(userId: string, now: Date = new Date()): Promise<string | null> {
    const block = await this.prisma.userBlock.findFirst({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: 'desc' },
    });
    if (!block) return null;
    return block.reason ?? 'Tu acceso a solicitar canciones está bloqueado. Contacta a recepción.';
  }
}
