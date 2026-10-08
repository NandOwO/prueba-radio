import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { t } = useTranslation();
  const { state, logout } = useAuth();
  if (state.status !== 'authenticated') return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('common.appName')}</h1>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm font-medium"
        >
          {t('home.logout')}
        </button>
      </header>
      <p className="text-xl font-semibold">{t('home.greeting', { name: state.user.name })}</p>
      <nav className="flex flex-col gap-3">
        <Link
          to="/search"
          className="flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 text-base font-semibold text-[var(--color-accent-text)]"
        >
          {t('home.searchLink')}
        </Link>
        <Link
          to="/queue"
          className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-base font-semibold"
        >
          {t('home.queueLink')}
        </Link>
        <Link
          to="/library"
          className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-base font-semibold"
        >
          {t('home.libraryLink')}
        </Link>
        <Link
          to="/requests"
          className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-base font-semibold"
        >
          {t('home.requestsLink')}
        </Link>
      </nav>
    </main>
  );
}
