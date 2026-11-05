import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImageOff, Images, Link2, Plus, Trash2, Upload, X } from 'lucide-react';

import type { MediaItem } from '@shared/api';
import { describeError } from '@/lib/errors';
import { ACCEPT_ATTRIBUTE, listMedia, prepareAndUpload } from '@/lib/media';
import { queryKeys } from '@/lib/queryClient';
import { Button, ErrorNote, Input, Select } from '@/admin/components/ui';
import { cn } from '@/utils/cn';

/**
 * The one image control every form uses. Three ways to set an image:
 *
 *   Upload   pick a file; it is resized in the browser and sent to our API
 *   Library  pick something already uploaded
 *   URL      paste https://… (the seeded Unsplash images keep working)
 *
 * When uploads aren't configured on the server, Upload says so and the other
 * two keep working.
 */

const UPLOADS_OFF = 'Image uploads aren’t configured on this server. Pick from the library or paste a URL.';

export function useMediaLibrary() {
  return useQuery({ queryKey: queryKeys.admin.media, queryFn: listMedia });
}

/* ------------------------------------------------------------- preview */

export const ImagePreview: React.FC<{ url: string; className: string }> = ({ url, className }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-strong)]/70 bg-[var(--background-secondary)]',
        className
      )}
    >
      {url && !broken ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <ImageOff
          className="h-5 w-5 text-[var(--text-primary)]/25"
          aria-label={url ? 'This URL does not load as an image' : 'No image'}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------- upload */

/**
 * Upload button plus its progress bar and errors. Several files go up one
 * after another, so a phone doesn't resize three 48 MP photos at once.
 */
const UploadButton: React.FC<{
  folder: string;
  multiple?: boolean;
  label: string;
  onUploaded: (item: MediaItem) => void;
}> = ({ folder, multiple, label, onUploaded }) => {
  const qc = useQueryClient();
  const library = useMediaLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ file: number; files: number; fraction: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = library.data?.uploadsEnabled !== false;

  const handleFiles = async (files: File[]) => {
    setError(null);
    try {
      for (const [i, file] of files.entries()) {
        setProgress({ file: i + 1, files: files.length, fraction: 0 });
        const item = await prepareAndUpload(file, folder, (fraction) =>
          setProgress({ file: i + 1, files: files.length, fraction })
        );
        onUploaded(item);
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
      void qc.invalidateQueries({ queryKey: queryKeys.admin.media });
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) void handleFiles(files);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        icon={Upload}
        loading={progress !== null}
        disabled={!enabled}
        title={enabled ? undefined : UPLOADS_OFF}
        onClick={() => input.current?.click()}
      >
        {progress
          ? `Uploading${progress.files > 1 ? ` ${progress.file} of ${progress.files}` : ''}…`
          : label}
      </Button>

      {progress && (
        <div
          className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--border-strong)]/40"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.fraction * 100)}
        >
          <div
            className="h-full rounded-full bg-[var(--brand-secondary)] transition-[width]"
            style={{ width: `${Math.round(progress.fraction * 100)}%` }}
          />
        </div>
      )}
      {!enabled && <p className="text-xs text-[var(--text-primary)]/50">{UPLOADS_OFF}</p>}
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
};

/* ------------------------------------------------------------- library */

export const MediaPickerModal: React.FC<{
  onPick: (url: string) => void;
  onClose: () => void;
}> = ({ onPick, onClose }) => {
  const library = useMediaLibrary();
  const [folder, setFolder] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = library.data?.items ?? [];
  const folders = [...new Set(items.map((i) => i.folder))].sort();
  const shown = folder ? items.filter((i) => i.folder === folder) : items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Media library">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)]/50 p-4">
          <h2 className="font-heading text-lg font-bold text-[var(--brand-primary)]">Choose from the library</h2>
          <div className="flex items-center gap-2">
            <Select value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder">
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Button type="button" variant="ghost" icon={X} onClick={onClose} aria-label="Close" />
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          {library.isError ? (
            <ErrorNote>{describeError(library.error)}</ErrorNote>
          ) : library.isPending ? (
            <p className="text-sm text-[var(--text-primary)]/60">Loading the library…</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-[var(--text-primary)]/60">Nothing uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onPick(item.url);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-[var(--border-strong)]/70 bg-[var(--surface)] text-left transition-colors hover:border-[var(--inverse-raised)]"
                >
                  <ImagePreview url={item.url} className="h-24 w-full rounded-none border-0" />
                  <div className="truncate px-2 py-1.5 text-xs text-[var(--text-primary)]/55">{item.folder}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------- single image */

interface ImagePickerProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  /** The upload folder, from the field's descriptor. */
  folder: string;
  /** Square thumb for avatars, wide thumb for cover images. */
  shape?: 'wide' | 'square';
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  folder,
  shape = 'wide'
}) => {
  const [picking, setPicking] = useState(false);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <ImagePreview url={value} className={shape === 'square' ? 'h-24 w-24' : 'h-24 w-40'} />

      <div className="flex min-w-[14rem] flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start gap-2">
          <UploadButton folder={folder} label={value ? 'Upload new' : 'Upload'} onUploaded={(item) => onChange(item.url)} />
          <Button type="button" variant="secondary" icon={Images} onClick={() => setPicking(true)}>
            Library
          </Button>
          {value && (
            <Button type="button" variant="ghost" icon={X} onClick={() => onChange('')}>
              Clear
            </Button>
          )}
        </div>

        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--brand-primary)]/45" />
          <Input
            id={id}
            type="url"
            inputMode="url"
            spellCheck={false}
            placeholder="or paste https://…"
            value={value}
            className={cn('pl-10', invalid && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]')}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>

      {picking && <MediaPickerModal onPick={onChange} onClose={() => setPicking(false)} />}
    </div>
  );
};

/* ---------------------------------------------------------- image list */

export const ImageListPicker: React.FC<{
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
}> = ({ value, onChange, folder }) => {
  const [picking, setPicking] = useState(false);
  // Uploads finish one at a time; append to the latest list, not a stale one.
  const latest = useRef(value);
  latest.current = value;

  const setAt = (index: number, url: string) => onChange(value.map((v, i) => (i === index ? url : v)));
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

      <div className="flex flex-wrap items-start gap-2">
        <UploadButton
          folder={folder}
          multiple
          label="Upload images"
          onUploaded={(item) => onChange([...latest.current, item.url])}
        />
        <Button type="button" variant="secondary" icon={Images} onClick={() => setPicking(true)}>
          From library
        </Button>
        <Button type="button" variant="ghost" icon={Plus} onClick={() => onChange([...value, ''])}>
          Add URL
        </Button>
      </div>

      {picking && (
        <MediaPickerModal onPick={(url) => onChange([...latest.current, url])} onClose={() => setPicking(false)} />
      )}
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
    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-secondary)]/10 disabled:opacity-30"
  >
    {children}
  </button>
);
