import React from 'react';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Small presentational primitives shared across the admin panel.
 * Deliberately separate from the public site's components — nothing in
 * `src/components` is touched by the admin UI.
 */

/* ------------------------------------------------------------------ button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--inverse-surface)] text-white hover:bg-[var(--brand-secondary)] border-transparent',
  secondary:
    'bg-[var(--surface)] text-[var(--brand-primary)] hover:bg-[var(--background-secondary)] border-[var(--border-strong)]',
  ghost: 'bg-transparent text-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]/10 border-transparent',
  danger: 'bg-[var(--danger)] text-[var(--on-feedback)] hover:bg-[var(--danger-hover)] border-transparent'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5',
      'text-xs font-bold transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-60',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
      VARIANTS[variant],
      className
    )}
  >
    {loading ? (
      <LoaderCircle className="h-4 w-4 animate-spin" />
    ) : (
      Icon && <Icon className="h-4 w-4" />
    )}
    {children}
  </button>
);

/* ------------------------------------------------------------------- input */

const CONTROL_BASE =
  'w-full rounded-xl border border-[var(--border-strong)]/70 bg-[var(--surface)] px-3.5 py-2.5 text-xs font-medium ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/35 transition-colors ' +
  'focus:border-[var(--inverse-raised)] focus:outline-none focus:ring-1 focus:ring-[var(--inverse-raised)] ' +
  'disabled:bg-[var(--background-secondary)] disabled:text-[var(--text-primary)]/50';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...rest
}) => <input {...rest} className={cn(CONTROL_BASE, className)} />;

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...rest
}) => <textarea {...rest} className={cn(CONTROL_BASE, 'leading-relaxed', className)} />;

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...rest
}) => (
  <select {...rest} className={cn(CONTROL_BASE, 'pr-8', className)}>
    {children}
  </select>
);

/* ------------------------------------------------------------------- label */

export const FieldLabel: React.FC<{
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}> = ({ htmlFor, children, required }) => (
  <label
    htmlFor={htmlFor}
    className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]"
  >
    {children}
    {required && <span className="ml-1 text-[var(--danger)]">*</span>}
  </label>
);

export const FieldHelp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-light leading-relaxed text-[var(--text-primary)]/55">{children}</p>
);

/* -------------------------------------------------------------------- card */

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div
    className={cn(
      'rounded-2xl border border-[var(--border-strong)]/60 bg-[var(--surface)] shadow-sm shadow-[var(--inverse-surface)]/5',
      className
    )}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------- badge */

type BadgeTone = 'neutral' | 'success' | 'warning' | 'muted' | 'gold';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)]',
  success: 'bg-[var(--success)]/12 text-[var(--success)]',
  warning: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  muted: 'bg-[var(--text-primary)]/8 text-[var(--text-primary)]/60',
  gold: 'bg-[var(--accent)]/20 text-[var(--warning)]'
};

export const Badge: React.FC<{ tone?: BadgeTone; children: React.ReactNode }> = ({
  tone = 'neutral',
  children
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
      TONES[tone]
    )}
  >
    {children}
  </span>
);

/* ---------------------------------------------------------------- feedback */

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-[var(--brand-primary)]">
    <LoaderCircle className="h-4 w-4 animate-spin" />
    <span className="text-xs font-bold uppercase tracking-[0.15em]">{label}</span>
  </div>
);

export const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 px-4 py-3 text-xs font-medium text-[var(--danger)]">
    {children}
  </div>
);

export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)]">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="font-heading text-lg font-bold text-[var(--brand-primary)]">{title}</h3>
    {children && (
      <div className="max-w-sm text-xs font-light leading-relaxed text-[var(--text-primary)]/60">
        {children}
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------- page header */

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--brand-primary)]">{title}</h1>
      {description && (
        <p className="mt-1 max-w-2xl text-xs font-light leading-relaxed text-[var(--text-primary)]/60">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
