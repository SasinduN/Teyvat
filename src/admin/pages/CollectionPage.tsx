import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileQuestion,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react';

import { findCollection, SPOTLIGHT_NOTICE } from '@/admin/collections';
import { deleteRow, listRows, reorderRows, setPublished } from '@/lib/api/admin';
import { describeError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  FieldLabel,
  Input,
  PageHeader,
  Select,
  Spinner
} from '@/admin/components/ui';
import { cn } from '@/utils/cn';

type Row = Record<string, unknown> & { id: string; published: boolean; sort_order: number };

export const CollectionPage: React.FC = () => {
  const { collection: slug } = useParams();
  const collection = findCollection(slug);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setSearch('');
    setConfirmId(null);
  }, [slug]);

  const list = useQuery({
    queryKey: collection
      ? queryKeys.admin.collection(collection.table)
      : ['admin', 'collection', 'none'],
    queryFn: () => listRows(collection!.table) as Promise<unknown> as Promise<Row[]>,
    enabled: Boolean(collection)
  });

  const rows = list.data;

  /** Anything that changed rows also changed what the public site renders. */
  const invalidate = () => {
    if (!collection) return;
    void qc.invalidateQueries({ queryKey: queryKeys.admin.collection(collection.table) });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.counts });
    void qc.invalidateQueries({ queryKey: queryKeys.siteContent });
  };

  const togglePublished = useMutation({
    mutationFn: (row: Row) => setPublished(collection!.table, row.id, !row.published),
    onSuccess: (_data, row) => {
      invalidate();
      toast.success(row.published ? 'Moved to drafts' : 'Published');
    },
    onError: (e) => toast.error(describeError(e))
  });

  const reorder = useMutation({
    mutationFn: ({ ids }: { ids: string[]; movedId: string }) =>
      reorderRows(collection!.table, ids),
    // Optimistic: the arrows should feel instant.
    onMutate: async ({ ids }) => {
      if (!collection) return;
      const key = queryKeys.admin.collection(collection.table);
      await qc.cancelQueries({ queryKey: key });

      const previous = qc.getQueryData<Row[]>(key);
      if (previous) {
        const byId = new Map(previous.map((r) => [r.id, r]));
        qc.setQueryData<Row[]>(
          key,
          ids.map((id, i) => ({ ...(byId.get(id) as Row), sort_order: i }))
        );
      }
      return { previous, key };
    },
    onError: (e, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
      toast.error(describeError(e));
    },
    onSettled: invalidate
  });

  // Images are pasted URLs until phase 5, so there is nothing of ours to
  // clean up when a record goes.
  const remove = useMutation({
    mutationFn: (row: Row) => deleteRow(collection!.table, row.id),
    onSuccess: () => {
      invalidate();
      setConfirmId(null);
      toast.success(`${collection?.singular ?? 'Record'} deleted`);
    },
    onError: (e) => toast.error(describeError(e))
  });

  // Attractions: the list by destination, kept in the URL so the form can come back to it.
  const filterBy = collection?.filterBy;
  const [params, setParams] = useSearchParams();
  const filterValue = filterBy ? (params.get(filterBy.field) ?? '') : '';
  const destinations = useQuery({
    queryKey: queryKeys.admin.collection('destinations'),
    queryFn: () => listRows('destinations') as Promise<unknown> as Promise<Row[]>,
    enabled: Boolean(filterBy)
  });
  const destinationName = useMemo(
    () => new Map((destinations.data ?? []).map((d) => [d.id, String(d.name ?? d.id)])),
    [destinations.data]
  );
  // Destinations: how many attractions each would take with it if deleted.
  const attractions = useQuery({
    queryKey: queryKeys.admin.collection('attractions'),
    queryFn: () => listRows('attractions') as Promise<unknown> as Promise<Row[]>,
    enabled: collection?.table === 'destinations'
  });
  const attractionsOf = (id: string) => (attractions.data ?? []).filter((a) => a.destination_id === id).length;

  /** The rows the filter shows, in their order: reordering moves a row past its neighbour here. */
  const inFilter = useMemo(
    () => (rows && filterBy && filterValue ? rows.filter((r) => r[filterBy.field] === filterValue) : rows),
    [rows, filterBy, filterValue]
  );

  const filtered = useMemo(() => {
    if (!inFilter || !collection) return inFilter;
    const term = search.trim().toLowerCase();
    if (!term) return inFilter;

    return inFilter.filter((r) =>
      [collection.titleField, collection.subtitleField, collection.metaField, 'id']
        .filter(Boolean)
        .some((f) => String(r[f as string] ?? '').toLowerCase().includes(term))
    );
  }, [inFilter, search, collection]);

  /**
   * Destinations: which featured rows the public spotlight actually shows. It
   * takes the first 6 published, featured rows in sort order
   * (`DestinationSpotlight`), and the list is already in sort order.
   */
  const spotlightIds = useMemo(() => {
    if (collection?.table !== 'destinations' || !rows) return new Set<string>();
    return new Set(
      rows
        .filter((r) => r.featured === true && r.published)
        .slice(0, 6)
        .map((r) => r.id)
    );
  }, [collection, rows]);

  /**
   * Hero slides: the last published slide can't be unpublished or deleted.
   * The API refuses it regardless; this just says why before anyone tries.
   */
  const lastPublishedHeroId = useMemo(() => {
    if (collection?.table !== 'hero_slides' || !rows) return null;
    const published = rows.filter((r) => r.published);
    return published.length === 1 ? published[0].id : null;
  }, [collection, rows]);

  if (!collection) return <Navigate to="/admin" replace />;

  const busyId =
    (togglePublished.isPending && togglePublished.variables?.id) ||
    (remove.isPending && remove.variables?.id) ||
    (reorder.isPending && reorder.variables?.movedId) ||
    null;

  /**
   * Swaps a row with its neighbour in the list as shown (filtered or not). The two trade
   * places in the whole table's order and nothing else moves, so the API still gets every
   * row, as it requires.
   */
  const handleMove = (row: Row, delta: number) => {
    if (!rows || !inFilter) return;
    const at = inFilter.indexOf(row);
    const other = inFilter[at + delta];
    if (at < 0 || !other) return;

    const next = [...rows];
    const i = rows.indexOf(row);
    const j = rows.indexOf(other);
    [next[i], next[j]] = [next[j], next[i]];
    reorder.mutate({ ids: next.map((r) => r.id), movedId: row.id });
  };

  const searching = search.trim().length > 0;

  return (
    <div>
      <PageHeader
        title={collection.label}
        description={collection.description}
        actions={
          <Link to={`/admin/${collection.slug}/new${filterBy && filterValue ? `?${filterBy.field}=${encodeURIComponent(filterValue)}` : ''}`}>
            <Button icon={Plus}>New {collection.singular}</Button>
          </Link>
        }
      />

      {filterBy && (
        <div className="mb-4 max-w-sm space-y-2">
          <FieldLabel htmlFor="collection-filter">{filterBy.label}</FieldLabel>
          <Select
            id="collection-filter"
            value={filterValue}
            data-collection-filter
            onChange={(e) =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                if (e.target.value) next.set(filterBy.field, e.target.value);
                else next.delete(filterBy.field);
                return next;
              }, { replace: true })
            }
          >
            <option value="">All destinations</option>
            {[...(destinations.data ?? [])]
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {String(d.name)}{d.published ? '' : ' (draft)'}
                </option>
              ))}
          </Select>
        </div>
      )}

      {collection.table === 'destinations' && (
        <p className="-mt-2 mb-4 text-xs font-medium text-[var(--brand-primary)]">
          Spotlight: {SPOTLIGHT_NOTICE}
        </p>
      )}

      {list.isError && (
        <div className="mb-4">
          <ErrorNote>{describeError(list.error)}</ErrorNote>
        </div>
      )}

      {list.isPending ? (
        <Spinner label={`Loading ${collection.label.toLowerCase()}`} />
      ) : !rows || rows.length === 0 ? (
        <Card>
          <EmptyState icon={FileQuestion} title={`No ${collection.label.toLowerCase()} yet`}>
            Create the first one — it will appear on the public site as soon as it is published.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--brand-primary)]/45" />
            <Input
              className="pl-10"
              placeholder={`Search ${collection.label.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card className="divide-y divide-[var(--border-strong)]/45 overflow-hidden">
            {filtered?.length === 0 ? (
              <EmptyState
                icon={Search}
                title={searching ? 'Nothing matches that search' : `No ${collection.label.toLowerCase()} for this ${filterBy?.label.toLowerCase() ?? 'filter'} yet`}
              />
            ) : (
              filtered?.map((row) => {
                const index = inFilter?.indexOf(row) ?? -1;
                const shown = inFilter?.length ?? 0;
                const image = collection.imageField ? row[collection.imageField] : undefined;
                const keepsHero = row.id === lastPublishedHeroId;
                const title = String(row[collection.titleField] ?? row.id);
                const subtitle = collection.subtitleField
                  ? String(row[collection.subtitleField] ?? '')
                  : '';
                const metaValue = collection.metaField ? String(row[collection.metaField] ?? '') : '';
                // An attraction's destination by name, once the names have loaded.
                const meta = filterBy && collection.metaField === filterBy.field ? (destinationName.get(metaValue) ?? metaValue) : metaValue;
                const cascade = collection.table === 'destinations' ? attractionsOf(row.id) : 0;
                const isBusy = busyId === row.id;

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-center gap-4 p-3.5 transition-opacity sm:p-4',
                      isBusy && 'opacity-50'
                    )}
                  >
                    {/* Reorder */}
                    <div className="hidden shrink-0 flex-col gap-0.5 sm:flex">
                      <MoveButton
                        label="Move up"
                        disabled={searching || index <= 0 || isBusy}
                        onClick={() => handleMove(row, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </MoveButton>
                      <MoveButton
                        label="Move down"
                        disabled={searching || index < 0 || index === shown - 1 || isBusy}
                        onClick={() => handleMove(row, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </MoveButton>
                    </div>

                    {/* Thumb */}
                    <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--background-secondary)]">
                      {typeof image === 'string' && image ? (
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-[var(--text-primary)]/25" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-heading text-sm font-bold text-[var(--brand-primary)]">
                          {title}
                        </span>
                        {!row.published && <Badge tone="muted">Draft</Badge>}
                        {row.featured === true &&
                          (collection.table !== 'destinations' || spotlightIds.has(row.id) ? (
                            <Badge tone="gold">Featured</Badge>
                          ) : (
                            <Badge tone="muted">Featured · not shown</Badge>
                          ))}
                      </div>
                      {subtitle && (
                        <p className="mt-0.5 truncate text-xs text-[var(--text-primary)]/55">
                          {subtitle}
                        </p>
                      )}
                      <p className="mt-0.5 truncate font-mono text-xs text-[var(--text-primary)]/35">
                        {row.id}
                        {meta && ` · ${meta}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {confirmId === row.id ? (
                        <>
                          {cascade > 0 && (
                            <span className="max-w-[14rem] text-xs font-medium text-[var(--danger)]" data-cascade-warning>
                              Also deletes its {cascade} {cascade === 1 ? 'attraction' : 'attractions'}.
                            </span>
                          )}
                          <Button
                            variant="danger"
                            className="px-3 py-2"
                            loading={isBusy}
                            onClick={() => remove.mutate(row)}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-3 py-2"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <IconAction
                            label={
                              keepsHero
                                ? 'The hero needs at least one published slide'
                                : row.published
                                  ? 'Unpublish'
                                  : 'Publish'
                            }
                            disabled={isBusy || keepsHero}
                            onClick={() => togglePublished.mutate(row)}
                          >
                            {row.published ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </IconAction>

                          <Link
                            to={`/admin/${collection.slug}/${encodeURIComponent(row.id)}`}
                            aria-label={`Edit ${title}`}
                            title="Edit"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-secondary)]/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <IconAction
                            label={
                              keepsHero ? 'The hero needs at least one published slide' : 'Delete'
                            }
                            tone="danger"
                            disabled={isBusy || keepsHero}
                            onClick={() => setConfirmId(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconAction>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {searching && (
            <p className="mt-3 text-xs text-[var(--text-primary)]/50">
              Clear the search to reorder records.
            </p>
          )}
        </>
      )}
    </div>
  );
};

const MoveButton: React.FC<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, disabled, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="flex h-6 w-6 items-center justify-center rounded text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-secondary)]/10 disabled:opacity-20"
  >
    {children}
  </button>
);

const IconAction: React.FC<{
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
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-30',
      tone === 'danger'
        ? 'text-[var(--danger)] hover:bg-[var(--danger)]/10'
        : 'text-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]/10'
    )}
  >
    {children}
  </button>
);
