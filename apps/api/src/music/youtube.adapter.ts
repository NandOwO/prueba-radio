import type { MusicProvider, Track } from '@pulsofm/shared';

/** Categoría "Música" de YouTube. */
const MUSIC_CATEGORY_ID = '10';
const API = 'https://www.googleapis.com/youtube/v3';

/** Coste en unidades de cuota: search.list = 100, videos.list = 1. */
export const YOUTUBE_SEARCH_COST = 100;
export const YOUTUBE_VIDEOS_COST = 1;

interface SearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
}

interface VideoItem {
  id: string;
  contentDetails: { duration: string };
  status: { embeddable: boolean; privacyStatus: string; uploadStatus: string };
}

/** Convierte duraciones ISO 8601 de YouTube (PT3M45S) a milisegundos. */
export function parseIsoDurationMs(iso: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso);
  if (!match) return 0;
  const [, d = '0', h = '0', m = '0', s = '0'] = match;
  return Math.round((Number(d) * 86400 + Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000);
}

/** Adaptador de YouTube Data API v3 (búsqueda gratuita con cuota diaria). */
export class YouTubeMusicAdapter implements MusicProvider {
  readonly name = 'youtube';

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    /** Se llama con el coste de cada petición para llevar la cuota diaria. */
    private readonly onQuotaUsed: (units: number) => Promise<void> = async () => undefined,
  ) {}

  async search(query: string, limit = 10): Promise<Track[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: String(Math.min(limit, 25)),
      videoCategoryId: MUSIC_CATEGORY_ID,
      // Filtra en origen los videos que no se pueden incrustar en el reproductor.
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      key: this.apiKey,
    });
    const search = await this.get<{ items?: SearchItem[] }>(
      `/search?${params}`,
      YOUTUBE_SEARCH_COST,
    );
    const ids = (search.items ?? []).map((i) => i.id.videoId).filter(Boolean);
    if (ids.length === 0) return [];

    const videos = await this.get<{ items?: VideoItem[] }>(
      `/videos?${new URLSearchParams({ part: 'contentDetails,status', id: ids.join(','), key: this.apiKey })}`,
      YOUTUBE_VIDEOS_COST,
    );
    const valid = new Map(
      (videos.items ?? [])
        .filter(
          (v) =>
            v.status.embeddable &&
            v.status.privacyStatus === 'public' &&
            v.status.uploadStatus === 'processed',
        )
        .map((v) => [v.id, parseIsoDurationMs(v.contentDetails.duration)]),
    );

    return (search.items ?? [])
      .filter((i) => valid.has(i.id.videoId) && valid.get(i.id.videoId)! > 0)
      .map((i) => ({
        provider: this.name,
        providerTrackId: i.id.videoId,
        title: i.snippet.title,
        artist: i.snippet.channelTitle,
        durationMs: valid.get(i.id.videoId)!,
        coverUrl:
          i.snippet.thumbnails?.high?.url ??
          i.snippet.thumbnails?.medium?.url ??
          i.snippet.thumbnails?.default?.url ??
          null,
      }));
  }

  private async get<T>(pathAndQuery: string, cost: number): Promise<T> {
    await this.onQuotaUsed(cost);
    const res = await this.fetchImpl(`${API}${pathAndQuery}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`YOUTUBE_HTTP_${res.status}`);
    }
    return (await res.json()) as T;
  }
}
