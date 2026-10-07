import { apiFetch } from './client';

export interface RequestLimits {
  remaining: number;
  maxInWindow: number;
  windowMinutes: number;
  cooldownMinutes: number;
  nextAllowedAt: string;
}

export type RequestStatus = 'queued' | 'playing' | 'played' | 'skipped' | 'removed' | 'blocked';

export interface MyRequest {
  id: string;
  status: RequestStatus;
  reason: string | null;
  createdAt: string;
  track: { id: string; title: string; artist: string; coverUrl: string | null };
  queuePosition: number | null;
}

export interface CreatedRequest {
  id: string;
  status: RequestStatus;
  position: number;
  track: { id: string; title: string; artist: string };
}

export function createRequest(trackId: string): Promise<CreatedRequest> {
  return apiFetch<{ request: CreatedRequest }>('/requests', {
    method: 'POST',
    body: JSON.stringify({ trackId }),
  }).then((body) => body.request);
}

export function fetchMyRequests(): Promise<{ items: MyRequest[]; limits: RequestLimits }> {
  return apiFetch('/requests/mine');
}
