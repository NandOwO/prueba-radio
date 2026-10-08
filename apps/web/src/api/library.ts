import { apiFetch } from './client';

export interface PlaylistSummary {
  id: string;
  name: string;
  trackCount: number;
}

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  coverUrl: string | null;
}

export interface PlaylistDetail {
  id: string;
  name: string;
  items: LibraryTrack[];
}

export interface SaveState {
  favorite: boolean;
  playlistIds: string[];
}

export const listPlaylists = () => apiFetch<PlaylistSummary[]>('/library/playlists');
export const createPlaylist = (name: string) =>
  apiFetch<PlaylistSummary>('/library/playlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
export const getPlaylist = (id: string) => apiFetch<PlaylistDetail>(`/library/playlists/${id}`);
export const renamePlaylist = (id: string, name: string) =>
  apiFetch<{ id: string; name: string }>(`/library/playlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
export const deletePlaylist = (id: string) =>
  apiFetch<void>(`/library/playlists/${id}`, { method: 'DELETE' });
export const addToPlaylist = (playlistId: string, trackId: string) =>
  apiFetch<void>(`/library/playlists/${playlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({ trackId }),
  });
export const removeFromPlaylist = (playlistId: string, trackId: string) =>
  apiFetch<void>(`/library/playlists/${playlistId}/items/${trackId}`, { method: 'DELETE' });
export const listFavorites = () => apiFetch<LibraryTrack[]>('/library/favorites');
export const setFavorite = (trackId: string, on: boolean) =>
  apiFetch<void>(`/library/favorites/${trackId}`, { method: on ? 'PUT' : 'DELETE' });
export const getSaveState = (trackId: string) =>
  apiFetch<SaveState>(`/library/tracks/${trackId}/save-state`);
