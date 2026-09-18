import React, { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImageOff, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  ACCEPT_ATTRIBUTE,
  deleteImageByUrl,
  isStorageUrl,
  uploadImage,
  validateImage
} from '@/lib/storage';
import { describeError } from '@/lib/supabase';
import { Button, ErrorNote, Input, Textarea } from '@/admin/components/ui';
import { cn } from '@/utils/cn';

/* ------------------------------------------------------------- image field */

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  /** Square thumb for avatars, wide thumb for cover images. */
  shape?: 'wide' | 'square';
}

/**
 * Uploads to Supabase Storage and stores the returned public URL.
 * There is intentionally no "paste a URL" input: images must be owned by us.
 */
export const ImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  folder,
  shape = 'wide'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const handleFile = async (file: File) => {
    const problem = validateImage(file);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const previous = value;
      const url = await uploadImage(file, folder);
      setBroken(false);
      onChange(url);

      // Only clean up files we own. Seeded Unsplash URLs are left alone.
      if (previous && isStorageUrl(previous)) {
        void deleteImageByUrl(previous);
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D4C3B5]/70 bg-[#F5EFEB]',
            shape === 'square' ? 'h-24 w-24' : 'h-24 w-40'
          )}
        >
          {value && !broken ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <ImageOff className="h-5 w-5 text-[#1A1A1A]/25" />
          )}
        </div>

        <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Upload}
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              {value ? 'Replace image' : 'Upload image'}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                icon={X}
                onClick={() => {
                  if (isStorageUrl(value)) void deleteImageByUrl(value);
                  setBroken(false);
                  onChange('');
                }}
              >
                Remove
              </Button>
            )}
          </div>

          {value && (
            <p className="break-all text-[11px] font-light text-[#1A1A1A]/45">{value}</p>
          )}
          <p className="text-[11px] font-light text-[#1A1A1A]/50">
            JPEG, PNG, WebP, AVIF or GIF · up to 10 MB
          </p>
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
};

/* -------------------------------------------------------- image list field */

export const ImageListField: React.FC<{
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
}> = ({ value, onChange, folder }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const problem = validateImage(file);
        if (problem) throw new Error(`${file.name}: ${problem}`);
        uploaded.push(await uploadImage(file, folder));
      }
      onChange([...value, ...uploaded]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    const url = value[index];
    if (isStorageUrl(url)) void deleteImageByUrl(url);
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative overflow-hidden rounded-xl border border-[#D4C3B5]/70 bg-[#F5EFEB]"
            >
              <img src={url} alt="" className="h-24 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/55 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <div className="flex gap-1">
                  <IconMini label="Move left" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3 w-3 -rotate-90" />
                  </IconMini>
                  <IconMini
                    label="Move right"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                  >
                    <ArrowDown className="h-3 w-3 -rotate-90" />
                  </IconMini>
                </div>
                <IconMini label="Remove image" onClick={() => removeAt(i)}>
                  <Trash2 className="h-3 w-3" />
                </IconMini>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />

      <Button
        type="button"
        variant="secondary"
        icon={Upload}
        loading={busy}
        onClick={() => inputRef.current?.click()}
      >
        Add images
      </Button>

      {error && <ErrorNote>{error}</ErrorNote>}
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
    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-[#0F2E23] transition-colors hover:bg-white disabled:opacity-30"
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
