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
  primary: 'bg-[#0F2E23] text-white hover:bg-[#1C4737] border-transparent',
  secondary:
    'bg-white text-[#0F2E23] hover:bg-[#F5EFEB] border-[#D4C3B5]',
  ghost: 'bg-transparent text-[#1C4737] hover:bg-[#1C4737]/10 border-transparent',
  danger: 'bg-[#B3261E] text-white hover:bg-[#8C1D18] border-transparent'
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
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-1',
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
  'w-full rounded-xl border border-[#D4C3B5]/70 bg-white px-3.5 py-2.5 text-xs font-medium ' +
  'text-[#1A1A1A] placeholder:text-[#1A1A1A]/35 transition-colors ' +
  'focus:border-[#1C4737] focus:outline-none focus:ring-1 focus:ring-[#1C4737] ' +
  'disabled:bg-[#F5EFEB] disabled:text-[#1A1A1A]/50';

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
    className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C4737]"
  >
    {children}
    {required && <span className="ml-1 text-[#B3261E]">*</span>}
  </label>
);

export const FieldHelp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-light leading-relaxed text-[#1A1A1A]/55">{children}</p>
);

/* -------------------------------------------------------------------- card */

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div
    className={cn(
      'rounded-2xl border border-[#D4C3B5]/60 bg-white shadow-sm shadow-[#0F2E23]/5',
      className
    )}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------- badge */

type BadgeTone = 'neutral' | 'success' | 'warning' | 'muted' | 'gold';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[#1C4737]/10 text-[#1C4737]',
  success: 'bg-[#1C7C54]/12 text-[#146844]',
  warning: 'bg-[#B3261E]/10 text-[#B3261E]',
  muted: 'bg-[#1A1A1A]/8 text-[#1A1A1A]/60',
  gold: 'bg-[#D4AF37]/20 text-[#7A6214]'
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
  <div className="flex items-center justify-center gap-2 py-16 text-[#1C4737]">
    <LoaderCircle className="h-4 w-4 animate-spin" />
    <span className="text-xs font-bold uppercase tracking-[0.15em]">{label}</span>
  </div>
);

export const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/8 px-4 py-3 text-xs font-medium text-[#B3261E]">
    {children}
  </div>
);

export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1C4737]/10 text-[#1C4737]">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="font-heading text-lg font-bold text-[#0F2E23]">{title}</h3>
    {children && (
      <div className="max-w-sm text-xs font-light leading-relaxed text-[#1A1A1A]/60">
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
      <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F2E23]">{title}</h1>
      {description && (
        <p className="mt-1 max-w-2xl text-xs font-light leading-relaxed text-[#1A1A1A]/60">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
