import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Inbox } from 'lucide-react';

import { COLLECTIONS } from '@/admin/collections';
import { countRows } from '@/lib/api/admin';
import { countInquiriesByStatus } from '@/lib/api/inquiries';
import { queryKeys } from '@/lib/queryClient';
import { describeError } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Badge, Card, ErrorNote, PageHeader, Spinner } from '@/admin/components/ui';

export const DashboardPage: React.FC = () => {
  const { admin, user } = useAuth();

  const counts = useQuery({
    queryKey: queryKeys.admin.counts,
    queryFn: async () => {
      const totals = await Promise.all(COLLECTIONS.map((c) => countRows(c.table)));
      return Object.fromEntries(
        COLLECTIONS.map((c, i) => [c.table, totals[i]])
      ) as Record<string, number>;
    }
  });

  const inquiries = useQuery({
    queryKey: queryKeys.admin.inquiryCounts,
    queryFn: countInquiriesByStatus
  });

  const firstName = (admin?.full_name || user?.email || '').split(/[ @]/)[0];
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

      {counts.isPending || inquiries.isPending ? (
        <Spinner label="Loading overview" />
      ) : (
        <div className="space-y-6">
          {/* Enquiries callout */}
          <Link to="/admin/inquiries" className="block">
            <Card className="flex items-center justify-between p-5 transition-colors hover:border-[#1C4737]/50">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F2E23] text-[#D4AF37]">
                  <Inbox className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-heading text-lg font-bold text-[#0F2E23]">
                    Traveller enquiries
                  </div>
                  <div className="mt-0.5 text-xs font-light text-[#1A1A1A]/60">
                    {inquiries.data?.total ?? 0} total
                    {newInquiries > 0 && ` · ${newInquiries} awaiting a reply`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {newInquiries > 0 && <Badge tone="gold">{newInquiries} new</Badge>}
                <ArrowUpRight className="h-4 w-4 text-[#1C4737]" />
              </div>
            </Card>
          </Link>

          {/* Content collections */}
          <div>
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/45">
              Content
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COLLECTIONS.map((c) => {
                const Icon = c.icon;
                return (
                  <Link key={c.slug} to={`/admin/${c.slug}`}>
                    <Card className="h-full p-5 transition-colors hover:border-[#1C4737]/50">
                      <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C4737]/10 text-[#1C4737]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="font-heading text-2xl font-bold text-[#0F2E23]">
                          {counts.data?.[c.table] ?? 0}
                        </span>
                      </div>
                      <div className="mt-4 font-heading text-base font-bold text-[#0F2E23]">
                        {c.label}
                      </div>
                      <p className="mt-1 text-[11px] font-light leading-relaxed text-[#1A1A1A]/55">
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
