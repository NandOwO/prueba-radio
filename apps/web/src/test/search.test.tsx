import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import { SearchPage } from '../pages/SearchPage';

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SONG = {
  id: 'trk1',
  provider: 'youtube',
  providerTrackId: 'abc',
  title: 'Don’t Stop Me Now',
  artist: 'Queen',
  durationMs: 209_000,
  coverUrl: null,
};

function renderSearch() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/search']}>
        <SearchPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('Buscador de canciones', () => {
  beforeEach(() => setAccessToken('token'));
  afterEach(() => vi.unstubAllGlobals());

  it('muestra canciones con título, artista y duración', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('/tracks/search')) return json(200, { items: [SONG] });
      return json(401, { code: 'SESSION_EXPIRED' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderSearch();
    await userEvent.type(screen.getByLabelText('Canción o artista'), 'queen');

    expect(await screen.findByText('Don’t Stop Me Now')).toBeInTheDocument();
    expect(screen.getByText('Queen')).toBeInTheDocument();
    expect(screen.getByText('3:29')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/tracks/search?q=queen',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('no busca con menos de dos letras', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/tracks/search')
        ? json(200, { items: [] })
        : json(401, { code: 'SESSION_EXPIRED' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderSearch();
    await userEvent.type(screen.getByLabelText('Canción o artista'), 'q');

    expect(screen.getByText('Escribe al menos 2 letras.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    const searchCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).startsWith('/tracks/search'),
    );
    expect(searchCalls).toHaveLength(0);
  });

  it('muestra el mensaje de cuota agotada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(503, { code: 'SEARCH_QUOTA_EXHAUSTED' })),
    );

    renderSearch();
    await userEvent.type(screen.getByLabelText('Canción o artista'), 'queen');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Hoy se agotaron las búsquedas.'),
    );
  });
});
