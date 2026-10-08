import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiRequestError } from '../api/client';
import {
  addBlockRule,
  blockUser,
  getStaffQueue,
  listBlocklist,
  moveRequest,
  removeBlockRule,
  removeRequest,
  searchUsers,
  setPaused,
  skipCurrent,
  unblockUser,
  type BlockRule,
  type BlockType,
  type StaffUser,
} from '../api/staff';
import { useQueue, type QueueItem, type QueueSnapshot } from '../realtime/useQueue';

const BUTTON =
  'min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium disabled:opacity-40';

function QueueSection() {
  const { t } = useTranslation();
  const { snapshot: liveSnapshot } = useQueue();
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Cada cambio en vivo vuelve a pedir la cola con nombres completos.
  useEffect(() => {
    if (!liveSnapshot) return;
    getStaffQueue()
      .then(setSnapshot)
      .catch(() => setErrorKey('staff.errors.generic'));
  }, [liveSnapshot]);

  async function act(action: () => Promise<unknown>) {
    setErrorKey(null);
    try {
      await action();
    } catch (err) {
      setErrorKey(`staff.errors.${err instanceof ApiRequestError ? err.code : 'generic'}`);
    }
  }

  const row = (item: QueueItem, controls: React.ReactNode) => (
    <li key={item.id} className="flex flex-col gap-2 p-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{item.track.title}</p>
        <p className="truncate text-sm text-[var(--color-muted)]">
          {item.track.artist} · {t('staff.requestedBy', { name: item.requestedBy })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{controls}</div>
    </li>
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('staff.queue.title')}</h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON}
          onClick={() => act(() => skipCurrent())}
          disabled={!snapshot?.current}
        >
          {t('staff.queue.skip')}
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => act(() => setPaused(!snapshot?.paused))}
        >
          {snapshot?.paused ? t('staff.queue.resume') : t('staff.queue.pause')}
        </button>
      </div>
      {errorKey && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t(errorKey, { defaultValue: t('staff.errors.generic') })}
        </p>
      )}

      {snapshot?.current && (
        <ul className="overflow-hidden rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface)]">
          {row(
            snapshot.current,
            <span className="text-sm font-semibold text-[var(--color-accent)]">
              {t('staff.queue.playing')}
            </span>,
          )}
        </ul>
      )}

      <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {snapshot?.upcoming.map((item, index) =>
          row(
            item,
            <>
              <button
                type="button"
                className={BUTTON}
                aria-label={t('staff.queue.up')}
                disabled={index === 0}
                onClick={() => act(() => moveRequest(item.id, 'up'))}
              >
                ↑
              </button>
              <button
                type="button"
                className={BUTTON}
                aria-label={t('staff.queue.down')}
                disabled={index === snapshot.upcoming.length - 1}
                onClick={() => act(() => moveRequest(item.id, 'down'))}
              >
                ↓
              </button>
              <button
                type="button"
                className={BUTTON}
                onClick={() => act(() => removeRequest(item.id))}
              >
                {t('staff.queue.remove')}
              </button>
            </>,
          ),
        )}
        {snapshot && snapshot.upcoming.length === 0 && (
          <li className="p-3 text-sm text-[var(--color-muted)]">{t('staff.queue.empty')}</li>
        )}
      </ul>
    </section>
  );
}

