import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { LOCALES, type Locale } from '@pulsofm/shared';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, ErrorText, Field } from '../ui';
import { Logo } from '../components/AppShell';
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div
        className="flex justify-end gap-1 rounded-full bg-[var(--color-surface-2)] p-1 self-end"
        role="group"
        aria-label={t('common.language')}
      >
        {LOCALES.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => setLocale(lng)}
            aria-pressed={locale === lng}
            className="min-h-9 min-w-11 rounded-full px-3 text-xs font-bold text-[var(--color-muted)] aria-pressed:bg-[var(--color-surface)] aria-pressed:text-[var(--color-text)] aria-pressed:shadow"
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <span className="scale-150">
          <Logo />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('common.appName')}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('login.tagline')}</p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
        noValidate
      >
        <h2 className="text-lg font-semibold">{t('login.title')}</h2>
        <p className="-mt-2 text-sm text-[var(--color-muted)]">{t('login.subtitle')}</p>
        <Field
          label={t('login.username')}
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          label={t('login.password')}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errorKey && (
          <ErrorText>{t(errorKey, { defaultValue: t('login.errors.generic') })}</ErrorText>
        )}
        <Button
          type="submit"
          disabled={submitting || !username.trim() || !password}
          className="w-full"
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </main>
  );
}
