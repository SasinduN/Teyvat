import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Plus, Save, Trash2 } from 'lucide-react';

import type { ImageCreditItem, MediaUsage } from '@shared/api';
import type { ImageCreditValues } from '@shared/image-credits';
import { COLLECTIONS } from '@/admin/collections';
import { ImagePreview } from '@/admin/components/ImagePicker';
import { Badge, Button, Card, EmptyState, ErrorNote, FieldHelp, FieldLabel, Input, PageHeader, Spinner } from '@/admin/components/ui';
import { createImageCredit, deleteImageCredit, listImageCredits, updateImageCredit } from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';

/**
 * Photo credits (`public.image_credits`): who took a photo and its licence,
 * keyed by the photo's URL. The public /photo-credits page lists the credits
 * of photos that published rows use. CC BY-SA photos must have one.
 */

interface Draft {
  author: string;
  license: string;
  license_url: string;
  source_url: string;
}

const EMPTY: Draft = { author: '', license: '', license_url: '', source_url: '' };

const draftOf = (item: ImageCreditItem): Draft => ({
  author: item.author,
  license: item.license,
  license_url: item.license_url ?? '',
  source_url: item.source_url ?? ''
});

/** Empty links are stored as NULL. */
const valuesOf = (d: Draft): ImageCreditValues => ({
  author: d.author,
  license: d.license,
  license_url: d.license_url.trim() || null,
  source_url: d.source_url.trim() || null
});

function usageLink(u: MediaUsage): { to: string; label: string } {
  const collection = COLLECTIONS.find((c) => c.table === u.table);
  return {
    to: collection ? `/admin/${collection.slug}/${encodeURIComponent(u.id)}` : '/admin',
    label: `${collection?.label ?? u.table}: ${u.title || u.id}`
  };
}

/** The four credit fields, with each field's error from a 400. */
const CreditFields: React.FC<{
  draft: Draft;
  onChange: (d: Draft) => void;
  errors?: Record<string, string>;
}> = ({ draft, onChange, errors }) => {
  const id = useId();
  const field = (name: keyof Draft, label: string, placeholder: string, required = false) => (
    <div className="space-y-1">
      <FieldLabel htmlFor={`${id}-${name}`} required={required}>
        {label}
      </FieldLabel>
      <Input
        id={`${id}-${name}`}
        value={draft[name]}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...draft, [name]: e.target.value })}
      />
      {errors?.[name] && <p className="text-[11px] text-[#B3261E]">{errors[name]}</p>}
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field('author', 'Photographer', 'Who took it', true)}
      {field('license', 'Licence', 'e.g. CC BY-SA 4.0', true)}
      {field('license_url', 'Licence link', 'https://creativecommons.org/…')}
      {field('source_url', 'Source link', 'https://commons.wikimedia.org/wiki/File:…')}
    </div>
  );
};

const fieldsOf = (e: unknown) => (e instanceof ApiRequestError ? e.fields : undefined);

const CreditCard: React.FC<{ item: ImageCreditItem; onSaved: () => void }> = ({ item, onSaved }) => {
  const [draft, setDraft] = useState<Draft>(() => draftOf(item));
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(draftOf(item));

  const save = async () => {
    setBusy('save');
    setErrors(undefined);
    try {
      await updateImageCredit(item.url, valuesOf(draft), item.updated_at);
      toast.success('Credit saved');
      onSaved();
    } catch (e) {
      setErrors(fieldsOf(e));
      toast.error(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await deleteImageCredit(item.url);
      toast.success('Credit deleted');
      onSaved();
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
        <ImagePreview url={item.url} className="h-32 w-full" />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {item.usedBy.length > 0 ? (
              <Badge tone="gold">Used by {item.usedBy.length}</Badge>
            ) : (
              <Badge tone="muted">Not used: not shown on the site</Badge>
            )}
            <span className="truncate font-mono text-[10px] text-[#1A1A1A]/50" title={item.url}>
              {item.url}
            </span>
          </div>
          {item.usedBy.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {item.usedBy.map((u) => {
                const link = usageLink(u);
                return (
                  <li key={`${u.table}/${u.id}`}>
                    <Link to={link.to} className="text-[#1C4737] underline">
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <CreditFields draft={draft} onChange={setDraft} errors={errors} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" icon={Save} loading={busy === 'save'} disabled={!changed} onClick={() => void save()}>
              Save
            </Button>
            {confirming ? (
              <>
                <Button type="button" variant="danger" loading={busy === 'delete'} onClick={() => void remove()}>
                  {item.usedBy.length > 0 ? 'Delete anyway' : 'Delete'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                {item.usedBy.length > 0 && (
                  <p className="w-full text-[11px] text-[#B3261E]">
                    This photo is on the site. Without a credit it disappears from the Photo Credits page.
                  </p>
                )}
              </>
            ) : (
              <Button type="button" variant="ghost" icon={Trash2} className="text-[#B3261E]" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const NewCredit: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | undefined>();
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button type="button" icon={Plus} onClick={() => setOpen(true)}>
        Add a credit
      </Button>
    );
  }

  const create = async () => {
    setBusy(true);
    setErrors(undefined);
    try {
      await createImageCredit({ url: url.trim(), ...valuesOf(draft) });
      toast.success('Credit added');
      setOpen(false);
      setUrl('');
      setDraft(EMPTY);
      onSaved();
    } catch (e) {
      setErrors(fieldsOf(e));
      toast.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="space-y-1">
        <FieldLabel htmlFor={`${id}-url`} required>
          Photo URL
        </FieldLabel>
        <Input id={`${id}-url`} value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
        <FieldHelp>Exactly as the record stores it: copy it from the media library or the record’s image field.</FieldHelp>
        {errors?.url && <p className="text-[11px] text-[#B3261E]">{errors.url}</p>}
      </div>
      <CreditFields draft={draft} onChange={setDraft} errors={errors} />
      <div className="flex gap-2">
        <Button type="button" icon={Save} loading={busy} onClick={() => void create()}>
          Add
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
};

export const ImageCreditsPage: React.FC = () => {
  const qc = useQueryClient();
  const credits = useQuery({ queryKey: queryKeys.admin.imageCredits, queryFn: listImageCredits });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.admin.imageCredits });
    // The public /photo-credits page reads these.
    void qc.invalidateQueries({ queryKey: queryKeys.siteContent });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Photo credits"
        description="Who took each photo, and the licence it’s shared under. The public Photo Credits page lists the credits of photos the published pages use. Photos under a CC BY licence must have one."
      />
      <NewCredit onSaved={refresh} />
      {credits.isError ? (
        <ErrorNote>{describeError(credits.error)}</ErrorNote>
      ) : credits.isPending ? (
        <Spinner label="Loading the credits" />
      ) : credits.data.length === 0 ? (
        <Card>
          <EmptyState icon={Camera} title="No credits yet">
            Add one for any photo whose licence asks for attribution.
          </EmptyState>
        </Card>
      ) : (
        credits.data.map((item) => <CreditCard key={`${item.url}@${item.updated_at}`} item={item} onSaved={refresh} />)
      )}
    </div>
  );
};
