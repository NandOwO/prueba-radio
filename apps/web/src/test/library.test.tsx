import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../api/client';
import { SavePanel } from '../components/SavePanel';
import { LibraryPage } from '../pages/LibraryPage';

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Guardar canción', () => {
  beforeEach(() => setAccessToken('token'));
  afterEach(() => vi.unstubAllGlobals());

  it('marca la canción como favorita y la añade a una playlist', async () => {
    const calls: { url: string; method: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        calls.push({ url, method });
        if (url === '/library/playlists' && method === 'GET') {
          return json(200, [{ id: 'pl1', name: 'Cardio', trackCount: 2 }]);
        }
        if (url === '/library/tracks/t1/save-state')
          return json(200, { favorite: false, playlistIds: [] });
        return json(204, undefined);
      }),
    );

    render(<SavePanel trackId="t1" title="Suena ahora" onClose={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: /Favoritos/ }));
    await userEvent.click(screen.getByRole('button', { name: /Cardio/ }));

    await waitFor(() => {
      expect(calls).toContainEqual({ url: '/library/favorites/t1', method: 'PUT' });
      expect(calls).toContainEqual({ url: '/library/playlists/pl1/items', method: 'POST' });
    });
  });

  it('muestra en la biblioteca favoritos y playlists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/library/favorites') {
          return json(200, [
            { id: 't1', title: 'Favorita', artist: 'Banda', durationMs: 1000, coverUrl: null },
          ]);
        }
        if (url === '/library/playlists')
          return json(200, [{ id: 'pl1', name: 'Cardio', trackCount: 3 }]);
        return json(401, { code: 'SESSION_EXPIRED' });
      }),
    );

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Favorita')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    expect(screen.getByText('3 canciones')).toBeInTheDocument();
  });
});
