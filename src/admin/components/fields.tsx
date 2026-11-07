import { MAX_SITE_STATS, MAX_STAT_LABEL, MAX_STAT_SUFFIX, type SiteStatDraft } from '@shared/site-stats';
import React, { useId } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, FieldHelp, Input, Textarea } from '@/admin/components/ui';
import { cn } from '@/utils/cn';
import { TEXT_SIZES, DEFAULT_TEXT_SIZE } from '@shared/text-size';
import { MONTH_NAMES, MONTH_NUMBERS, normalizeMonths } from '@shared/best-months';

/* -------------------------------------------------------- string list field */

export const StringListField: React.FC<{
  value: string[];
  onChange: (items: string[]) => void;
  multiline?: boolean;
  placeholder?: string;
}> = ({ value, onChange, multiline = false, placeholder }) => {
  const setAt = (index: number, next: string) =>
    onChange(value.map((v, i) => (i === index ? next : v)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-5 shrink-0 text-right text-xs font-bold text-[var(--text-primary)]/35">
            {i + 1}
          </span>

          {multiline ? (
            <Textarea
              rows={3}
              value={item}
              placeholder={placeholder}
              onChange={(e) => setAt(i, e.target.value)}
            />
          ) : (
            <Input
              value={item}
              placeholder={placeholder}
              onChange={(e) => setAt(i, e.target.value)}
            />
          )}

          <div className="flex shrink-0 items-center gap-1 pt-1">
            <IconGhost label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="h-3.5 w-3.5" />
            </IconGhost>
            <IconGhost
              label="Move down"
              onClick={() => move(i, 1)}
              disabled={i === value.length - 1}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </IconGhost>
            <IconGhost
              label="Remove"
              tone="danger"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconGhost>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" icon={Plus} onClick={() => onChange([...value, ''])}>
        Add item
      </Button>
    </div>
  );
};

export const IconGhost: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}> = ({ label, onClick, disabled, tone = 'default', children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-25',
      tone === 'danger'
        ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10'
        : 'text-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]/10'
    )}
  >
    {children}
  </button>
);

/* ------------------------------------------------------- multiselect field */

export const MultiSelectField: React.FC<{
  value: string[];
  options: readonly string[];
  onChange: (values: string[]) => void;
}> = ({ value, options, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => {
      const active = value.includes(option);
      return (
        <button
          key={option}
          type="button"
          aria-pressed={active}
          onClick={() =>
            onChange(
              active ? value.filter((v) => v !== option) : [...value, option]
            )
          }
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
            active
              ? 'border-transparent bg-[var(--brand-secondary)] text-white'
              : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)]/65 hover:border-[var(--inverse-raised)] hover:text-[var(--brand-primary)]'
          )}
        >
          {option}
        </button>
      );
    })}
  </div>
);

/* ----------------------------------------------------------- toggle field */

export const ToggleField: React.FC<{
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-strong)]/70 bg-[var(--surface)] px-3.5 py-2.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-[var(--inverse-raised)]"
      />
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
    </label>
  );
};

/* ------------------------------------------------------- text size field */

/**
 * The site-wide text size, with a preview at the size chosen. Saved, it
 * applies to every page (the server writes it on <html>); this preview is
 * sized from a fixed base (index.css), so it doesn't follow what's saved now.
 */
export const TextSizeField: React.FC<{
  value: number;
  onChange: (value: number) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const name = useId();
  return (
    <fieldset className="space-y-3" data-text-size-field>
      <legend className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((size) => (
          <label
            key={size}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors',
              value === size
                ? 'border-[var(--brand-secondary)] bg-[var(--background-secondary)] text-[var(--brand-primary)]'
                : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)]'
            )}
          >
            <input
              type="radio"
              name={name}
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
              className="h-4 w-4 shrink-0 accent-[var(--inverse-raised)]"
            />
            {size}%{size === DEFAULT_TEXT_SIZE ? ' (default)' : ''}
          </label>
        ))}
      </div>
      <div className="te-text-size-preview" data-text-size-preview={value} aria-label={`Preview at ${value}%`} role="group">
        <span className="te-text-size-preview__label">Preview at {value}%</span>
        <span className="te-text-size-preview__heading">Sri Lanka, your way</span>
        <p className="te-text-size-preview__body">
          Body text looks like this: tea country at dawn, then the long road down to the south coast.
        </p>
        <span className="te-text-size-preview__card">Card and description text looks like this.</span>
      </div>
      <FieldHelp>Live preview. Nothing changes for visitors until you save.</FieldHelp>
    </fieldset>
  );
};

/* ------------------------------------------------------------ months field */

