import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { listAudit, type AuditEntry } from '../api/staff';

export function AuditPage() {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    listAudit()
      .then(setEntries)
      .catch(() => setErrorKey('staff.errors.generic'));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/panel"
          className="min-h-11 inline-flex items-center text-sm font-medium text-[var(--color-accent)]"
        >
          ← {t('staff.title')}
        </Link>
        <h1 className="text-xl font-bold">{t('audit.title')}</h1>
      </header>
      {errorKey && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t(errorKey)}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 p-3">
            <p className="font-medium">
              {t(`audit.actions.${e.action}`, { defaultValue: e.action })}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {e.actor} · {new Date(e.createdAt).toLocaleString(i18n.resolvedLanguage)}
            </p>
            {e.payload && Object.keys(e.payload).length > 0 && (
              <p className="break-words text-xs text-[var(--color-muted)]">
                {JSON.stringify(e.payload)}
              </p>
            )}
          </li>
        ))}
        {!errorKey && entries.length === 0 && (
          <li className="p-3 text-sm text-[var(--color-muted)]">{t('audit.empty')}</li>
        )}
      </ul>
    </main>
  );
}
