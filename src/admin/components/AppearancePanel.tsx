import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Palette as PaletteIcon, RotateCcw, X } from 'lucide-react';

import { SITE_SETTINGS_COLUMNS, type SiteSettingsValues } from '@shared/content-schema';
import { DEFAULT_MODE_LABELS, DEFAULT_MODES, type DefaultMode } from '@shared/default-mode';
import { PALETTE_LABELS, PALETTES, type Palette } from '@shared/palette';
import type { SiteSettingsRow } from '@shared/database.types';
import { getSiteSettings, updateSiteSettings } from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';
import { useModalFocus } from '@/hooks/useModalFocus';
import { cn } from '@/utils/cn';
import { Button, ErrorNote, Spinner } from '@/admin/components/ui';
import {
  adoptSavedAppearance,
  endAppearancePreview,
  modeTheme,
  previewAppearance,
  sameAppearance,
  savedAppearance,
  useAppearanceDraft,
  type Appearance
} from '@/admin/appearance';

/**
 * Admin → Appearance (handoff Task 7): the site's default mode for first-time visitors
 * (`site_settings.default_mode`) and its colour theme (`site_settings.palette`).
 *
 * The top bar's button opens it as a popover (a bottom sheet on phones); Admin → Settings
 * shows the same panel inline. A choice is previewed on this tab at once and saved for every
 * visitor only with "Save for all visitors" (the settings API, with its 409 check). Cancel or
 * closing puts the page back. Each group is a radiogroup with a roving tabindex: Tab reaches
 * the chosen option, arrow keys move and choose.
 */

export const SAVED_MESSAGE = 'Appearance saved. Visitors see it on their next page load.';

/** A radiogroup's keyboard: arrows move and choose (wrapping), Home and End jump. */
function useRovingRadios<T extends string>(values: readonly T[], value: T, choose: (next: T) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = values.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    choose(values[next]);
    refs.current[next]?.focus();
  };
  const optionProps = (option: T, index: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[index] = el;
    },
    type: 'button' as const,
    role: 'radio',
    'aria-checked': option === value,
    tabIndex: option === value ? 0 : -1,
    onClick: () => choose(option),
    onKeyDown: (event: React.KeyboardEvent) => onKeyDown(event, index)
  });
  return optionProps;
}

/** A tiny drawing of the site in `palette`, light or dark. */
const ThumbLayer: React.FC<{ palette: Palette; theme: 'light' | 'dark' }> = ({ palette, theme }) => (
  <span className="te-mode-thumb__layer" data-palette={palette} data-theme={theme}>
    <span className="te-mode-thumb__side">
      <span className="te-mode-thumb__dot" />
      <span className="te-mode-thumb__line" />
      <span className="te-mode-thumb__line" />
    </span>
    <span className="te-mode-thumb__main">
      <span className="te-mode-thumb__line te-mode-thumb__line--head" />
      <span className="te-mode-thumb__line" />
      <span className="te-mode-thumb__line te-mode-thumb__line--accent" />
    </span>
  </span>
);

const ModeThumb: React.FC<{ palette: Palette; mode: DefaultMode }> = ({ palette, mode }) => (
  <span className="te-mode-thumb" aria-hidden="true" data-mode-thumb={mode}>
    {mode === 'auto' ? (
      <>
        <ThumbLayer palette={palette} theme="light" />
        <ThumbLayer palette={palette} theme="dark" />
      </>
    ) : (
      <ThumbLayer palette={palette} theme={mode} />
    )}
  </span>
);