/** A destination's best months (`shared/best-months.ts`): twelve checkboxes, select all and clear. */
export const MonthsField: React.FC<{
  value: number[];
  onChange: (value: number[]) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <fieldset className="space-y-3" data-month-picker>
    <legend className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]">{label}</legend>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" data-months-all onClick={() => onChange(MONTH_NUMBERS)}>Select all</Button>
      <Button type="button" variant="secondary" data-months-clear onClick={() => onChange([])}>Clear</Button>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {MONTH_NAMES.map((name, i) => {
        const month = i + 1;
        const checked = value.includes(month);
        return (
          <label
            key={name}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors',
              checked
                ? 'border-[var(--brand-secondary)] bg-[var(--background-secondary)] text-[var(--brand-primary)]'
                : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)]'
            )}
          >
            <input
              type="checkbox"
              value={month}
              checked={checked}
              onChange={() => onChange(checked ? value.filter((m) => m !== month) : normalizeMonths([...value, month]))}
              className="h-4 w-4 shrink-0 accent-[var(--inverse-raised)]"
            />
            {name}
          </label>
        );
      })}
    </div>
  </fieldset>
);

/* -------------------------------------------------------- itinerary field */

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  location: string;
}

export const ItineraryField: React.FC<{
  value: ItineraryDay[];
  onChange: (days: ItineraryDay[]) => void;
}> = ({ value, onChange }) => {
  /** Day numbers always run 1..n so the public tour view stays consistent. */
  const renumber = (days: ItineraryDay[]) => days.map((d, i) => ({ ...d, day: i + 1 }));

  const patch = (index: number, key: keyof ItineraryDay, next: string) =>
    onChange(value.map((d, i) => (i === index ? { ...d, [key]: next } : d)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(renumber(next));
  };

  return (
    <div className="space-y-3">
      {value.map((day, i) => (
        <div key={i} className="rounded-xl border border-[var(--border-strong)]/70 bg-[var(--background)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-[var(--brand-secondary)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Day {day.day}
            </span>
            <div className="flex items-center gap-1">
              <IconGhost label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="h-3.5 w-3.5" />
              </IconGhost>
              <IconGhost
                label="Move down"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </IconGhost>
              <IconGhost
                label="Remove day"
                tone="danger"
                onClick={() => onChange(renumber(value.filter((_, idx) => idx !== i)))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconGhost>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={day.title}
              placeholder="Day title"
              onChange={(e) => patch(i, 'title', e.target.value)}
            />
            <Input
              value={day.location}
              placeholder="Location"
              onChange={(e) => patch(i, 'location', e.target.value)}
            />
          </div>

          <Textarea
            rows={2}
            className="mt-3"
            value={day.description}
            placeholder="What happens on this day"
            onChange={(e) => patch(i, 'description', e.target.value)}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        icon={Plus}
        onClick={() =>
          onChange([
            ...value,
            { day: value.length + 1, title: '', description: '', location: '' }
          ])
        }
      >
        Add day
      </Button>
    </div>
  );
};

/**
 * The stats strip: always four rows, in a fixed table, so a row is emptied rather
 * than deleted. The server drops empty rows (`parseSiteStats`).
 */
export const StatsField: React.FC<{ value: SiteStatDraft[]; onChange: (value: SiteStatDraft[]) => void }> = ({ value, onChange }) => {
  const rows = Array.from({ length: MAX_SITE_STATS }, (_, i) => value[i] ?? { label: '', number: '', suffix: '', order: '' });
  const set = (index: number, key: keyof SiteStatDraft, next: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)));
  const shown = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
  return (
    <div className="space-y-4" data-stats-field>
      {rows.map((row, i) => (
        <fieldset key={i} className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_7rem_5rem_5rem]" data-stat-row>
          <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">Stat {i + 1}</legend>
          <label className="col-span-2 block text-sm sm:col-span-1">
            <span className="mb-1 block text-[var(--text-secondary)]">Label</span>
            <Input value={shown(row.label)} maxLength={MAX_STAT_LABEL} onChange={(e) => set(i, 'label', e.target.value)} data-stat-field="label" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Number</span>
            <Input value={shown(row.number)} inputMode="numeric" onChange={(e) => set(i, 'number', e.target.value)} data-stat-field="number" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Suffix</span>
            <Input value={shown(row.suffix)} maxLength={MAX_STAT_SUFFIX} onChange={(e) => set(i, 'suffix', e.target.value)} data-stat-field="suffix" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--text-secondary)]">Order</span>
            <Input value={shown(row.order)} inputMode="numeric" onChange={(e) => set(i, 'order', e.target.value)} data-stat-field="order" />
          </label>
        </fieldset>
      ))}
    </div>
  );
};
