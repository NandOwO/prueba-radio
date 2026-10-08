import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import { RequireRole } from '../components/RequireRole';
import { StaffPage } from '../pages/StaffPage';

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const item = (id: string, title: string, requestedBy: string) => ({
  id,
  status: 'queued',
  position: 1,
  track: {
    id: `t-${id}`,
    providerTrackId: `v-${id}`,
    title,
    artist: 'Banda',
    durationMs: 1000,
    coverUrl: null,
  },
  requestedBy,
});

const snapshot = {
  previous: [],
  current: item('c1', 'Suena ahora', 'Ana Ruiz'),
  upcoming: [item('u1', 'Próxima', 'María López')],
  paused: false,
};

const hoisted = vi.hoisted(() => ({
  live: { snapshot: { previous: [], current: null, upcoming: [], paused: false } } as unknown,
}));
vi.mock('../realtime/useQueue', () => ({
  useQueue: () => ({ snapshot: hoisted.live.snapshot, connected: true }),
}));

describe('Panel de staff', () => {
  beforeEach(() => setAccessToken('token'));
  afterEach(() => vi.unstubAllGlobals());

  it('muestra la cola con el nombre completo de quien pidió cada canción', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/staff/queue') return json(200, snapshot);
        if (url === '/staff/blocklist') return json(200, []);
        if (url.startsWith('/staff/users')) return json(200, []);
        return json(401, { code: 'SESSION_EXPIRED' });
      }),
    );

    render(
      <AuthProvider>
        <MemoryRouter>
          <StaffPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Próxima')).toBeInTheDocument();
    expect(screen.getByText(/pedida por María López/)).toBeInTheDocument();
    expect(screen.getByText('Suena ahora')).toBeInTheDocument();
  });

  it('salta la canción que suena al pulsar Saltar', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/staff/queue') return json(200, snapshot);
      if (url === '/staff/queue/skip' && init?.method === 'POST') return json(200, snapshot);
      if (url === '/staff/blocklist') return json(200, []);
      if (url.startsWith('/staff/users')) return json(200, []);
      return json(401, { code: 'SESSION_EXPIRED' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <MemoryRouter>
          <StaffPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Saltar' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/staff/queue/skip',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('añade una regla de bloqueo por artista', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/staff/queue') return json(200, snapshot);
      if (url === '/staff/blocklist' && init?.method === 'POST') {
        return json(201, {
          id: 'b1',
          type: 'artist',
          value: 'banda',
          reason: null,
          createdAt: new Date().toISOString(),
        });
      }
      if (url === '/staff/blocklist') return json(200, []);
      if (url.startsWith('/staff/users')) return json(200, []);
      return json(401, { code: 'SESSION_EXPIRED' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <MemoryRouter>
          <StaffPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    await userEvent.selectOptions(await screen.findByLabelText('Tipo de regla'), 'artist');
    await userEvent.type(screen.getByLabelText('Canción (ID), artista o palabra'), 'Banda');
    await userEvent.click(screen.getByRole('button', { name: 'Bloquear' }));

    await waitFor(() => expect(screen.getByText('banda')).toBeInTheDocument());
    const post = fetchMock.mock.calls.find(
      ([url, init]) => url === '/staff/blocklist' && init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ type: 'artist', value: 'Banda' });
  });

  it('a un socio normal no le muestra el panel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(401, { code: 'SESSION_EXPIRED' })),
    );
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <AuthProvider>
          <RequireRole roles={['staff', 'admin']}>
            <p>Secreto</p>
          </RequireRole>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText('Secreto')).not.toBeInTheDocument());
  });
});
