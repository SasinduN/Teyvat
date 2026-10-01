import React from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { CircleAlert } from 'lucide-react';
import type { Field } from '@/admin/collections';
import { FieldHelp, FieldLabel, Input, Select, Textarea } from '@/admin/components/ui';
import { ImageListPicker, ImagePicker } from '@/admin/components/ImagePicker';
import { type StopDraft, TourStopsField } from '@/admin/components/TourStopsField';
import {
  type ItineraryDay,
  ItineraryField,
  MultiSelectField,
  StringListField,
  ToggleField
} from '@/admin/components/fields';
import { cn } from '@/utils/cn';

export type FormValues = Record<string, unknown>;

interface RecordFormProps {
  fields: Field[];
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  /** Slug is editable on create and locked on edit — the site references ids. */
  lockSlug: boolean;
  /** Something small to show at the end of a field's label row, by field name. */
  labelExtras?: Partial<Record<string, React.ReactNode>>;
}

/* ---------------------------------------------------- coercion for display */

const asString = (v: unknown): string =>
  typeof v === 'string' ? v : v == null ? '' : String(v);

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const asItinerary = (v: unknown): ItineraryDay[] =>
  Array.isArray(v) ? (v as ItineraryDay[]) : [];

const asStops = (v: unknown): StopDraft[] => (Array.isArray(v) ? (v as StopDraft[]) : []);

/* ------------------------------------------------------------------------- */

export const RecordForm: React.FC<RecordFormProps> = ({
  fields,
  control,
  errors,
  lockSlug,
  labelExtras
}) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
    {fields.map((field) => {
      const error = errors[field.name];
      // The stops editor shows each row's messages on the row itself; only a
      // message about the whole list ("Add at least one stop.") goes below.
      const message =
        field.type === 'tourStops' ? listMessage(error) : extractMessage(error);
      const extra = labelExtras?.[field.name];
      const label = (
        <FieldLabel htmlFor={`field-${field.name}`} required={field.required}>
          {field.label}
        </FieldLabel>
      );

      return (
        <div
          key={field.name}
          className={cn('space-y-2', (field.span ?? 1) === 2 && 'sm:col-span-2')}
        >
          {/* Toggles carry their own label inside the control. */}
          {field.type !== 'boolean' &&
            (extra ? (
              <div className="flex items-center justify-between gap-3">
                {label}
                {extra}
              </div>
            ) : (
              label
            ))}

          <Controller
            name={field.name}
            control={control}
            render={({ field: rhf }) =>
              renderControl(field, rhf.value, rhf.onChange, rhf.onBlur, lockSlug, !!message, error)
            }
          />

          {message && (
            <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#B3261E]">
              <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              {message}
            </p>
          )}

          {field.help && !message && <FieldHelp>{field.help}</FieldHelp>}
        </div>
      );
    })}
  </div>
);

/**
 * Pulls a message out of a react-hook-form error, including the nested shape
 * array fields produce (e.g. an itinerary day missing its title).
 */
function extractMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const e = error as { message?: unknown; root?: unknown };
  if (typeof e.message === 'string' && e.message) return e.message;
  if (e.root) return extractMessage(e.root);

  if (Array.isArray(error)) {
    for (const entry of error) {
      if (!entry || typeof entry !== 'object') continue;
      for (const value of Object.values(entry as Record<string, unknown>)) {
        const nested = extractMessage(value);
        if (nested) return nested;
      }
    }
  }

  return null;
}

/** A message on an array field itself, not on one of its entries. */
function listMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { message?: unknown; root?: { message?: unknown } };
  if (typeof e.message === 'string' && e.message) return e.message;
  if (typeof e.root?.message === 'string' && e.root.message) return e.root.message;
  return null;
}

function renderControl(
  field: Field,
  value: unknown,
  onChange: (next: unknown) => void,
  onBlur: () => void,
  lockSlug: boolean,
  invalid: boolean,
  error: unknown
): React.ReactElement {
  const id = `field-${field.name}`;
  const errorRing = invalid ? 'border-[#B3261E] focus:border-[#B3261E] focus:ring-[#B3261E]' : '';

  switch (field.type) {
    case 'slug':
      return (
        <Input
          id={id}
          value={asString(value)}
          disabled={lockSlug}
          spellCheck={false}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'text':
      return (
        <Input
          id={id}
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'textarea':
      return (
        <Textarea
          id={id}
          rows={field.rows ?? 3}
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step ?? 'any'}
          // Kept as the raw string while typing so the box can be cleared or
          // hold "4." mid-entry; Zod coerces it on submit.
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={asString(value).slice(0, 10)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'select':
      return (
        <Select
          id={id}
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        >
          {field.allowEmpty && <option value="">— None —</option>}
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );

    case 'multiselect':
      return (
        <MultiSelectField
          value={asStringArray(value)}
          options={field.options}
          onChange={onChange}
        />
      );

    case 'boolean':
      return <ToggleField value={value === true} label={field.label} onChange={onChange} />;

    case 'image':
      return (
        <ImagePicker
          id={id}
          value={asString(value)}
          folder={field.folder}
          invalid={invalid}
          shape={field.name === 'author_avatar' ? 'square' : 'wide'}
          onBlur={onBlur}
          onChange={onChange}
        />
      );

    case 'imageList':
      return <ImageListPicker value={asStringArray(value)} folder={field.folder} onChange={onChange} />;

    case 'email':
      return (
        <Input
          id={id}
          type="email"
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'link':
      return (
        <Input
          id={id}
          type="url"
          inputMode="url"
          spellCheck={false}
          placeholder="https://… (leave empty if there is none)"
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'whatsapp':
      return (
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          spellCheck={false}
          placeholder="94771234567 (leave empty to hide the button)"
          value={asString(value)}
          className={errorRing}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'stringList':
      return (
        <StringListField
          value={asStringArray(value)}
          multiline={field.multiline}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );

    case 'itinerary':
      return <ItineraryField value={asItinerary(value)} onChange={onChange} />;

    case 'tourStops':
      return <TourStopsField value={asStops(value)} onChange={onChange} errors={error} />;
  }
}
