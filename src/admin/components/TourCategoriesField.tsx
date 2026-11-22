import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { listRows } from '@/lib/api/admin';
import { queryKeys } from '@/lib/queryClient';
import { cn } from '@/utils/cn';
import type { TourCategoryRow } from '@shared/database.types';

/**
 * A tour's categories (0030): every category as a toggle, drafts marked, in the list's
 * order. The order picked is kept: the first is the label on the tour's card, so the
 * line under the toggles names them in that order. To change it, untick and tick again.
 */
export const TourCategoriesField: React.FC<{
  id: string;
  value: string[];
  onChange: (ids: string[]) => void;
}> = ({ id, value, onChange }) => {
  const categories = useQuery({
    queryKey: queryKeys.admin.collection('tour_categories'),
    queryFn: () => listRows('tour_categories') as Promise<TourCategoryRow[]>
  });
  const rows = categories.data ?? [];
  const nameOf = (categoryId: string) => rows.find((row) => row.id === categoryId)?.name ?? categoryId;

  if (categories.isPending) return <p className="text-sm text-[var(--text-primary)]/60">Loading categories…</p>;
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-primary)]/60">No categories yet: add them under Tour Categories.</p>;
  }

  return (
    <div className="space-y-2" id={id} data-tour-categories-field>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
        {rows.map((row) => {
          const active = value.includes(row.id);
          return (
            <button
              key={row.id}
              type="button"
              aria-pressed={active}
              data-category={row.id}
              onClick={() => onChange(active ? value.filter((v) => v !== row.id) : [...value, row.id])}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
                active
                  ? 'border-transparent bg-[var(--brand-secondary)] text-white'
                  : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)]/65 hover:border-[var(--inverse-raised)] hover:text-[var(--brand-primary)]'
              )}
            >
              {row.name}
              {row.published ? '' : ' (draft)'}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-primary)]/70" aria-live="polite" data-category-order>
        {value.length === 0 ? 'In no category: listed under All tours only.' : `In order: ${value.map(nameOf).join(', ')}.`}
      </p>
    </div>
  );
};
