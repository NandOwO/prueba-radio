import { describe, expect, it } from 'vitest';
import { evaluateRequestLimits, type RequestLimitConfig } from './request-limits';

const cfg: RequestLimitConfig = { windowMinutes: 30, maxInWindow: 5, cooldownMinutes: 6 };
const min = (n: number) => n * 60_000;
const now = new Date('2026-10-07T12:00:00Z');
const ago = (minutes: number) => new Date(now.getTime() - min(minutes));

describe('evaluateRequestLimits', () => {
  it('permite la primera solicitud', () => {
    const v = evaluateRequestLimits(now, [], cfg);
    expect(v).toMatchObject({ allowed: true, remaining: 5 });
  });

  it('bloquea por cooldown si la última fue hace menos de 6 min', () => {
    const v = evaluateRequestLimits(now, [ago(2)], cfg);
    expect(v).toMatchObject({ allowed: false, code: 'REQUEST_COOLDOWN', retryAfterSeconds: 240 });
  });

  it('permite de nuevo tras 6 min de la última', () => {
    const v = evaluateRequestLimits(now, [ago(6)], cfg);
    expect(v).toMatchObject({ allowed: true, remaining: 4 });
  });

  it('bloquea al llegar a 5 en 30 min, aunque el cooldown ya haya pasado', () => {
    // 5 solicitudes espaciadas 6 min: la última hace 6 min, las cinco dentro de la ventana
    const v = evaluateRequestLimits(now, [ago(6), ago(12), ago(18), ago(24), ago(29)], cfg);
    expect(v.allowed).toBe(false);
    if (!v.allowed) {
      expect(v.code).toBe('REQUEST_QUOTA_EXCEEDED');
      // Se libera cuando sale la más antigua de la ventana: 29 min + 30 min = 1 min desde ahora
      expect(v.retryAfterSeconds).toBe(60);
    }
  });

  it('vuelve a permitir cuando la solicitud más antigua sale de la ventana', () => {
    const v = evaluateRequestLimits(now, [ago(6), ago(12), ago(18), ago(24), ago(31)], cfg);
    expect(v).toMatchObject({ allowed: true, remaining: 1 });
  });
});
