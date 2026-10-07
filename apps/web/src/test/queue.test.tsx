import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueuePage } from '../pages/QueuePage';

type Handler = (...args: unknown[]) => void;
const handlers: Record<string, Handler> = {};

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, fn: Handler) => {
      handlers[event] = fn;
    },
    disconnect: vi.fn(),
    connect: vi.fn(),
    auth: {},
  }),
}));

const item = (id: string, title: string, position: number) => ({
  id,
  status: 'queued',
  position,
  track: { id: `t-${id}`, title, artist: 'Artista', durationMs: 180_000, coverUrl: null },
  requestedBy: 'María',
});

describe('Cola en vivo', () => {
  beforeEach(() => {
    for (const key of Object.keys(handlers)) delete handlers[key];
  });

  it('muestra canción actual, siguientes y anteriores desde el snapshot', async () => {
    render(
      <MemoryRouter>
        <QueuePage />
      </MemoryRouter>,
    );

    act(() => {
      handlers.connect?.();
      handlers['queue:updated']?.({
        previous: [item('p1', 'Anterior uno', 0)],
        current: item('c1', 'Suena ahora', 0),
        upcoming: [item('u1', 'Siguiente uno', 2), item('u2', 'Siguiente dos', 3)],
      });
    });

    expect(await screen.findByText('En vivo')).toBeInTheDocument();
    expect(screen.getByText('Suena ahora')).toBeInTheDocument();
    expect(screen.getByText('Siguiente uno')).toBeInTheDocument();
    expect(screen.getByText('Siguiente dos')).toBeInTheDocument();
    expect(screen.getByText('Anterior uno')).toBeInTheDocument();
    expect(screen.getAllByText('Artista · María')).toHaveLength(4);
  });

  it('muestra un estado vacío cuando no hay canciones siguientes', async () => {
    render(
      <MemoryRouter>
        <QueuePage />
      </MemoryRouter>,
    );
    act(() => {
      handlers['queue:updated']?.({ previous: [], current: null, upcoming: [] });
    });

    expect(await screen.findByText('No hay nada sonando.')).toBeInTheDocument();
    expect(screen.getByText('La cola está vacía. ¡Pide la primera canción!')).toBeInTheDocument();
  });
});
