import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ExternalLink, RotateCcw, Save } from 'lucide-react';
import type { ContentTableName } from '@shared/database.types';
import { paths } from '@shared/site-paths';

import { findCollection } from '@/admin/collections';
import { schemaForCollection } from '@/admin/validation';
import { createRow, getRow, slugify, updateRow } from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';
import { RecordForm, type FormValues } from '@/admin/components/RecordForm';
import { Button, Card, ErrorNote, PageHeader, Spinner } from '@/admin/components/ui';

/** The tables whose rows have a public page of their own. */
const PUBLIC_PAGE: Partial<Record<ContentTableName, (id: string) => string>> = {
  destinations: paths.destination,
  featured_experiences: paths.experience,
  tours: paths.tour,
  articles: paths.article
};

export const RecordEditorPage: React.FC = () => {
  const { collection: slug, id } = useParams();
  const collection = findCollection(slug);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isNew = id === undefined;

  const schema = useMemo(
    () => (collection ? schemaForCollection(collection, isNew ? 'create' : 'update') : null),
    [collection, isNew]
  );

  /** Set when the server says the row was saved by someone else meanwhile. */
  const [conflict, setConflict] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: collection
      ? queryKeys.admin.record(collection.table, id ?? '')
      : ['admin', 'record', 'none'],
    queryFn: () => getRow(collection!.table, id!),
    enabled: Boolean(collection) && !isNew
  });

  const form = useForm<FormValues>({
    // `as never` bridges the dynamically-built Zod schema to RHF's generic —
    // the schema shape is derived from the collection at runtime.
    resolver: schema ? (zodResolver(schema) as never) : undefined,
    defaultValues: collection?.defaults ?? {},
    mode: 'onBlur'
  });

  const { control, handleSubmit, reset, watch, setValue, setError, formState } = form;

  // Populate the form once the record arrives.
  useEffect(() => {
    if (!collection) return;
    if (isNew) {
      reset({ ...collection.defaults });
    } else if (existing.data) {
      reset({ ...collection.defaults, ...(existing.data as unknown as FormValues) });
    }
  }, [collection, isNew, existing.data, reset]);

  /**
   * While creating, keep the slug in step with the title — until the user
   * edits the slug themselves. `setValue` below does not mark the field dirty,
   * so `dirtyFields.id` is true only when a human typed in it.
   */
  const titleField = collection?.titleField;
  const titleValue = titleField ? watch(titleField) : undefined;
  const slugTouched = Boolean(formState.dirtyFields.id);

  useEffect(() => {
    if (!isNew || slugTouched || typeof titleValue !== 'string') return;
    setValue('id', slugify(titleValue), { shouldValidate: false });
  }, [isNew, slugTouched, titleValue, setValue]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!collection) throw new Error('Unknown collection.');

      if (isNew) {
        return createRow(collection.table, values as never);
      }
      const loaded = existing.data as { updated_at?: string } | null | undefined;
      if (!loaded?.updated_at) throw new Error('The record has not finished loading.');

      const { id: _slug, ...rest } = values;
      return updateRow(collection.table, id, rest as never, loaded.updated_at);
    },
    onSuccess: () => {
      if (!collection) return;
      void qc.invalidateQueries({ queryKey: queryKeys.admin.collection(collection.table) });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.counts });
      // The public site reads the same rows.
      void qc.invalidateQueries({ queryKey: queryKeys.siteContent });

      toast.success(isNew ? `${collection.singular} created` : 'Changes saved');
      navigate(`/admin/${collection.slug}`);
    },
    onError: (e) => {
      if (e instanceof ApiRequestError && e.fields) {
        // The server's field messages go under the fields they belong to.
        for (const [path, message] of Object.entries(e.fields)) {
          setError(path as never, { type: 'server', message });
        }
        toast.error(e.status === 409 ? describeError(e) : 'Please fix the highlighted fields.');
        return;
      }
      if (e instanceof ApiRequestError && e.status === 409) {
        // Keep the user's edits on screen; they choose whether to discard them.
        setConflict(describeError(e));
        return;
      }
      toast.error(describeError(e));
    }
  });

  const loadSavedVersion = async () => {
    setConflict(null);
    // A new `existing.data` resets the form through the effect above.
    await existing.refetch();
  };

  const heading = useMemo(() => {
    if (!collection) return '';
    if (isNew) return `New ${collection.singular}`;
    const title = existing.data
      ? (existing.data as unknown as Record<string, unknown>)[collection.titleField]
      : undefined;
    return typeof title === 'string' && title ? title : (id ?? collection.singular);
  }, [collection, isNew, existing.data, id]);

  if (!collection) return <Navigate to="/admin" replace />;

  const notFound = !isNew && existing.isSuccess && !existing.data;

  return (
    <div>
      <Link
        to={`/admin/${collection.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary)]"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {collection.label}
      </Link>

      <PageHeader
        title={heading}
        actions={
          // The saved row's page, once it is published; an edit shows there on the next load.
          !isNew && id && existing.data?.published && PUBLIC_PAGE[collection.table] ? (
            <a
              href={PUBLIC_PAGE[collection.table]!(id)}
              target="_blank"
              rel="noopener noreferrer"
              data-view-page
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)]/60 bg-[var(--surface)] px-4 py-2.5 text-sm font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--background-secondary)]"
            >
              View page
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : undefined
        }
        description={
          isNew
            ? `Create a new ${collection.singular.toLowerCase()}.`
            : `Editing ${collection.singular.toLowerCase()} “${id}”.`
        }
      />

      {existing.isError ? (
        <ErrorNote>{describeError(existing.error)}</ErrorNote>
      ) : notFound ? (
        <ErrorNote>That record no longer exists.</ErrorNote>
      ) : !isNew && existing.isPending ? (
        <Spinner label="Loading record" />
      ) : (
        <form
          onSubmit={handleSubmit(
            (values) => {
              setConflict(null);
              save.mutate(values);
            },
            () => toast.error('Please fix the highlighted fields.')
          )}
          noValidate
        >
          {conflict && (
            <div className="mb-4 space-y-3">
              <ErrorNote>{conflict}</ErrorNote>
              <Button
                type="button"
                variant="secondary"
                icon={RotateCcw}
                onClick={() => void loadSavedVersion()}
              >
                Load the saved version (discards your changes)
              </Button>
            </div>
          )}

          <Card className="p-5 sm:p-7">
            <RecordForm
              fields={collection.fields}
              control={control}
              errors={formState.errors}
              lockSlug={!isNew}
            />
          </Card>

          <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 rounded-2xl border border-[var(--border-strong)]/50 bg-[var(--background)]/95 p-3 backdrop-blur">
            <Link to={`/admin/${collection.slug}`}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" icon={Save} loading={save.isPending}>
              {isNew ? `Create ${collection.singular}` : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
