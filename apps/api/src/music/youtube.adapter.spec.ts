import { describe, expect, it, vi } from 'vitest';
import {
  parseIsoDurationMs,
  YouTubeMusicAdapter,
  YOUTUBE_SEARCH_COST,
  YOUTUBE_VIDEOS_COST,
} from './youtube.adapter';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('parseIsoDurationMs', () => {
  it('convierte duraciones ISO 8601 de YouTube', () => {
    expect(parseIsoDurationMs('PT3M45S')).toBe(225_000);
    expect(parseIsoDurationMs('PT1H2M3S')).toBe(3_723_000);
    expect(parseIsoDurationMs('PT45S')).toBe(45_000);
    expect(parseIsoDurationMs('P0D')).toBe(0);
  });

  it('devuelve 0 para formatos que no reconoce', () => {
    expect(parseIsoDurationMs('no-es-duracion')).toBe(0);
  });
});

describe('YouTubeMusicAdapter', () => {
  it('filtra videos no incrustables y los que no son públicos, y cobra la cuota', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/search?')) {
        expect(url).toContain('videoCategoryId=10');
        expect(url).toContain('videoEmbeddable=true');
        return json({
          items: [
            {
              id: { videoId: 'ok1' },
              snippet: {
                title: 'Canción A',
                channelTitle: 'Artista A',
                thumbnails: { high: { url: 'https://img/a.jpg' } },
              },
            },
            {
              id: { videoId: 'bloqueado' },
              snippet: { title: 'Canción B', channelTitle: 'Artista B', thumbnails: {} },
            },
            {
              id: { videoId: 'privado' },
              snippet: { title: 'Canción C', channelTitle: 'Artista C', thumbnails: {} },
            },
          ],
        });
      }
      return json({
        items: [
          {
            id: 'ok1',
            contentDetails: { duration: 'PT3M30S' },
            status: { embeddable: true, privacyStatus: 'public', uploadStatus: 'processed' },
          },
          {
            id: 'bloqueado',
            contentDetails: { duration: 'PT2M' },
            status: { embeddable: false, privacyStatus: 'public', uploadStatus: 'processed' },
          },
          {
            id: 'privado',
            contentDetails: { duration: 'PT2M' },
            status: { embeddable: true, privacyStatus: 'private', uploadStatus: 'processed' },
          },
        ],
      });
    });
    const charged: number[] = [];
    const adapter = new YouTubeMusicAdapter(
      'key',
      fetchImpl as unknown as typeof fetch,
      async (units) => {
        charged.push(units);
      },
    );

    const tracks = await adapter.search('queen', 10);

    expect(tracks).toEqual([
      {
        provider: 'youtube',
        providerTrackId: 'ok1',
        title: 'Canción A',
        artist: 'Artista A',
        durationMs: 210_000,
        coverUrl: 'https://img/a.jpg',
      },
    ]);
    expect(charged).toEqual([YOUTUBE_SEARCH_COST, YOUTUBE_VIDEOS_COST]);
  });

  it('no pide detalles si la búsqueda no devuelve resultados', async () => {
    const fetchImpl = vi.fn(async () => json({ items: [] }));
    const adapter = new YouTubeMusicAdapter('key', fetchImpl as unknown as typeof fetch);
    expect(await adapter.search('nada')).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('lanza error si YouTube responde con fallo', async () => {
    const adapter = new YouTubeMusicAdapter('key', (async () =>
      json({}, 403)) as unknown as typeof fetch);
    await expect(adapter.search('x')).rejects.toThrow('YOUTUBE_HTTP_403');
  });
});