export const AppearancePanel: React.FC<{
  variant: 'popover' | 'inline';
  /** The popover: close it (the close button, or after a save or Cancel). */
  onClose?: () => void;
  titleId?: string;
}> = ({ variant, onClose, titleId }) => {
  const qc = useQueryClient();
  const [conflict, setConflict] = useState<string | null>(null);
  const modeLabel = useId();
  const themeLabel = useId();
  const current = useQuery({ queryKey: queryKeys.admin.siteSettings, queryFn: getSiteSettings });
  const draft = useAppearanceDraft();
  const root = useRef<HTMLDivElement>(null);

  // Opened before the settings arrived: focus went to the dialog or its close button (the only
  // control while loading); the chosen mode takes it once they're here.
  const loaded = Boolean(current.data);
  useEffect(() => {
    if (variant !== 'popover' || !loaded) return;
    const dialog = root.current?.closest<HTMLElement>('[role="dialog"]');
    const active = document.activeElement;
    if (dialog && (active === dialog || (active instanceof HTMLElement && active.hasAttribute('data-appearance-close') && dialog.contains(active)))) {
      root.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    }
  }, [variant, loaded]);

  // Leaving Settings ends an inline preview, like closing the popover does.
  useEffect(() => (variant === 'inline' ? () => endAppearancePreview() : undefined), [variant]);

  const save = useMutation({
    mutationFn: (next: Appearance) => {
      const row = current.data;
      if (!row) throw new Error('The settings have not finished loading.');
      // The whole row as saved, with only these two changed: the API replaces every setting.
      const values = Object.fromEntries(SITE_SETTINGS_COLUMNS.map((c) => [c, row[c as keyof SiteSettingsRow]]));
      values.palette = next.palette;
      values.default_mode = next.mode;
      return updateSiteSettings(values as unknown as SiteSettingsValues, row.updated_at);
    },
    onSuccess: (saved) => {
      qc.setQueryData(queryKeys.admin.siteSettings, saved);
      adoptSavedAppearance(saved);
      setConflict(null);
      toast.success(SAVED_MESSAGE);
      onClose?.();
    },
    onError: (e) => {
      if (e instanceof ApiRequestError && e.status === 409) setConflict(describeError(e));
      else toast.error(describeError(e));
    }
  });

  const saved = current.data ? savedAppearance(current.data) : null;
  const shown = draft ?? saved;
  const dirty = Boolean(draft && saved && !sameAppearance(draft, saved));
  const choose = (change: Partial<Appearance>) => shown && previewAppearance({ ...shown, ...change });
  const modeProps = useRovingRadios(DEFAULT_MODES, shown?.mode ?? 'light', (mode) => choose({ mode }));
  const themeProps = useRovingRadios(PALETTES, shown?.palette ?? 'sunset', (palette) => choose({ palette }));

  // The popover's title row has a close button: phones have no Escape key, and the scrim isn't
  // obviously tappable. Closing ends an unsaved preview, as Escape and Cancel do.
  const title = (
    <div className="te-appearance__head">
      <h2 id={titleId} className="te-appearance__title">
        Appearance
      </h2>
      {variant === 'popover' && onClose && (
        <button type="button" className="te-appearance__close" aria-label="Close" onClick={onClose} data-appearance-close>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );

  if (!shown) {
    return (
      <div className="te-appearance">
        <div className="te-appearance__body">
          {title}
          {current.isError ? <ErrorNote>{describeError(current.error)}</ErrorNote> : <Spinner label="Loading the appearance" />}
        </div>
      </div>
    );
  }

  const previewed = modeTheme(shown.mode);

  return (
    <div ref={root} className={cn('te-appearance', variant === 'inline' && 'te-appearance--inline')} data-appearance-panel={variant}>
      <div className="te-appearance__body">
        {title}

        <div className="space-y-2">
          <div id={modeLabel} className="te-appearance__label">
            Default mode for visitors
          </div>
          <div role="radiogroup" aria-labelledby={modeLabel} className="te-appearance__modes" data-appearance-modes>
            {DEFAULT_MODES.map((mode, index) => (
              <button
                key={mode}
                {...modeProps(mode, index)}
                data-mode={mode}
                data-autofocus={mode === shown.mode ? '' : undefined}
                className="te-appearance-option te-appearance-option--mode"
              >
                <ModeThumb palette={shown.palette} mode={mode} />
                <span className="te-appearance-option__name">{DEFAULT_MODE_LABELS[mode]}</span>
              </button>
            ))}
          </div>
        </div>

        <hr className="te-appearance__divider" />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <div id={themeLabel} className="te-appearance__label">
              Theme
            </div>
            <span className="te-appearance__hint" data-appearance-hint>
              showing {previewed} versions
            </span>
          </div>
          <div role="radiogroup" aria-labelledby={themeLabel} className="te-appearance__themes" data-appearance-themes>
            {PALETTES.map((palette, index) => (
              <button
                key={palette}
                {...themeProps(palette, index)}
                data-palette-option={palette}
                className="te-appearance-option te-appearance-option--theme"
              >
                <span className="te-theme-swatch" data-palette={palette} data-theme={previewed} aria-hidden="true">
                  {palette === shown.palette && <Check />}
                </span>
                <span className="te-appearance-option__name">{PALETTE_LABELS[palette].name}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="te-appearance__note">
          Applies to every visitor on their next page load. Visitors can still switch between light and dark. Only admins
          can change these.
        </p>

        {conflict && (
          <div className="space-y-2">
            <ErrorNote>{conflict}</ErrorNote>
            <Button
              type="button"
              variant="secondary"
              icon={RotateCcw}
              onClick={() => {
                setConflict(null);
                void current.refetch();
              }}
            >
              Load the saved settings (keeps this preview)
            </Button>
          </div>
        )}
      </div>

      {dirty && (
        <div className="te-appearance__footer" data-appearance-footer>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConflict(null);
              endAppearancePreview();
              onClose?.();
            }}
          >
            Cancel
          </Button>
          <Button type="button" loading={save.isPending} onClick={() => draft && save.mutate(draft)}>
            Save for all visitors
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * The admin top bar's Appearance button and its popover. Escape, a click outside, the close
 * button or Cancel close it and end the preview; focus goes back to the button.
 */
export const AppearanceButton: React.FC<{ className?: string }> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({ top: 64, right: 16 });

  const close = () => {
    endAppearancePreview();
    setOpen(false);
  };
  const panel = useModalFocus(open, close);
  // Loaded with the page, so the panel opens with the saved choice and focus on it.
  useQuery({ queryKey: queryKeys.admin.siteSettings, queryFn: getSiteSettings });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = button.current?.getBoundingClientRect();
      // clientWidth: a fixed box's right is measured from the viewport without the scrollbar's gutter.
      if (rect) setAnchor({ top: Math.round(rect.bottom + 8), right: Math.max(8, Math.round(document.documentElement.clientWidth - rect.right)) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  // A click anywhere outside the panel closes it (the page behind is inert, so it lands on the
  // layer). On the click, not the press: the browser's own focus change on mousedown is over by
  // then, so focus goes back to the button and stays. A press that starts inside (a drag out of
  // the panel) doesn't count.
  useEffect(() => {
    if (!open) return;
    let pressedInside = false;
    const inside = (event: Event) => Boolean(panel.current?.contains(event.target as Node));
    const onPointerDown = (event: PointerEvent) => {
      pressedInside = inside(event);
    };
    const onClick = (event: MouseEvent) => {
      if (!pressedInside && !inside(event)) close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={cn('te-appearance-button', className)}
        aria-label="Appearance"
        title="Appearance"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        data-appearance-button
      >
        <span className="te-appearance-button__circle">
          <PaletteIcon className="h-5 w-5" aria-hidden="true" />
        </span>
      </button>
      {open &&
        createPortal(
          // `te-admin`: the admin's focus rings and scrollbars, outside the layout's tree.
          <div className="te-admin te-appearance-layer" data-appearance-layer>
            <div className="te-appearance-scrim" aria-hidden="true" />
            <div
              ref={panel}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="te-appearance-popover"
              style={{ '--popover-top': `${anchor.top}px`, '--popover-right': `${anchor.right}px` } as React.CSSProperties}
              data-appearance-popover
            >
              <AppearancePanel variant="popover" onClose={close} titleId={titleId} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
