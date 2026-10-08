import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Cover, EmptyState, SectionTitle } from '../ui';
import { SavePanel } from '../components/SavePanel';
import { useQueue, type QueueItem } from '../realtime/useQueue';

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function Row({ item, label }: { item: QueueItem; label: string }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--color-muted)]">
        {label}
      </span>
      <Cover src={item.track.coverUrl} title={item.track.title} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.track.title}</p>
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
  const [saving, setSaving] = useState(false);

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('queue.title')}</h1>
        </div>
        <Badge tone={connected ? 'success' : 'muted'}>
          {connected ? t('queue.live') : t('queue.reconnecting')}
        </Badge>
      </div>

      {!snapshot && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}

      {snapshot && (
        <>
          <section className="flex flex-col gap-3">
            <SectionTitle>{t('queue.nowPlaying')}</SectionTitle>
            {snapshot.current ? (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <Cover
                    src={snapshot.current.track.coverUrl}
                    title={snapshot.current.track.title}
                    size={72}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{snapshot.current.track.title}</p>
                    <p className="truncate text-sm text-[var(--color-muted)]">
                      {snapshot.current.track.artist} · {snapshot.current.requestedBy}
                    </p>
                    {snapshot.paused && <Badge tone="accent">{t('display.paused')}</Badge>}
                  </div>
                </div>
                <div className="border-t border-[var(--color-border)] p-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setSaving(true)}
                  >
                    {t('queue.save')}
                  </Button>
                </div>
              </Card>
            ) : (
              <EmptyState>{t('queue.nothingPlaying')}</EmptyState>
            )}
          </section>

          {saving && snapshot.current && (
            <SavePanel
              trackId={snapshot.current.track.id}
              title={snapshot.current.track.title}
              onClose={() => setSaving(false)}
            />
          )}

          <section className="flex flex-col gap-3">
            <SectionTitle>{t('queue.upcoming')}</SectionTitle>
            {snapshot.upcoming.length === 0 ? (
              <EmptyState>{t('queue.emptyUpcoming')}</EmptyState>
            ) : (
              <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
                <ul>
                  {snapshot.upcoming.map((item, index) => (
                    <Row key={item.id} item={item} label={String(index + 1)} />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>{t('queue.previous')}</SectionTitle>
            {snapshot.previous.length === 0 ? (
              <EmptyState>{t('queue.emptyPrevious')}</EmptyState>
            ) : (
              <Card className="divide-y divide-[var(--color-border)] overflow-hidden opacity-75">
                <ul>
                  {snapshot.previous.map((item, index) => (
                    <Row key={item.id} item={item} label={`−${index + 1}`} />
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}
    </>
  );
}
