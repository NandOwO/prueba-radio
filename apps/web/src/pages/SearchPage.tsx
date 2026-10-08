import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiRequestError } from '../api/client';
import { createRequest } from '../api/requests';
import { searchTracks, type TrackWithId } from '../api/tracks';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Button, Cover, EmptyState, ErrorText, Badge } from '../ui';

const MIN_QUERY = 2;

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 350);
  const [results, setResults] = useState<TrackWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requested, setRequested] = useState<Record<string, number>>({});
  const [requestError, setRequestError] = useState<string | null>(null);

  async function onRequest(track: TrackWithId) {
    setRequesting(track.id);
    setRequestError(null);
    try {
      const created = await createRequest(track.id);
      setRequested((prev) => ({ ...prev, [track.id]: created.position }));
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.code : 'generic';
      const seconds =
        err instanceof ApiRequestError ? Number(err.details?.retryAfterSeconds ?? 0) : 0;
      setRequestError(
        t(`search.requestErrors.${code}`, {
          defaultValue: t('search.requestErrors.generic'),
          minutes: Math.max(1, Math.ceil(seconds / 60)),
        }),
      );
    } finally {
      setRequesting(null);
    }
  }

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
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('search.title')}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t('search.intro')}</p>
      </div>

      <label className="relative block">
        <span className="sr-only">{t('search.label')}</span>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          name="q"
          placeholder={t('search.placeholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-12 pr-4 text-base outline-none transition focus:border-[var(--color-accent)]"
        />
      </label>

      {query.trim().length > 0 && query.trim().length < MIN_QUERY && (
        <p className="-mt-3 text-sm text-[var(--color-muted)]">
          {t('search.tooShort', { min: MIN_QUERY })}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--color-muted)]">{t('search.loading')}</p>}
      {requestError && <ErrorText>{requestError}</ErrorText>}
      {errorKey && (
        <ErrorText>{t(errorKey, { defaultValue: t('search.errors.generic') })}</ErrorText>
      )}
      {!loading && !errorKey && debounced.length >= MIN_QUERY && results.length === 0 && (
        <EmptyState>{t('search.empty')}</EmptyState>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((track) => (
            <li
              key={track.id}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
            >
              <Cover src={track.coverUrl} title={track.title} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{track.title}</p>
                <p className="truncate text-sm text-[var(--color-muted)]">
                  {track.artist} · {formatDuration(track.durationMs)}
                </p>
              </div>
              {requested[track.id] ? (
                <Badge tone="success">#{requested[track.id]}</Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void onRequest(track)}
                  disabled={requesting !== null}
                >
                  {requesting === track.id ? t('search.requesting') : t('search.request')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
