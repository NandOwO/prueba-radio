import { DEFAULT_LOCALE, LOCALES, MEMBER_STATUSES, REQUEST_STATUSES, ROLES } from './index';
import { describe, expect, it } from 'vitest';

describe('shared constants', () => {
  it('defines the roles used by the API guards', () => {
    expect(ROLES).toEqual(['member', 'staff', 'admin', 'display']);
  });

  it('only accepts active members to use the app', () => {
    expect(MEMBER_STATUSES).toContain('active');
    expect(MEMBER_STATUSES).toContain('suspended');
  });

  it('includes every request state of the queue', () => {
    expect(REQUEST_STATUSES).toEqual([
      'queued',
      'playing',
      'played',
      'skipped',
      'removed',
      'blocked',
    ]);
  });

  it('uses Spanish as default locale and supports English', () => {
    expect(DEFAULT_LOCALE).toBe('es');
    expect(LOCALES).toContain('en');
  });
});
