import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { MusicProvider, Track } from '@pulsofm/shared';
import { ApiError } from '../common/api-error';
import { loadConfig } from '../config';
import { PrismaService } from '../prisma.service';
import { MUSIC_PROVIDER } from './music-provider.token';

/** Track con su id de base de datos, listo para la API. */
export type TrackRow = Track & { id: string };

function toTrackRow(row: {
  id: string;
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  durationMs: number;
  coverUrl: string | null;
}): TrackRow {
  return {
    id: row.id,
    provider: row.provider,
    providerTrackId: row.providerTrackId,
    title: row.title,
    artist: row.artist,
    durationMs: row.durationMs,
    coverUrl: row.coverUrl,
  };
}

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

@Injectable()
export class MusicSearchService {
  private readonly config = loadConfig();

  constructor(
    @Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Busca canciones. Orden de prioridad: caché fresca → proveedor (consume cuota) →
   * caché vencida si el proveedor falla o se agotó la cuota.
   */
  async search(rawQuery: string): Promise<TrackRow[]> {
    const query = normalizeQuery(rawQuery);
    const cached = await this.prisma.searchCache.findUnique({ where: { query } });
    const ttlMs = this.config.searchCacheHours * 3600_000;
    const isFresh = cached !== null && Date.now() - cached.cachedAt.getTime() < ttlMs;

    if (cached && isFresh) {
      return this.loadTracks(cached.trackIds as string[]);
    }

    try {
      const results = await this.provider.search(query, 10);
      const rows = await this.saveTracks(results);
      await this.prisma.searchCache.upsert({
        where: { query },
        create: { query, trackIds: rows.map((r) => r.id) },
        update: { trackIds: rows.map((r) => r.id), cachedAt: new Date() },
      });
      return rows;
    } catch (err) {
      // Si hay resultados anteriores, es mejor mostrarlos que fallar.
      if (cached) return this.loadTracks(cached.trackIds as string[]);
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SEARCH_UNAVAILABLE',
        'La búsqueda no está disponible en este momento',
      );
    }
  }

  private async saveTracks(tracks: Track[]): Promise<TrackRow[]> {
    const rows = await Promise.all(
      tracks.map((t) =>
        this.prisma.track.upsert({
          where: {
            provider_providerTrackId: { provider: t.provider, providerTrackId: t.providerTrackId },
          },
          create: t,
          update: {
            title: t.title,
            artist: t.artist,
            durationMs: t.durationMs,
            coverUrl: t.coverUrl,
            cachedAt: new Date(),
          },
        }),
      ),
    );
    return rows.map(toTrackRow);
  }

  private async loadTracks(ids: string[]): Promise<TrackRow[]> {
    const rows = await this.prisma.track.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((r) => [r.id, toTrackRow(r)]));
    return ids.map((id) => byId.get(id)).filter((r): r is TrackRow => r !== undefined);
  }
}
