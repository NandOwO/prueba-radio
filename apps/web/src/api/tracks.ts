import type { Track } from '@pulsofm/shared';
import { apiFetch } from './client';

export interface TrackWithId extends Track {
  id: string;
}

export async function searchTracks(q: string): Promise<TrackWithId[]> {
  const body = await apiFetch<{ items: TrackWithId[] }>(
    `/tracks/search?q=${encodeURIComponent(q)}`,
  );
  return body.items;
}
