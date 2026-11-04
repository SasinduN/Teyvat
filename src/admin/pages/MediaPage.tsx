import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, ImageOff, Trash2, TriangleAlert } from 'lucide-react';

import type { MediaItem, MediaUsage } from '@shared/api';
import { COLLECTIONS } from '@/admin/collections';
import { ImagePreview, useMediaLibrary } from '@/admin/components/ImagePicker';
import { describeError } from '@/lib/errors';
import { deleteMedia, prepareAndUpload, ACCEPT_ATTRIBUTE } from '@/lib/media';
import { queryKeys } from '@/lib/queryClient';
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Spinner } from '@/admin/components/ui';
import { cn } from '@/utils/cn';

/**
 * Every uploaded image. Nothing is deleted automatically: an image that no
 * row uses any more shows as "Unused" here until someone deletes it.
 */

const kb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;

const date = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

function usageLink(u: MediaUsage): { to: string; label: string } {
  const collection = COLLECTIONS.find((c) => c.table === u.table);
  return {
    to: collection ? `/admin/${collection.slug}/${encodeURIComponent(u.id)}` : '/admin',
    label: `${collection?.label ?? u.table}: ${u.title || u.id}`
  };
}

export const MediaPage: React.FC = () => {
  const qc = useQueryClient();
  const library = useMediaLibrary();
  const [filter, setFilter] = useState<'all' | 'unused'>('all');
  const [progress, setProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** The card asking "delete?" and, if it's in use, the rows that use it. */
  const [confirming, setConfirming] = useState<{ id: string; usedBy: MediaUsage[] } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: queryKeys.admin.media });

  const upload = async (files: File[]) => {
    setUploadError(null);
    try {
      for (const [i, file] of files.entries()) {
        const prefix = files.length > 1 ? `${i + 1} of ${files.length}: ` : '';
        setProgress(`${prefix}preparing…`);
        await prepareAndUpload(file, 'library', (f) => setProgress(`${prefix}${Math.round(f * 100)}%`));
      }
      toast.success(files.length > 1 ? `${files.length} images uploaded` : 'Image uploaded');
    } catch (e) {
      setUploadError(describeError(e));
    } finally {
      setProgress(null);
      refresh();
    }
  };

  const remove = async (item: MediaItem, force: boolean) => {
    setDeleting(item.id);
    try {
      const result = await deleteMedia(item.id, force);
      if (result.deleted) {
        setConfirming(null);
        toast.success('Image deleted');
        refresh();
      } else {
        // Someone started using it since the list loaded: show who.
        setConfirming({ id: item.id, usedBy: result.usedBy });
      }
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setDeleting(null);
    }
  };

  const items = library.data?.items ?? [];
  const shown = filter === 'unused' ? items.filter((i) => i.usedBy.length === 0) : items;
  const unusedCount = items.filter((i) => i.usedBy.length === 0).length;
  const uploadsEnabled = library.data?.uploadsEnabled !== false;

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Every uploaded image. Images are never deleted automatically: one that nothing uses any more shows as Unused until you delete it."
        actions={
          <label
            className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--inverse-surface)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-secondary)]',
              (!uploadsEnabled || progress) && 'pointer-events-none opacity-60'
            )}
          >
            <input
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              className="hidden"
              disabled={!uploadsEnabled || progress !== null}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length) void upload(files);
              }}
            />
            {progress ? `Uploading ${progress}` : 'Upload images'}
          </label>
        }
      />

      {!uploadsEnabled && (
        <div className="mb-4">
          <ErrorNote>Image uploads aren’t configured on this server. The library can still be browsed.</ErrorNote>
        </div>
      )}
      {uploadError && (
        <div className="mb-4">
          <ErrorNote>{uploadError}</ErrorNote>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(['all', 'unused'] as const).map((f) => (
          <Button key={f} type="button" variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${items.length})` : `Unused (${unusedCount})`}
          </Button>
        ))}
      </div>

      {library.isError ? (
        <ErrorNote>{describeError(library.error)}</ErrorNote>
      ) : library.isPending ? (
        <Spinner label="Loading the library" />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={ImageOff} title={filter === 'unused' ? 'Nothing unused' : 'No uploads yet'}>
            {filter === 'unused'
              ? 'Every uploaded image is in use somewhere.'
              : 'Images uploaded here or from any form appear in this library.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => {
            const asking = confirming?.id === item.id ? confirming : null;
            const busy = deleting === item.id;

            return (
              <Card key={item.id} className="overflow-hidden">
                <ImagePreview url={item.url} className="h-40 w-full rounded-none border-0 border-b" />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-[var(--text-primary)]/50">{item.folder}</span>
                    {item.usedBy.length > 0 ? (
                      <Badge tone="gold">Used by {item.usedBy.length}</Badge>
                    ) : (
                      <Badge tone="muted">Unused</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-primary)]/55">
                    {kb(item.bytes)} · {item.contentType.replace('image/', '').toUpperCase()} · {date(item.createdAt)}
                  </p>

                  {asking ? (
                    <div className="space-y-2 rounded-xl bg-[var(--danger)]/5 p-3">
                      {asking.usedBy.length > 0 ? (
                        <>
                          <p className="flex items-start gap-1.5 text-xs font-bold text-[var(--danger)]">
                            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                            Still in use. Deleting it leaves a broken image on:
                          </p>
                          <ul className="space-y-0.5 pl-5 text-xs">
                            {asking.usedBy.map((u) => {
                              const link = usageLink(u);
                              return (
                                <li key={`${u.table}/${u.id}`}>
                                  <Link to={link.to} className="text-[var(--brand-primary)] underline">
                                    {link.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      ) : (
                        <p className="text-xs text-[var(--text-primary)]/70">Delete this image for good?</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="danger"
                          className="px-3 py-2"
                          loading={busy}
                          onClick={() => void remove(item, asking.usedBy.length > 0)}
                        >
                          {asking.usedBy.length > 0 ? 'Delete anyway' : 'Delete'}
                        </Button>
                        <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => setConfirming(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        icon={Copy}
                        className="px-3 py-2"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(item.url)
                            .then(() => toast.success('URL copied'))
                            .catch(() => toast.error('Couldn’t copy. Select the URL from the image instead.'))
                        }
                      >
                        Copy URL
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        icon={Trash2}
                        className="px-3 py-2 text-[var(--danger)]"
                        disabled={!uploadsEnabled}
                        onClick={() => setConfirming({ id: item.id, usedBy: item.usedBy })}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
