import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
