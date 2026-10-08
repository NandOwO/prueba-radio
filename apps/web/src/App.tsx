import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { HomePage } from './pages/HomePage';
import { AuditPage } from './pages/AuditPage';
import { LibraryPage } from './pages/LibraryPage';
import { StaffPage } from './pages/StaffPage';
import { RequireRole } from './components/RequireRole';
import { LoginPage } from './pages/LoginPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { DisplayPage } from './pages/DisplayPage';
import { QueuePage } from './pages/QueuePage';
import { RequestsPage } from './pages/RequestsPage';
import { SearchPage } from './pages/SearchPage';
import { useTranslation } from 'react-i18next';

function Protected({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  if (state.status === 'loading') {
    return <p className="p-6 text-center text-[var(--color-muted)]">{t('common.loading')}</p>;
  }
  if (state.status === 'anonymous') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <HomePage />
              </Protected>
            }
          />
          <Route
            path="/search"
            element={
              <Protected>
                <SearchPage />
              </Protected>
            }
          />
          <Route
            path="/mis-solicitudes"
            element={
              <Protected>
                <RequestsPage />
              </Protected>
            }
          />
          <Route
            path="/cola"
            element={
              <Protected>
                <QueuePage />
              </Protected>
            }
          />
          <Route
            path="/display"
            element={
              <Protected>
                <DisplayPage />
              </Protected>
            }
          />
          <Route
            path="/biblioteca"
            element={
              <Protected>
                <LibraryPage />
              </Protected>
            }
          />
          <Route
            path="/biblioteca/:id"
            element={
              <Protected>
                <PlaylistPage />
              </Protected>
            }
          />
          <Route
            path="/panel"
            element={
              <Protected>
                <RequireRole roles={['staff', 'admin']}>
                  <StaffPage />
                </RequireRole>
              </Protected>
            }
          />
          <Route
            path="/panel/auditoria"
            element={
              <Protected>
                <RequireRole roles={['admin']}>
                  <AuditPage />
                </RequireRole>
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
