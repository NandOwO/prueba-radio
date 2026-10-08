import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client';
import { planPlayback } from '../display/playbackRules';
import { createYouTubePlayer, type YtPlayer } from '../display/youtube';
import { useQueue } from '../realtime/useQueue';
import { Badge, Cover } from '../ui';

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function DisplayPage() {
  const { t } = useTranslation();
  const { snapshot, connected } = useQueue();
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const loadedRef = useRef<string | null>(null);

  const currentId = snapshot?.current?.track.providerTrackId ?? null;
  const paused = snapshot?.paused ?? false;

  /** Canción terminada o con error: se pide la siguiente al servidor. */
  const advance = useCallback(() => {
    void apiFetch('/player/next', { method: 'POST' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!started || !containerRef.current || playerRef.current) return;
    let cancelled = false;
    createYouTubePlayer(containerRef.current, {
      onReady: () => setReady(true),
      onEnded: advance,
      onError: advance,
    })
      .then((player) => {
        if (cancelled) player.destroy();
        else playerRef.current = player;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [started, advance]);

  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    const plan = planPlayback({
      currentVideoId: currentId,
      paused,
      loadedVideoId: loadedRef.current,
    });
    if (plan.load) {
      player.load(plan.load);
      loadedRef.current = plan.load;
    }
    if (plan.command === 'play') player.play();
    else player.pause();
  }, [ready, currentId, paused]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (playerRef.current) setProgress(playerRef.current.progress());
    }, 1000);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  const current = snapshot?.current ?? null;
  const percent =
    progress.duration > 0 ? Math.min(100, (progress.current / progress.duration) * 100) : 0;

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center gap-8 overflow-hidden px-6 py-8">
      {/* Reproductor oculto: el audio sale por los altavoces de la PC. */}
      <div
        ref={containerRef}
        className="pointer-events-none absolute size-px opacity-0"
        aria-hidden="true"
      />

      <header className="flex w-full items-center justify-between">
        <p className="text-lg font-bold tracking-tight">{t('common.appName')}</p>
        <Badge tone={connected ? 'success' : 'danger'}>
          {connected ? t('display.online') : t('display.offline')}
        </Badge>
      </header>

      {!started && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="min-h-20 rounded-3xl bg-brand px-12 text-2xl font-bold text-white shadow-[0_20px_40px_-16px_rgb(236_72_153/0.8)] transition hover:brightness-110"
        >
          {t('display.start')}
        </button>
      )}

      {failed && (
        <p role="alert" className="text-base text-[var(--color-danger)]">
          {t('display.playerError')}
        </p>
      )}
      {started && !ready && !failed && (
        <p className="text-base text-[var(--color-muted)]">{t('display.loadingPlayer')}</p>
      )}

      {current ? (
        <section className="flex w-full flex-col items-center gap-6 text-center">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[2rem] bg-brand opacity-30 blur-3xl"
            />
            <Cover src={current.track.coverUrl} title={current.track.title} size={288} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Badge tone="accent">{paused ? t('display.paused') : t('queue.nowPlaying')}</Badge>
            <p className="line-clamp-2 text-4xl font-extrabold tracking-tight">
              {current.track.title}
            </p>
            <p className="text-xl text-[var(--color-muted)]">{current.track.artist}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {t('display.requestedBy', { name: current.requestedBy })}
            </p>
          </div>
          <div className="w-full max-w-xl">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]"
              role="progressbar"
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-1000"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm tabular-nums text-[var(--color-muted)]">
              <span>{formatTime(progress.current)}</span>
              <span>{formatTime(progress.duration)}</span>
            </div>
          </div>
        </section>
      ) : (
        snapshot && <p className="text-2xl text-[var(--color-muted)]">{t('display.idle')}</p>
      )}

      {snapshot && snapshot.upcoming.length > 0 && (
        <section className="w-full max-w-xl">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {t('display.upNext')}
          </h2>
          <ol className="flex flex-col gap-2">
            {snapshot.upcoming.slice(0, 5).map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <span className="w-7 text-center text-lg font-bold tabular-nums text-[var(--color-accent)]">
                  {index + 1}
                </span>
                <Cover src={item.track.coverUrl} title={item.track.title} size={44} />
                <span className="min-w-0 flex-1 truncate text-lg font-semibold">
                  {item.track.title}
                </span>
                <span className="shrink-0 text-sm text-[var(--color-muted)]">
                  {item.requestedBy}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
