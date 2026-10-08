import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiRequestError } from '../api/client';
import { fetchMyRequests, type MyRequest, type RequestLimits } from '../api/requests';
import { Badge, Card, Cover, EmptyState, ErrorText } from '../ui';

function minutesUntil(iso: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));
}

const TONE: Record<string, 'accent' | 'success' | 'danger' | 'muted'> = {
  queued: 'accent',
  playing: 'success',
  played: 'muted',
  skipped: 'muted',
  removed: 'danger',
  blocked: 'danger',
};

export function RequestsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MyRequest[]>([]);
  const [limits, setLimits] = useState<RequestLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyRequests()
      .then((body) => {
        if (!active) return;
        setItems(body.items);
        setLimits(body.limits);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const code = err instanceof ApiRequestError ? err.code : 'generic';
        setErrorKey(`requests.errors.${code}`);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const now = Date.now();
  const statusLabel = (r: MyRequest) =>
    r.status === 'queued' && r.queuePosition
      ? t('requests.status.queued', { position: r.queuePosition })
      : t(`requests.status.${r.status}`);

  const used = limits ? limits.maxInWindow - limits.remaining : 0;

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('requests.title')}</h1>
      </div>

      {limits && (
        <Card className="p-5">
          <p className="text-lg font-semibold">
            {t('requests.limits.remaining', {
              count: limits.remaining,
              max: limits.maxInWindow,
              minutes: limits.windowMinutes,
            })}
          </p>
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: limits.maxInWindow }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${i < used ? 'bg-brand' : 'bg-[var(--color-surface-2)]'}`}
              />
            ))}
          </div>
          {limits.remaining === 0 && (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {t('requests.limits.nextIn', { minutes: minutesUntil(limits.nextAllowedAt, now) })}
            </p>
          )}
        </Card>
      )}

      {loading && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}
      {errorKey && (
        <ErrorText>{t(errorKey, { defaultValue: t('requests.errors.generic') })}</ErrorText>
      )}
      {!loading && !errorKey && items.length === 0 && (
        <EmptyState>{t('requests.empty')}</EmptyState>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
          >
            <Cover src={r.track.coverUrl} title={r.track.title} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.track.title}</p>
              <p className="truncate text-sm text-[var(--color-muted)]">{r.track.artist}</p>
              <div className="mt-2">
                <Badge tone={TONE[r.status] ?? 'muted'}>{statusLabel(r)}</Badge>
              </div>
              {r.status === 'blocked' && r.reason && (
                <p className="mt-2 text-sm text-[var(--color-danger)]">{r.reason}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
