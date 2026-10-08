import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { listAudit, type AuditEntry } from '../api/staff';
import { Card, EmptyState, ErrorText } from '../ui';

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
    <>
      <Link
        to="/panel"
        className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-accent)]"
      >
        ← {t('staff.title')}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{t('audit.title')}</h1>
      {errorKey && <ErrorText>{t(errorKey)}</ErrorText>}
      {!errorKey && entries.length === 0 && <EmptyState>{t('audit.empty')}</EmptyState>}
      {entries.length > 0 && (
        <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
          <ul>
            {entries.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 p-4">
                <p className="font-semibold">
                  {t(`audit.actions.${e.action}`, { defaultValue: e.action })}
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  {e.actor} · {new Date(e.createdAt).toLocaleString(i18n.resolvedLanguage)}
                </p>
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <p className="break-words font-mono text-xs text-[var(--color-muted)]">
                    {JSON.stringify(e.payload)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
