import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Inbox, Settings } from 'lucide-react';

import { COLLECTIONS } from '@/admin/collections';
import { countRows } from '@/lib/api/admin';
import { describeError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { useInquiryCounts } from '@/admin/useInquiryCounts';
import { Badge, Card, ErrorNote, PageHeader, Spinner } from '@/admin/components/ui';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const counts = useQuery({
    queryKey: queryKeys.admin.counts,
    queryFn: async () => {
      const totals = await Promise.all(COLLECTIONS.map((c) => countRows(c.table)));
      return Object.fromEntries(
        COLLECTIONS.map((c, i) => [c.table, totals[i]])
      ) as Record<string, number>;
    }
  });

  const firstName = (user?.fullName || user?.email || '').split(/[ @]/)[0];
  const inquiries = useInquiryCounts();
  const newInquiries = inquiries.data?.new ?? 0;
  const error = counts.error ?? inquiries.error;

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description="Everything the public site renders is managed from here. Changes go live as soon as you save."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{describeError(error)}</ErrorNote>
        </div>
      )}

      {counts.isPending ? (
        <Spinner label="Loading overview" />
      ) : (
        <div className="space-y-6">
          {/* Enquiries callout */}
          <Link to="/admin/inquiries" className="block">
            <Card className="flex items-center justify-between p-5 transition-colors hover:border-[var(--inverse-raised)]/50">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--inverse-surface)] text-[var(--accent-text)]">
                  <Inbox className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-heading text-lg font-bold text-[var(--brand-primary)]">
                    Traveller enquiries
                  </div>
                  <div className="mt-0.5 text-sm text-[var(--text-primary)]/60">
                    {newInquiries > 0
                      ? `${newInquiries} awaiting a reply`
                      : 'Nothing new'}
                    {inquiries.data && ` · ${inquiries.data.contacted} contacted · ${inquiries.data.closed} closed`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {newInquiries > 0 && <Badge tone="gold">{newInquiries} new</Badge>}
                <ArrowUpRight className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
            </Card>
          </Link>

          <Link to="/admin/settings" className="block">
            <Card className="flex items-center gap-4 p-5 transition-colors hover:border-[var(--inverse-raised)]/50">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--inverse-surface)] text-[var(--accent-text)]">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <div className="font-heading text-lg font-bold text-[var(--brand-primary)]">Site settings</div>
                <div className="mt-0.5 text-sm text-[var(--text-primary)]/60">
                  Address, phone, contact email and the footer's social and legal links.
                </div>
              </div>
            </Card>
          </Link>

          {/* Content collections */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]/45">
              Content
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COLLECTIONS.map((c) => {
                const Icon = c.icon;
                return (
                  <Link key={c.slug} to={`/admin/${c.slug}`}>
                    <Card className="h-full p-5 transition-colors hover:border-[var(--inverse-raised)]/50">
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-secondary)]/10 text-[var(--brand-primary)]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="font-heading text-2xl font-bold text-[var(--brand-primary)]">
                          {counts.data?.[c.table] ?? 0}
                        </span>
                      </div>
                      <div className="mt-4 font-heading text-base font-bold text-[var(--brand-primary)]">
                        {c.label}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)]/55">
                        {c.description}
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
