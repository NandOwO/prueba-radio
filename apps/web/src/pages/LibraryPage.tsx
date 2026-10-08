import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  createPlaylist,
  listFavorites,
  listPlaylists,
  setFavorite,
  type LibraryTrack,
  type PlaylistSummary,
} from '../api/library';

export function LibraryPage() {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<LibraryTrack[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listFavorites(), listPlaylists()])
      .then(([favs, lists]) => {
        setFavorites(favs);
        setPlaylists(lists);
      })
      .catch(() => setErrorKey('library.errors.generic'))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await createPlaylist(trimmed);
      setPlaylists((prev) => [...prev, created]);
      setName('');
      setErrorKey(null);
    } catch {
      setErrorKey('library.errors.playlistLimit');
    }
  }

  async function unfavorite(trackId: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== trackId));
    await setFavorite(trackId, false).catch(() => undefined);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('search.back')}
        </Link>
        <h1 className="text-xl font-bold">{t('library.title')}</h1>
      </header>

      {loading && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}
      {errorKey && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t(errorKey)}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {t('library.playlists')}
        </h2>
        <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {playlists.map((p) => (
            <li key={p.id}>
              <Link
                to={`/library/${p.id}`}
                className="flex min-h-12 items-center justify-between gap-3 p-4"
              >
                <span className="truncate font-medium">{p.name}</span>
                <span className="shrink-0 text-sm text-[var(--color-muted)]">
                  {t('library.trackCount', { count: p.trackCount })}
                </span>
              </Link>
            </li>
          ))}
          {!loading && playlists.length === 0 && (
            <li className="p-4 text-sm text-[var(--color-muted)]">{t('library.noPlaylists')}</li>
          )}
        </ul>
        <form onSubmit={onCreate} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('library.newPlaylist')}
            maxLength={60}
            aria-label={t('library.newPlaylist')}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-base"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-12 rounded-xl bg-[var(--color-accent)] px-4 font-semibold text-[var(--color-accent-text)] disabled:opacity-50"
          >
            {t('library.create')}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {t('library.favorites')}
        </h2>
        {!loading && favorites.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">{t('library.noFavorites')}</p>
        )}
        <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {favorites.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.title}</p>
                <p className="truncate text-sm text-[var(--color-muted)]">{f.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => void unfavorite(f.id)}
                aria-label={t('library.removeFavorite')}
                className="min-h-11 min-w-11 rounded-lg text-lg"
              >
                ♥
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
