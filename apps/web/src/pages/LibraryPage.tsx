import { type FormEvent, useEffect, useState } from 'react';
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
import { Button, Card, Cover, EmptyState, ErrorText, Field, SectionTitle } from '../ui';

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
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('library.title')}</h1>
      </div>

      {loading && <p className="text-sm text-[var(--color-muted)]">{t('common.loading')}</p>}
      {errorKey && <ErrorText>{t(errorKey)}</ErrorText>}

      <section className="flex flex-col gap-3">
        <SectionTitle>{t('library.playlists')}</SectionTitle>
        {!loading && playlists.length === 0 && <EmptyState>{t('library.noPlaylists')}</EmptyState>}
        {playlists.length > 0 && (
          <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
            <ul>
              {playlists.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/biblioteca/${p.id}`}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <span className="truncate font-semibold">{p.name}</span>
                    <span className="shrink-0 text-sm text-[var(--color-muted)]">
                      {t('library.trackCount', { count: p.trackCount })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <form onSubmit={onCreate} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Field
              label={t('library.newPlaylist')}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!name.trim()}>
            {t('library.create')}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>{t('library.favorites')}</SectionTitle>
        {!loading && favorites.length === 0 && <EmptyState>{t('library.noFavorites')}</EmptyState>}
        {favorites.length > 0 && (
          <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
            <ul>
              {favorites.map((f) => (
                <li key={f.id} className="flex items-center gap-3 p-3">
                  <Cover src={f.coverUrl} title={f.title} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{f.title}</p>
                    <p className="truncate text-sm text-[var(--color-muted)]">{f.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void unfavorite(f.id)}
                    aria-label={t('library.removeFavorite')}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-[var(--color-accent-2)] hover:bg-[var(--color-surface-2)]"
                  >
                    ♥
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
