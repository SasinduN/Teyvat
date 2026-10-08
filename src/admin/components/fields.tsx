import React, { useId } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@/admin/components/ui';
import { cn } from '@/utils/cn';

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
          <span className="mt-2.5 w-5 shrink-0 text-right text-[11px] font-bold text-[#1A1A1A]/35">
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
        ? 'text-[#B3261E] hover:bg-[#B3261E]/10'
        : 'text-[#1C4737] hover:bg-[#1C4737]/10'
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
            'rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-colors',
            active
              ? 'border-transparent bg-[#1C4737] text-white'
              : 'border-[#D4C3B5] bg-white text-[#1A1A1A]/65 hover:border-[#1C4737] hover:text-[#1C4737]'
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
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#D4C3B5]/70 bg-white px-3.5 py-2.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#1C4737]"
      />
      <span className="text-xs font-medium text-[#1A1A1A]">{label}</span>
    </label>
  );
};

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
        <div key={i} className="rounded-xl border border-[#D4C3B5]/70 bg-[#FBF9F6] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-[#1C4737] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
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
