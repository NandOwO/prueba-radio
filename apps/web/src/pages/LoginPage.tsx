import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { LOCALES, type Locale } from '@pulsofm/shared';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { setLocale } from '../i18n';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { state, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  if (state.status === 'authenticated') return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.code : 'generic';
      setErrorKey(`login.errors.${code}`);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  const locale = i18n.resolvedLanguage as Locale;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-8">
      <div className="mb-6 flex justify-end gap-2" role="group" aria-label={t('common.language')}>
        {LOCALES.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => setLocale(lng)}
            aria-pressed={locale === lng}
            className="min-h-11 min-w-11 rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium aria-pressed:bg-[var(--color-accent)] aria-pressed:text-[var(--color-accent-text)]"
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>

      <h1 className="text-3xl font-bold tracking-tight">{t('common.appName')}</h1>
      <h2 className="mt-2 text-xl font-semibold">{t('login.title')}</h2>
      <p className="mt-1 text-base text-[var(--color-muted)]">{t('login.subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('login.username')}
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('login.password')}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>

        {errorKey && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {t(errorKey, { defaultValue: t('login.errors.generic') })}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !username.trim() || !password}
          className="min-h-12 rounded-xl bg-[var(--color-accent)] px-4 text-base font-semibold text-[var(--color-accent-text)] disabled:opacity-50"
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </main>
  );
}
