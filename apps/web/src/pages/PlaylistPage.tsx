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
import { Button, Card, Cover, EmptyState, ErrorText, Field } from '../ui';

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

  async function removePlaylist() {
    if (!window.confirm(t('playlist.confirmDelete'))) return;
    await deletePlaylist(id);
    navigate('/biblioteca', { replace: true });
  }

  return (
    <>
      <Link
        to="/biblioteca"
        className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-accent)]"
      >
        ← {t('library.title')}
      </Link>

      {errorKey && <ErrorText>{t(errorKey)}</ErrorText>}

      {playlist && (
        <>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                label={t('playlist.name')}
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void rename()}
              />
            </div>
            <Button variant="danger" size="sm" onClick={() => void removePlaylist()}>
              {t('playlist.delete')}
            </Button>
          </div>

          {playlist.items.length === 0 ? (
            <EmptyState>{t('playlist.empty')}</EmptyState>
          ) : (
            <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
              <ul>
                {playlist.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <Cover src={item.coverUrl} title={item.title} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="truncate text-sm text-[var(--color-muted)]">{item.artist}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(item.id)}
                      aria-label={t('playlist.removeTrack')}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
