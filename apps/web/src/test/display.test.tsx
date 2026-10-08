import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplayPage } from '../pages/DisplayPage';
import type { QueueSnapshot } from '../realtime/useQueue';

const snapshot: QueueSnapshot = {
  previous: [],
  current: {
    id: 'r1',
    status: 'playing',
    position: 1,
    track: {
      id: 't1',
      providerTrackId: 'v1',
      title: 'Suena ahora',
      artist: 'Banda',
      durationMs: 1000,
      coverUrl: null,
    },
    requestedBy: 'María',
  },
  upcoming: [],
  paused: false,
};

const hoisted = vi.hoisted(() => ({
  snapshot: null as unknown,
  player: null as null | {
    load: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    progress: () => { current: number; duration: number };
    destroy: ReturnType<typeof vi.fn>;
  },
  handlers: null as null | { onReady(): void; onEnded(): void; onError(): void },
}));

vi.mock('../realtime/useQueue', () => ({
  useQueue: () => ({ snapshot: hoisted.snapshot, connected: true }),
}));

vi.mock('../display/youtube', () => ({
  createYouTubePlayer: async (
    _el: HTMLElement,
    handlers: { onReady(): void; onEnded(): void; onError(): void },
  ) => {
    hoisted.handlers = handlers;
    hoisted.player = {
      load: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      progress: () => ({ current: 0, duration: 0 }),
      destroy: vi.fn(),
    };
    return hoisted.player;
  },
}));

describe('Pantalla del gimnasio', () => {
  beforeEach(() => {
    hoisted.snapshot = snapshot;
    hoisted.player = null;
    hoisted.handlers = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(snapshot), { status: 200 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('pide iniciar la radio y luego carga la canción actual', async () => {
    render(
      <MemoryRouter>
        <DisplayPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Suena ahora')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar radio' }));
    await waitFor(() => expect(hoisted.handlers).not.toBeNull());
    act(() => hoisted.handlers!.onReady());

    await waitFor(() => expect(hoisted.player!.load).toHaveBeenCalledWith('v1'));
    expect(hoisted.player!.play).toHaveBeenCalled();
  });

  it('pide la siguiente canción al terminar la actual', async () => {
    render(
      <MemoryRouter>
        <DisplayPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar radio' }));
    await waitFor(() => expect(hoisted.handlers).not.toBeNull());

    act(() => hoisted.handlers!.onEnded());

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/player/next',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
