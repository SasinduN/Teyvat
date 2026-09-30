import React, { useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, ImageOff, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@/admin/components/ui';
import { cn } from '@/utils/cn';

/* ------------------------------------------------------------- image field */

/** Until uploads arrive (phase 5, Cloudflare R2), images are pasted as URLs. */
const IMAGE_URL_HELP = 'Paste an image URL (https://). Uploads arrive in a later update.';

/** A thumbnail that says so when the URL doesn't load as an image. */
const ImagePreview: React.FC<{ url: string; className: string }> = ({ url, className }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D4C3B5]/70 bg-[#F5EFEB]',
        className
      )}
    >
      {url && !broken ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <ImageOff
          className="h-5 w-5 text-[#1A1A1A]/25"
          aria-label={url ? 'This URL does not load as an image' : 'No image'}
        />
      )}
    </div>
  );
};

interface ImageFieldProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  /** Square thumb for avatars, wide thumb for cover images. */
  shape?: 'wide' | 'square';
}

/** A URL box with a live preview. The API accepts https:// URLs only. */
export const ImageField: React.FC<ImageFieldProps> = ({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  shape = 'wide'
}) => (
  <div className="flex flex-wrap items-start gap-4">
    <ImagePreview url={value} className={shape === 'square' ? 'h-24 w-24' : 'h-24 w-40'} />

    <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
      <Input
        id={id}
        type="url"
        inputMode="url"
        spellCheck={false}
        placeholder="https://…"
        value={value}
        className={cn(invalid && 'border-[#B3261E] focus:border-[#B3261E] focus:ring-[#B3261E]')}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] font-light text-[#1A1A1A]/50">{IMAGE_URL_HELP}</p>
    </div>
  </div>
);

/* -------------------------------------------------------- image list field */

export const ImageListField: React.FC<{
  value: string[];
  onChange: (urls: string[]) => void;
}> = ({ value, onChange }) => {
  const setAt = (index: number, url: string) =>
    onChange(value.map((v, i) => (i === index ? url : v)));

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((url, i) => (
        <div key={i} className="flex items-center gap-3">
          <ImagePreview url={url} className="h-14 w-20" />
          <Input
            type="url"
            inputMode="url"
            spellCheck={false}
            placeholder="https://…"
            value={url}
            aria-label={`Image ${i + 1} URL`}
            onChange={(e) => setAt(i, e.target.value)}
          />
          <div className="flex shrink-0 gap-1">
            <IconMini label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="h-3 w-3" />
            </IconMini>
            <IconMini label="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
              <ArrowDown className="h-3 w-3" />
            </IconMini>
            <IconMini label="Remove image" onClick={() => removeAt(i)}>
              <Trash2 className="h-3 w-3" />
            </IconMini>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" icon={Plus} onClick={() => onChange([...value, ''])}>
        Add image URL
      </Button>
      <p className="text-[11px] font-light text-[#1A1A1A]/50">{IMAGE_URL_HELP}</p>
    </div>
  );
};

const IconMini: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className="flex h-7 w-7 items-center justify-center rounded-md text-[#1C4737] transition-colors hover:bg-[#1C4737]/10 disabled:opacity-30"
  >
    {children}
  </button>
);

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

const IconGhost: React.FC<{
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
