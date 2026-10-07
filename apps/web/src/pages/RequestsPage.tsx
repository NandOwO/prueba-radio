import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '../api/client';
import { fetchMyRequests, type MyRequest, type RequestLimits } from '../api/requests';

function minutesUntil(iso: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));
}

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
  const statusLabel = (r: MyRequest) => {
    if (r.status === 'queued' && r.queuePosition)
      return t('requests.status.queued', { position: r.queuePosition });
    return t(`requests.status.${r.status}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('search.back')}
        </Link>
        <h1 className="text-xl font-bold">{t('requests.title')}</h1>
      </header>

      {limits && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-lg font-semibold">
            {t('requests.limits.remaining', {
              count: limits.remaining,
              max: limits.maxInWindow,
              minutes: limits.windowMinutes,
            })}
          </p>
          {limits.remaining === 0 && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {t('requests.limits.nextIn', { minutes: minutesUntil(limits.nextAllowedAt, now) })}
            </p>
          )}
        </section>
      )}

      {loading && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}
      {errorKey && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t(errorKey, { defaultValue: t('requests.errors.generic') })}
        </p>
      )}
      {!loading && !errorKey && items.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">{t('requests.empty')}</p>
      )}

      <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {items.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 p-4">
            <p className="truncate text-base font-semibold">{r.track.title}</p>
            <p className="truncate text-sm text-[var(--color-muted)]">{r.track.artist}</p>
            <p className="text-sm font-medium text-[var(--color-accent)]">{statusLabel(r)}</p>
            {r.status === 'blocked' && r.reason && (
              <p className="text-sm text-[var(--color-danger)]">{r.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