function BlocklistSection() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<BlockRule[]>([]);
  const [type, setType] = useState<BlockType>('track');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    listBlocklist()
      .then(setRules)
      .catch(() => setErrorKey('staff.errors.generic'));
  }, []);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;
    try {
      const rule = await addBlockRule(type, value.trim(), reason.trim() || undefined);
      setRules((prev) => [rule, ...prev]);
      setValue('');
      setReason('');
      setErrorKey(null);
    } catch (err) {
      setErrorKey(
        `staff.blocklist.errors.${err instanceof ApiRequestError ? err.code : 'generic'}`,
      );
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('staff.blocklist.title')}</h2>
      <form
        onSubmit={onAdd}
        className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
          aria-label={t('staff.blocklist.type')}
          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3"
        >
          <option value="track">{t('staff.blocklist.types.track')}</option>
          <option value="artist">{t('staff.blocklist.types.artist')}</option>
          <option value="keyword">{t('staff.blocklist.types.keyword')}</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('staff.blocklist.value')}
          aria-label={t('staff.blocklist.value')}
          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('staff.blocklist.reason')}
          aria-label={t('staff.blocklist.reason')}
          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="min-h-11 rounded-lg bg-[var(--color-accent)] font-semibold text-[var(--color-accent-text)] disabled:opacity-50"
        >
          {t('staff.blocklist.add')}
        </button>
        {errorKey && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {t(errorKey, { defaultValue: t('staff.errors.generic') })}
          </p>
        )}
      </form>
      <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{r.value}</p>
              <p className="truncate text-sm text-[var(--color-muted)]">
                {t(`staff.blocklist.types.${r.type}`)}
                {r.reason ? ` · ${r.reason}` : ''}
              </p>
            </div>
            <button
              type="button"
              className={BUTTON}
              onClick={() =>
                void removeBlockRule(r.id).then(() =>
                  setRules((prev) => prev.filter((x) => x.id !== r.id)),
                )
              }
            >
              {t('staff.blocklist.remove')}
            </button>
          </li>
        ))}
        {rules.length === 0 && (
          <li className="p-3 text-sm text-[var(--color-muted)]">{t('staff.blocklist.empty')}</li>
        )}
      </ul>
    </section>
  );
}

function UsersSection() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [reasonFor, setReasonFor] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = setTimeout(() => {
      searchUsers(query)
        .then(setUsers)
        .catch(() => setUsers([]));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function block(user: StaffUser, minutes?: number) {
    const reason = (reasonFor[user.id] ?? '').trim();
    if (reason.length < 3) return;
    await blockUser(user.id, reason, minutes);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              block: {
                reason,
                expiresAt: minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
              },
            }
          : u,
      ),
    );
  }

  async function unblock(user: StaffUser) {
    await unblockUser(user.id);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, block: null } : u)));
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('staff.users.title')}</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('staff.users.search')}
        aria-label={t('staff.users.search')}
        className="min-h-12 rounded-xl border border-[var(--color-border)] bg-transparent px-4"
      />
      <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-2 p-3">
            <div>
              <p className="font-semibold">{u.name}</p>
              <p className="text-sm text-[var(--color-muted)]">
                @{u.username} · {t(`staff.users.statuses.${u.status}`, { defaultValue: u.status })}
              </p>
              {u.block && (
                <p className="text-sm text-[var(--color-danger)]">
                  {t('staff.users.blocked', { reason: u.block.reason ?? '' })}
                </p>
              )}
            </div>
            {u.block ? (
              <button type="button" className={BUTTON} onClick={() => void unblock(u)}>
                {t('staff.users.unblock')}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  value={reasonFor[u.id] ?? ''}
                  onChange={(e) => setReasonFor((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  placeholder={t('staff.users.reason')}
                  aria-label={t('staff.users.reason')}
                  className="min-h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={BUTTON} onClick={() => void block(u, 60)}>
                    {t('staff.users.block1h')}
                  </button>
                  <button type="button" className={BUTTON} onClick={() => void block(u)}>
                    {t('staff.users.blockForever')}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StaffPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('search.back')}
        </Link>
        {state.status === 'authenticated' && state.user.role === 'admin' && (
          <Link
            to="/panel/auditoria"
            className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
          >
            {t('staff.auditLink')}
          </Link>
        )}
      </header>
      <h1 className="text-2xl font-bold">{t('staff.title')}</h1>
      <QueueSection />
      <BlocklistSection />
      <UsersSection />
    </main>
  );
}
