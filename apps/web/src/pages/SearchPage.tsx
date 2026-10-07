import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '../api/client';
import { searchTracks, type TrackWithId } from '../api/tracks';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const MIN_QUERY = 2;

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 350);
  const [results, setResults] = useState<TrackWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setResults([]);
      setErrorKey(null);
      return;
    }
    let active = true;
    setLoading(true);
    setErrorKey(null);
    searchTracks(debounced)
      .then((items) => active && setResults(items))
      .catch((err: unknown) => {
        if (!active) return;
        setResults([]);
        const code = err instanceof ApiRequestError ? err.code : 'generic';
        setErrorKey(`search.errors.${code}`);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('search.back')}
        </Link>
        <h1 className="text-xl font-bold">{t('search.title')}</h1>
      </header>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t('search.label')}
        <input
          type="search"
          name="q"
          placeholder={t('search.placeholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </label>

      {query.trim().length > 0 && query.trim().length < MIN_QUERY && (
        <p className="text-sm text-[var(--color-muted)]">
          {t('search.tooShort', { min: MIN_QUERY })}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--color-muted)]">{t('search.loading')}</p>}
      {errorKey && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t(errorKey, { defaultValue: t('search.errors.generic') })}
        </p>
      )}
      {!loading && !errorKey && debounced.length >= MIN_QUERY && results.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">{t('search.empty')}</p>
      )}

      <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {results.map((track) => (
          <li key={track.id} className="flex items-center gap-3 p-3">
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                className="size-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="size-12 shrink-0 rounded-lg bg-[var(--color-border)]"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{track.title}</p>
              <p className="truncate text-sm text-[var(--color-muted)]">{track.artist}</p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-[var(--color-muted)]">
              {formatDuration(track.durationMs)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
