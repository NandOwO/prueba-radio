import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  deletePlaylist,
  getPlaylist,
  removeFromPlaylist,
  renamePlaylist,
  type PlaylistDetail,
} from '../api/library';

export function PlaylistPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [name, setName] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    getPlaylist(id)
      .then((p) => {
        setPlaylist(p);
        setName(p.name);
      })
      .catch(() => setErrorKey('playlist.errors.notFound'));
  }, [id]);

  async function remove(trackId: string) {
    setPlaylist((p) => (p ? { ...p, items: p.items.filter((i) => i.id !== trackId) } : p));
    await removeFromPlaylist(id, trackId).catch(() => undefined);
  }

  async function rename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === playlist?.name) return;
    await renamePlaylist(id, trimmed);
    setPlaylist((p) => (p ? { ...p, name: trimmed } : p));
  }

  async function remove_playlist() {
    if (!window.confirm(t('playlist.confirmDelete'))) return;
    await deletePlaylist(id);
    navigate('/biblioteca', { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/biblioteca"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('library.title')}
        </Link>
      </header>

      {errorKey && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t(errorKey)}
        </p>
      )}

      {playlist && (
        <>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void rename()}
              maxLength={60}
              aria-label={t('playlist.name')}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-xl font-bold"
            />
            <button
              type="button"
              onClick={() => void remove_playlist()}
              className="min-h-12 rounded-xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-danger)]"
            >
              {t('playlist.delete')}
            </button>
          </div>

          {playlist.items.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">{t('playlist.empty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {playlist.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="truncate text-sm text-[var(--color-muted)]">{item.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    aria-label={t('playlist.removeTrack')}
                    className="min-h-11 min-w-11 rounded-lg text-lg"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
