import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, Save } from 'lucide-react';

import { SITE_SETTINGS_FIELDS, siteSettingsSchema, type SiteSettingsValues } from '@shared/content-schema';
import { getSiteSettings, updateSiteSettings } from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';
import { RecordForm, type FormValues } from '@/admin/components/RecordForm';
import { Button, Card, ErrorNote, PageHeader, Spinner } from '@/admin/components/ui';

/**
 * The single `site_settings` row: the Footer's contact details and links.
 *
 * Each link is optional. Left empty it is stored as NULL, and the Footer
 * renders that link with no destination. Anything else must be https://.
 */
export const SettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const [conflict, setConflict] = useState<string | null>(null);

  const current = useQuery({
    queryKey: queryKeys.admin.siteSettings,
    queryFn: getSiteSettings
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(siteSettingsSchema) as never,
    mode: 'onBlur'
  });
  const { control, handleSubmit, reset, setError, formState } = form;

  // NULL links show as empty boxes.
  useEffect(() => {
    if (!current.data) return;
    const values: FormValues = {};
    for (const field of SITE_SETTINGS_FIELDS) {
      values[field.name] = (current.data as unknown as FormValues)[field.name] ?? '';
    }
    reset(values);
  }, [current.data, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      if (!current.data) throw new Error('The settings have not finished loading.');
      return updateSiteSettings(values as unknown as SiteSettingsValues, current.data.updated_at);
    },
    onSuccess: (saved) => {
      qc.setQueryData(queryKeys.admin.siteSettings, saved);
      // The Footer reads these.
      void qc.invalidateQueries({ queryKey: queryKeys.siteContent });
      toast.success('Settings saved');
    },
    onError: (e) => {
      if (e instanceof ApiRequestError && e.fields) {
        for (const [path, message] of Object.entries(e.fields)) {
          setError(path as never, { type: 'server', message });
        }
        toast.error('Please fix the highlighted fields.');
        return;
      }
      if (e instanceof ApiRequestError && e.status === 409) {
        setConflict(describeError(e));
        return;
      }
      toast.error(describeError(e));
    }
  });

  return (
    <div>
      <PageHeader
        title="Site settings"
        description="The contact details and links in the public site's footer. Links are optional: leave one empty and the footer shows it without a destination."
      />

      {current.isError ? (
        <ErrorNote>{describeError(current.error)}</ErrorNote>
      ) : current.isPending ? (
        <Spinner label="Loading settings" />
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
                onClick={() => {
                  setConflict(null);
                  void current.refetch();
                }}
              >
                Load the saved version (discards your changes)
              </Button>
            </div>
          )}

          <Card className="p-5 sm:p-7">
            <RecordForm
              fields={SITE_SETTINGS_FIELDS}
              control={control}
              errors={formState.errors}
              lockSlug={false}
            />
          </Card>

          <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 rounded-2xl border border-[#D4C3B5]/50 bg-[#FBF9F6]/95 p-3 backdrop-blur">
            <Button type="submit" icon={Save} loading={save.isPending}>
              Save settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
