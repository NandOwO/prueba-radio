import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client';
import { planPlayback } from '../display/playbackRules';
import { createYouTubePlayer, type YtPlayer } from '../display/youtube';
import { useQueue, type QueueItem } from '../realtime/useQueue';

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function NowPlaying({ item }: { item: QueueItem }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {item.track.coverUrl ? (
        <img
          src={item.track.coverUrl}
          alt=""
          className="aspect-square w-full max-w-72 rounded-3xl object-cover shadow-2xl"
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-square w-full max-w-72 rounded-3xl bg-[var(--color-border)]"
        />
      )}
      <p className="line-clamp-2 text-3xl font-bold">{item.track.title}</p>
      <p className="text-xl text-[var(--color-muted)]">{item.track.artist}</p>
      <p className="text-base text-[var(--color-muted)]">{item.requestedBy}</p>
    </div>
  );
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
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center gap-6 px-6 py-8">
      {/* Reproductor oculto: el audio sale por los altavoces de la PC. */}
      <div
        ref={containerRef}
        className="pointer-events-none absolute size-px opacity-0"
        aria-hidden="true"
      />

      <header className="flex w-full items-center justify-between">
        <p className="text-lg font-bold">{t('common.appName')}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {connected ? t('display.online') : t('display.offline')}
        </p>
      </header>

      {!started && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="min-h-16 rounded-2xl bg-[var(--color-accent)] px-10 text-2xl font-bold text-[var(--color-accent-text)]"
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
        <>
          <NowPlaying item={current} />
          <div className="w-full max-w-md">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
              role="progressbar"
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-[var(--color-accent)] transition-[width] duration-1000"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-sm tabular-nums text-[var(--color-muted)]">
              <span>{formatTime(progress.current)}</span>
              <span>{formatTime(progress.duration)}</span>
            </div>
          </div>
          {paused && (
            <p className="text-lg font-semibold text-[var(--color-accent)]">
              {t('display.paused')}
            </p>
          )}
        </>
      ) : (
        snapshot && <p className="text-xl text-[var(--color-muted)]">{t('display.idle')}</p>
      )}

      {snapshot && snapshot.upcoming.length > 0 && (
        <section className="w-full max-w-md">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {t('display.upNext')}
          </h2>
          <ol className="flex flex-col gap-2">
            {snapshot.upcoming.slice(0, 5).map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-surface)] p-3"
              >
                <span className="w-6 text-center font-semibold tabular-nums text-[var(--color-muted)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg">{item.track.title}</span>
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
