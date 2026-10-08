import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { RequireRole } from './components/RequireRole';
import { AuditPage } from './pages/AuditPage';
import { DisplayPage } from './pages/DisplayPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { QueuePage } from './pages/QueuePage';
import { RequestsPage } from './pages/RequestsPage';
import { SearchPage } from './pages/SearchPage';
import { StaffPage } from './pages/StaffPage';

/** Exige sesión. Sin sesión, vuelve al login. */
function Protected({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  if (state.status === 'loading') {
    return <p className="p-6 text-center text-[var(--color-muted)]">{t('common.loading')}</p>;
  }
  if (state.status === 'anonymous') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Páginas de socio y staff: sesión + cáscara con navegación. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <Protected>
      <AppShell>{children}</AppShell>
    </Protected>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/display"
            element={
              <Protected>
                <DisplayPage />
              </Protected>
            }
          />
          <Route
            path="/"
            element={
              <Shell>
                <HomePage />
              </Shell>
            }
          />
          <Route
            path="/search"
            element={
              <Shell>
                <SearchPage />
              </Shell>
            }
          />
          <Route
            path="/mis-solicitudes"
            element={
              <Shell>
                <RequestsPage />
              </Shell>
            }
          />
          <Route
            path="/cola"
            element={
              <Shell>
                <QueuePage />
              </Shell>
            }
          />
          <Route
            path="/biblioteca"
            element={
              <Shell>
                <LibraryPage />
              </Shell>
            }
          />
          <Route
            path="/biblioteca/:id"
            element={
              <Shell>
                <PlaylistPage />
              </Shell>
            }
          />
          <Route
            path="/panel"
            element={
              <Shell>
                <RequireRole roles={['staff', 'admin']}>
                  <StaffPage />
                </RequireRole>
              </Shell>
            }
          />
          <Route
            path="/panel/auditoria"
            element={
              <Shell>
                <RequireRole roles={['admin']}>
                  <AuditPage />
                </RequireRole>
              </Shell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
