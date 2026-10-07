import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueue, type QueueItem } from '../realtime/useQueue';

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function Row({ item, label }: { item: QueueItem; label: string }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-[var(--color-muted)]">
        {label}
      </span>
      {item.track.coverUrl ? (
        <img
          src={item.track.coverUrl}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="size-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div aria-hidden="true" className="size-11 shrink-0 rounded-lg bg-[var(--color-border)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{item.track.title}</p>
        <p className="truncate text-sm text-[var(--color-muted)]">
          {item.track.artist} · {item.requestedBy}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-[var(--color-muted)]">
        {formatDuration(item.track.durationMs)}
      </span>
    </li>
  );
}

export function QueuePage() {
  const { t } = useTranslation();
  const { snapshot, connected } = useQueue();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('search.back')}
        </Link>
        <h1 className="text-xl font-bold">{t('queue.title')}</h1>
      </header>

      <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
        {connected ? t('queue.live') : t('queue.reconnecting')}
      </p>

      {!snapshot && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}

      {snapshot && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {t('queue.nowPlaying')}
            </h2>
            {snapshot.current ? (
              <ul className="overflow-hidden rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface)]">
                <Row item={snapshot.current} label="▶" />
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">{t('queue.nothingPlaying')}</p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {t('queue.upcoming')}
            </h2>
            {snapshot.upcoming.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">{t('queue.emptyUpcoming')}</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                {snapshot.upcoming.map((item, index) => (
                  <Row key={item.id} item={item} label={String(index + 1)} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {t('queue.previous')}
            </h2>
            {snapshot.previous.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">{t('queue.emptyPrevious')}</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] opacity-80">
                {snapshot.previous.map((item, index) => (
                  <Row key={item.id} item={item} label={`−${index + 1}`} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
