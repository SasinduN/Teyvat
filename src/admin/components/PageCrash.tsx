import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button, Card } from '@/admin/components/ui';

/**
 * What an admin page shows if it throws while rendering. The sidebar stays,
 * and moving to another page clears it (the boundary is keyed by route).
 */
export const PageCrash: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <Card className="mx-auto max-w-lg p-8 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
      <TriangleAlert className="h-6 w-6" />
    </div>
    <h1 className="font-heading text-xl font-bold text-[var(--brand-primary)]">This page hit an error</h1>
    <p className="mt-2 text-xs font-light leading-relaxed text-[var(--text-primary)]/65">
      Nothing was saved or lost by it. Try again, or go back to the dashboard. If it keeps
      happening, note what you clicked just before.
    </p>
    <div className="mt-6 flex justify-center gap-2">
      <Button type="button" icon={RotateCcw} onClick={onRetry}>
        Try again
      </Button>
      <Link to="/admin">
        <Button type="button" variant="secondary">
          Back to the dashboard
        </Button>
      </Link>
    </div>
  </Card>
);
