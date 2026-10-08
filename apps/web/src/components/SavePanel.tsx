import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiRequestError } from '../api/client';
import {
  addToPlaylist,
  createPlaylist,
  getSaveState,
  listPlaylists,
  removeFromPlaylist,
  setFavorite,
  type PlaylistSummary,
} from '../api/library';

interface Props {
  trackId: string;
  title: string;
  onClose: () => void;
}

/** Panel para guardar la canción que suena en favoritos o en una playlist. */
export function SavePanel({ trackId, title, onClose }: Props) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [favorite, setFavoriteState] = useState(false);
  const [inPlaylists, setInPlaylists] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listPlaylists(), getSaveState(trackId)])
      .then(([lists, state]) => {
        if (!active) return;
        setPlaylists(lists);
        setFavoriteState(state.favorite);
        setInPlaylists(new Set(state.playlistIds));
      })
      .catch(() => active && setErrorKey('save.errors.generic'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [trackId]);

  async function run(action: () => Promise<unknown>) {
    setErrorKey(null);
    try {
      await action();
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.code : 'generic';
      setErrorKey(`save.errors.${code}`);
    }
  }

  async function toggleFavorite() {
    const next = !favorite;
    setFavoriteState(next);
    await run(() => setFavorite(trackId, next));
  }

  async function togglePlaylist(playlist: PlaylistSummary) {
    const has = inPlaylists.has(playlist.id);
    const next = new Set(inPlaylists);
    if (has) next.delete(playlist.id);
    else next.add(playlist.id);
    setInPlaylists(next);
    await run(() =>
      has ? removeFromPlaylist(playlist.id, trackId) : addToPlaylist(playlist.id, trackId),
    );
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await run(async () => {
      const created = await createPlaylist(name);
      await addToPlaylist(created.id, trackId);
      setPlaylists((prev) => [...prev, { ...created, trackCount: 1 }]);
      setInPlaylists((prev) => new Set(prev).add(created.id));
      setNewName('');
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('save.title')}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div
          className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--color-border)]"
          aria-hidden="true"
        />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-[var(--color-muted)]">{t('save.title')}</p>
            <p className="truncate text-lg font-semibold">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-3 text-sm font-medium"
          >
            {t('save.close')}
          </button>
        </div>

        {loading && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}

        {!loading && (
          <>
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              aria-pressed={favorite}
              className="mb-3 flex min-h-14 w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-base font-semibold aria-pressed:border-[var(--color-accent-2)] aria-pressed:text-[var(--color-accent-2)]"
            >
              {t('save.favorite')}
              <span aria-hidden="true">{favorite ? '♥' : '♡'}</span>
            </button>

            <ul className="mb-4 flex flex-col gap-2">
              {playlists.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void togglePlaylist(p)}
                    aria-pressed={inPlaylists.has(p.id)}
                    className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-base aria-pressed:border-[var(--color-accent)]"
                  >
                    <span className="truncate">{p.name}</span>
                    <span aria-hidden="true">{inPlaylists.has(p.id) ? '✓' : '+'}</span>
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={onCreate} className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('save.newPlaylist')}
                maxLength={60}
                aria-label={t('save.newPlaylist')}
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-base"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="min-h-12 rounded-xl bg-[var(--color-accent)] px-4 font-semibold text-[var(--color-accent-text)] disabled:opacity-50"
              >
                {t('save.create')}
              </button>
            </form>
          </>
        )}

        {errorKey && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">
            {t(errorKey, { defaultValue: t('save.errors.generic') })}
          </p>
        )}
      </div>
    </div>
  );
}
