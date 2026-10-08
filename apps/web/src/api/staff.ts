import { apiFetch } from './client';
import type { QueueSnapshot } from '../realtime/useQueue';

export type BlockType = 'track' | 'artist' | 'keyword';

export interface BlockRule {
  id: string;
  type: BlockType;
  value: string;
  reason: string | null;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  block: { reason: string | null; expiresAt: string | null } | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: string;
}

export const getStaffQueue = () => apiFetch<QueueSnapshot>('/staff/queue');
export const skipCurrent = () => apiFetch<QueueSnapshot>('/staff/queue/skip', { method: 'POST' });
export const removeRequest = (id: string, reason?: string) =>
  apiFetch<void>(`/staff/requests/${id}/remove`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
export const moveRequest = (id: string, direction: 'up' | 'down') =>
  apiFetch<void>(`/staff/requests/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  });
export const setPaused = (paused: boolean) =>
  apiFetch<QueueSnapshot>(`/player/${paused ? 'pause' : 'resume'}`, { method: 'POST' });

export const listBlocklist = () => apiFetch<BlockRule[]>('/staff/blocklist');
export const addBlockRule = (type: BlockType, value: string, reason?: string) =>
  apiFetch<BlockRule>('/staff/blocklist', {
    method: 'POST',
    body: JSON.stringify({ type, value, reason }),
  });
export const removeBlockRule = (id: string) =>
  apiFetch<void>(`/staff/blocklist/${id}`, { method: 'DELETE' });

export const searchUsers = (q: string) =>
  apiFetch<StaffUser[]>(`/staff/users?q=${encodeURIComponent(q)}`);
export const blockUser = (id: string, reason: string, minutes?: number) =>
  apiFetch<void>(`/staff/users/${id}/block`, {
    method: 'POST',
    body: JSON.stringify({ reason, minutes }),
  });
export const unblockUser = (id: string) =>
  apiFetch<void>(`/staff/users/${id}/block`, { method: 'DELETE' });

export const listAudit = () => apiFetch<AuditEntry[]>('/admin/audit?limit=100');
