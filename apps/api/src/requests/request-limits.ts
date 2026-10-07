export interface RequestLimitConfig {
  windowMinutes: number;
  maxInWindow: number;
  cooldownMinutes: number;
}

export type LimitVerdict =
  | { allowed: true; remaining: number; nextAllowedAt: Date }
  | {
      allowed: false;
      code: 'REQUEST_COOLDOWN' | 'REQUEST_QUOTA_EXCEEDED';
      retryAfterSeconds: number;
      remaining: number;
      nextAllowedAt: Date;
    };

/**
 * Evalúa los límites de solicitudes de un socio.
 * @param timestamps fechas de sus solicitudes contadas, de la más reciente a la más antigua.
 */
export function evaluateRequestLimits(
  now: Date,
  timestamps: Date[],
  cfg: RequestLimitConfig,
): LimitVerdict {
  const windowMs = cfg.windowMinutes * 60_000;
  const cooldownMs = cfg.cooldownMinutes * 60_000;
  const nowMs = now.getTime();

  const inWindow = timestamps.filter((t) => nowMs - t.getTime() < windowMs);
  const remaining = Math.max(0, cfg.maxInWindow - inWindow.length);

  // Momento en que se libera cada límite. El más tardío manda.
  const cooldownEnd = timestamps.length > 0 ? timestamps[0]!.getTime() + cooldownMs : nowMs;
  const windowEnd =
    inWindow.length >= cfg.maxInWindow
      ? inWindow[cfg.maxInWindow - 1]!.getTime() + windowMs
      : nowMs;

  if (cooldownEnd > nowMs) {
    return {
      allowed: false,
      code: 'REQUEST_COOLDOWN',
      retryAfterSeconds: Math.ceil((cooldownEnd - nowMs) / 1000),
      remaining,
      nextAllowedAt: new Date(cooldownEnd),
    };
  }
  if (windowEnd > nowMs) {
    return {
      allowed: false,
      code: 'REQUEST_QUOTA_EXCEEDED',
      retryAfterSeconds: Math.ceil((windowEnd - nowMs) / 1000),
      remaining,
      nextAllowedAt: new Date(windowEnd),
    };
  }
  return { allowed: true, remaining, nextAllowedAt: new Date(nowMs) };
}
