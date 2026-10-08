import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'text-[var(--color-accent-text)] bg-brand shadow-[0_8px_20px_-10px_rgb(236_72_153/0.7)] hover:brightness-110',
  secondary:
    'text-[var(--color-text)] bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-accent)]',
  ghost: 'text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]',
  danger:
    'text-[var(--color-danger)] border border-[var(--color-border)] hover:border-[var(--color-danger)]',
};

/** Botón con área táctil de al menos 44 px. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  const sizing = size === 'sm' ? 'min-h-11 px-4 text-sm' : 'min-h-12 px-5 text-base';
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${sizing} ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-muted)]">
      {label}
      <input
        {...props}
        className="min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-muted)]/70 outline-none transition focus:border-[var(--color-accent)]"
      />
    </label>
  );
}

export function Badge({
  tone = 'muted',
  children,
}: {
  tone?: 'accent' | 'success' | 'danger' | 'muted';
  children: ReactNode;
}) {
  const tones = {
    accent: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]',
    success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
    danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
    muted: 'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Portada: la imagen de la canción o un degradado de color fijo por título. */
export function Cover({
  src,
  title,
  size = 48,
}: {
  src: string | null;
  title: string;
  size?: number;
}) {
  const hue = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        style={style}
        className="shrink-0 rounded-xl object-cover shadow-md"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        ...style,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 60) % 360} 70% 40%))`,
      }}
      className="flex shrink-0 items-center justify-center rounded-xl text-white/90 shadow-md"
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted)]">
      {children}
    </p>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
    >
      {children}
    </p>
  );
}
