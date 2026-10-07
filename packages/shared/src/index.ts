export const ROLES = ['member', 'staff', 'admin', 'display'] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_STATUSES = ['active', 'suspended', 'inactive'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const REQUEST_STATUSES = [
  'queued',
  'playing',
  'played',
  'skipped',
  'removed',
  'blocked',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';
