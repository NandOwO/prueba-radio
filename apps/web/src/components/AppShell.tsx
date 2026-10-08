import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ICON = 'h-6 w-6';

function Icon({ name }: { name: 'home' | 'search' | 'queue' | 'library' | 'history' | 'panel' }) {
  const paths: Record<typeof name, ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
    queue: (
      <>
        <path d="M4 6h10M4 12h10M4 18h6" />
        <path d="M18 15V5l3-1v10" />
        <circle cx="16" cy="16" r="2" />
      </>
    ),
    library: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    history: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    panel: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  };
  return (
    <svg
      className={ICON}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Logo() {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-lg"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12h3l2-6 4 12 3-9 2 3h4" />
      </svg>
    </span>
  );
}

/** Cáscara de la app para socios y staff: cabecera, contenido y navegación inferior. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;
  const isStaff = user?.role === 'staff' || user?.role === 'admin';
  const initials = (user?.name ?? '')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tabs = [
    { to: '/', label: t('nav.home'), icon: 'home' as const, end: true },
    { to: '/search', label: t('nav.search'), icon: 'search' as const },
    { to: '/cola', label: t('nav.queue'), icon: 'queue' as const },
    { to: '/biblioteca', label: t('nav.library'), icon: 'library' as const },
    { to: '/mis-solicitudes', label: t('nav.requests'), icon: 'history' as const },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <Logo />
            <span className="text-lg">{t('common.appName')}</span>
          </Link>
          <div className="flex items-center gap-2">
            {isStaff && (
              <Link
                to="/panel"
                aria-label={t('nav.panel')}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
              >
                <Icon name="panel" />
              </Link>
            )}
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-bold text-[var(--color-accent)]"
            >
              {initials}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-11 rounded-lg px-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              {t('home.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-28 pt-6">
        {children}
      </main>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                    isActive
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                <Icon name={tab.icon} />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
