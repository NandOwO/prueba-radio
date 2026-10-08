import { type FormEvent, useEffect, useState } from 'react';
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
import { Badge, Button, Card, Cover, EmptyState, ErrorText, Field, SectionTitle } from '../ui';
import { useQueue, type QueueItem, type QueueSnapshot } from '../realtime/useQueue';

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
    <li key={item.id} className="flex flex-col gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Cover src={item.track.coverUrl} title={item.track.title} size={44} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.track.title}</p>
          <p className="truncate text-sm text-[var(--color-muted)]">
            {item.track.artist} · {t('staff.requestedBy', { name: item.requestedBy })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{controls}</div>
    </li>
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('staff.queue.title')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act(() => skipCurrent())} disabled={!snapshot?.current}>
          {t('staff.queue.skip')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => act(() => setPaused(!snapshot?.paused))}
        >
          {snapshot?.paused ? t('staff.queue.resume') : t('staff.queue.pause')}
        </Button>
      </div>
      {errorKey && (
        <ErrorText>{t(errorKey, { defaultValue: t('staff.errors.generic') })}</ErrorText>
      )}

      {snapshot?.current && (
        <Card className="overflow-hidden border-[var(--color-accent)]/60">
          <ul>{row(snapshot.current, <Badge tone="success">{t('staff.queue.playing')}</Badge>)}</ul>
        </Card>
      )}

      {snapshot && snapshot.upcoming.length === 0 && (
        <EmptyState>{t('staff.queue.empty')}</EmptyState>
      )}
      {snapshot && snapshot.upcoming.length > 0 && (
        <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
          <ul>
            {snapshot.upcoming.map((item, index) =>
              row(
                item,
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={t('staff.queue.up')}
                    disabled={index === 0}
                    onClick={() => act(() => moveRequest(item.id, 'up'))}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={t('staff.queue.down')}
                    disabled={index === snapshot.upcoming.length - 1}
                    onClick={() => act(() => moveRequest(item.id, 'down'))}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => act(() => removeRequest(item.id))}
                  >
                    {t('staff.queue.remove')}
                  </Button>
                </>,
              ),
            )}
          </ul>
        </Card>
      )}
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
      <SectionTitle>{t('staff.blocklist.title')}</SectionTitle>
      <Card className="p-4">
        <form onSubmit={onAdd} className="flex flex-col gap-3">
          <div
            className="flex gap-1 rounded-xl bg-[var(--color-surface-2)] p-1"
            role="radiogroup"
            aria-label={t('staff.blocklist.type')}
          >
            {(['track', 'artist', 'keyword'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={type === kind}
                onClick={() => setType(kind)}
                className="min-h-11 flex-1 rounded-lg text-sm font-semibold text-[var(--color-muted)] aria-checked:bg-[var(--color-surface)] aria-checked:text-[var(--color-text)] aria-checked:shadow"
              >
                {t(`staff.blocklist.types.${kind}`)}
              </button>
            ))}
          </div>
          <Field
            label={t('staff.blocklist.value')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Field
            label={t('staff.blocklist.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" disabled={!value.trim()} className="w-full">
            {t('staff.blocklist.add')}
          </Button>
          {errorKey && (
            <ErrorText>{t(errorKey, { defaultValue: t('staff.errors.generic') })}</ErrorText>
          )}
        </form>
      </Card>
      {rules.length === 0 && <EmptyState>{t('staff.blocklist.empty')}</EmptyState>}
      {rules.length > 0 && (
        <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
          <ul>
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.value}</p>
                  <p className="truncate text-sm text-[var(--color-muted)]">
                    {t(`staff.blocklist.types.${r.type}`)}
                    {r.reason ? ` · ${r.reason}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void removeBlockRule(r.id).then(() =>
                      setRules((prev) => prev.filter((x) => x.id !== r.id)),
                    )
                  }
                >
                  {t('staff.blocklist.remove')}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
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
      <SectionTitle>{t('staff.users.title')}</SectionTitle>
      <Field
        label={t('staff.users.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {users.length > 0 && (
        <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
          <ul>
            {users.map((u) => (
              <li key={u.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      @{u.username} ·{' '}
                      {t(`staff.users.statuses.${u.status}`, { defaultValue: u.status })}
                    </p>
                  </div>
                  {u.block && <Badge tone="danger">{t('staff.users.blockedBadge')}</Badge>}
                </div>
                {u.block ? (
                  <>
                    <p className="text-sm text-[var(--color-danger)]">
                      {t('staff.users.blocked', { reason: u.block.reason ?? '' })}
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => void unblock(u)}>
                      {t('staff.users.unblock')}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Field
                      label={t('staff.users.reason')}
                      value={reasonFor[u.id] ?? ''}
                      onChange={(e) =>
                        setReasonFor((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void block(u, 60)}>
                        {t('staff.users.block1h')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => void block(u)}>
                        {t('staff.users.blockForever')}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

export function StaffPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t('staff.title')}</h1>
        {state.status === 'authenticated' && state.user.role === 'admin' && (
          <Link
            to="/panel/auditoria"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]"
          >
            {t('staff.auditLink')} →
          </Link>
        )}
      </div>
      <QueueSection />
      <BlocklistSection />
      <UsersSection />
    </>
  );
}
