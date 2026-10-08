import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Muestra la página solo a los roles indicados. Otros socios vuelven al inicio. */
export function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  if (state.status === 'loading')
    return <p className="p-6 text-center text-[var(--color-muted)]">{t('common.loading')}</p>;
  if (state.status !== 'authenticated') return <Navigate to="/login" replace />;
  if (!roles.includes(state.user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
