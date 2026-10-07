import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import { RequestsPage } from '../pages/RequestsPage';
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

describe('Pedir canciones', () => {
  beforeEach(() => setAccessToken('token'));
  afterEach(() => vi.unstubAllGlobals());

  it('pide una canción y muestra su número de orden', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.startsWith('/tracks/search')) return json(200, { items: [SONG] });
        if (url === '/requests' && init?.method === 'POST') {
          return json(201, { request: { id: 'r1', status: 'queued', position: 4, track: SONG } });
        }
        return json(401, { code: 'SESSION_EXPIRED' });
      }),
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/search']}>
          <SearchPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await userEvent.type(screen.getByLabelText('Canción o artista'), 'queen');
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir' }));

    expect(await screen.findByText('#4')).toBeInTheDocument();
  });

  it('explica el cooldown con los minutos que faltan', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.startsWith('/tracks/search')) return json(200, { items: [SONG] });
        return json(429, {
          code: 'REQUEST_COOLDOWN',
          message: 'Espera',
          details: { retryAfterSeconds: 240 },
        });
      }),
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/search']}>
          <SearchPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await userEvent.type(screen.getByLabelText('Canción o artista'), 'queen');
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Espera 4 min para pedir otra canción.'),
    );
  });

  it('muestra mis solicitudes con su estado y los límites restantes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(200, {
          items: [
            {
              id: 'r1',
              status: 'queued',
              reason: null,
              createdAt: new Date().toISOString(),
              track: SONG,
              queuePosition: 2,
            },
            {
              id: 'r2',
              status: 'blocked',
              reason: 'Letra explícita',
              createdAt: new Date().toISOString(),
              track: SONG,
              queuePosition: null,
            },
          ],
          limits: {
            remaining: 3,
            maxInWindow: 5,
            windowMinutes: 30,
            cooldownMinutes: 6,
            nextAllowedAt: new Date().toISOString(),
          },
        }),
      ),
    );

    render(
      <AuthProvider>
        <MemoryRouter>
          <RequestsPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('En cola · puesto 2')).toBeInTheDocument();
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Letra explícita')).toBeInTheDocument();
    expect(screen.getByText(/Te quedan 3 de 5 solicitudes cada 30 min/)).toBeInTheDocument();
  });
});
