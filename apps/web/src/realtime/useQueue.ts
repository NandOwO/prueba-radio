import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, refreshSession } from '../api/client';

export interface QueueItem {
  id: string;
  status: string;
  position: number;
  track: {
    id: string;
    providerTrackId: string;
    title: string;
    artist: string;
    durationMs: number;
    coverUrl: string | null;
  };
  requestedBy: string;
}

export interface QueueSnapshot {
  previous: QueueItem[];
  current: QueueItem | null;
  upcoming: QueueItem[];
  paused: boolean;
}

export interface QueueState {
  snapshot: QueueSnapshot | null;
  connected: boolean;
}

/**
 * Cola en vivo. Se conecta con el access token; si el servidor rechaza el token,
 * renueva la sesión y vuelve a conectar.
 */
export function useQueue(): QueueState {
  const [state, setState] = useState<QueueState>({ snapshot: null, connected: false });

  useEffect(() => {
    const socket: Socket = io({
      path: '/socket.io',
      auth: { token: getAccessToken() },
      transports: ['websocket'],
    });

    socket.on('connect', () => setState((s) => ({ ...s, connected: true })));
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })));
    socket.on('queue:updated', (snapshot: QueueSnapshot) => setState((s) => ({ ...s, snapshot })));
    socket.on('error', (payload: { code?: string }) => {
      if (payload?.code !== 'UNAUTHENTICATED') return;
      void refreshSession().then((session) => {
        if (!session) return;
        socket.auth = { token: getAccessToken() };
        socket.connect();
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return state;
}
