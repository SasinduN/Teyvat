import React, { useEffect, useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Save } from 'lucide-react';

import { findCollection } from '@/admin/collections';
import { schemaForCollection } from '@/admin/validation';
import { createRow, getRow, slugify, updateRow } from '@/lib/api/admin';
import { queryKeys } from '@/lib/queryClient';
import { describeError } from '@/lib/supabase';
import { RecordForm, type FormValues } from '@/admin/components/RecordForm';
import { Button, Card, ErrorNote, PageHeader, Spinner } from '@/admin/components/ui';

export const RecordEditorPage: React.FC = () => {
  const { collection: slug, id } = useParams();
  const collection = findCollection(slug);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isNew = id === undefined;

  const schema = useMemo(
    () => (collection ? schemaForCollection(collection) : null),
    [collection]
  );

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

  const { control, handleSubmit, reset, watch, setValue, formState } = form;

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
      const { id: _slug, ...rest } = values;
      return updateRow(collection.table, id, rest as never);
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
    onError: (e) => toast.error(describeError(e))
  });

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
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#1C4737] transition-colors hover:text-[#0F2E23]"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {collection.label}
      </Link>

      <PageHeader
        title={heading}
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
            (values) => save.mutate(values),
            () => toast.error('Please fix the highlighted fields.')
          )}
          noValidate
        >
          <Card className="p-5 sm:p-7">
            <RecordForm
              fields={collection.fields}
              control={control}
              errors={formState.errors}
              lockSlug={!isNew}
            />
          </Card>

          <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 rounded-2xl border border-[#D4C3B5]/50 bg-[#FBF9F6]/95 p-3 backdrop-blur">
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
