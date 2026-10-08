import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge, Card, Cover, SectionTitle } from '../ui';
import { useAuth } from '../auth/AuthContext';
import { useQueue } from '../realtime/useQueue';

function Tile({
  to,
  title,
  hint,
  primary = false,
}: {
  to: string;
  title: string;
  hint: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex min-h-28 flex-col justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 ${
        primary
          ? 'bg-brand text-white shadow-[0_12px_28px_-12px_rgb(236_72_153/0.7)]'
          : 'border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]'
      }`}
    >
      <span className="text-base font-bold">{title}</span>
      <span className={`text-sm ${primary ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>
        {hint}
      </span>
    </Link>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const { snapshot } = useQueue();
  if (state.status !== 'authenticated') return null;
  const isStaff = state.user.role === 'staff' || state.user.role === 'admin';
  const current = snapshot?.current ?? null;

  return (
    <>
      <div>
        <p className="text-sm text-[var(--color-muted)]">{t('home.subtitle')}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t('home.greeting', { name: state.user.name })}
        </h1>
      </div>

      <Link
        to="/cola"
        className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
      >
        {current ? (
          <>
            <Cover src={current.track.coverUrl} title={current.track.title} size={64} />
            <div className="min-w-0 flex-1">
              <Badge tone="accent">{t('queue.nowPlaying')}</Badge>
              <p className="mt-1.5 truncate text-lg font-semibold">{current.track.title}</p>
              <p className="truncate text-sm text-[var(--color-muted)]">{current.track.artist}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">{t('home.nothingPlaying')}</p>
        )}
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Tile to="/search" title={t('home.searchLink')} hint={t('home.searchHint')} primary />
        <Tile to="/biblioteca" title={t('home.libraryLink')} hint={t('home.libraryHint')} />
        <Tile to="/mis-solicitudes" title={t('home.requestsLink')} hint={t('home.requestsHint')} />
        <Tile to="/cola" title={t('home.queueLink')} hint={t('home.queueHint')} />
      </div>

      {isStaff && (
        <section className="flex flex-col gap-3">
          <SectionTitle>{t('home.staffSection')}</SectionTitle>
          <Card className="p-4">
            <Link to="/panel" className="flex items-center justify-between font-semibold">
              {t('home.staffLink')}
              <span aria-hidden="true" className="text-[var(--color-accent)]">
                →
              </span>
            </Link>
          </Card>
        </section>
      )}
    </>
  );
}
