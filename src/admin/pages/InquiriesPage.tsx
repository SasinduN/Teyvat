import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays,
  ChevronDown,
  Inbox,
  Mail,
  Phone,
  Search,
  Trash2,
  Users
} from 'lucide-react';

import { deleteInquiry, listInquiries, updateInquiry } from '@/lib/api/inquiries';
import type { InquiryRow, InquiryStatus } from '@/lib/database.types';
import { queryKeys } from '@/lib/queryClient';
import { describeError } from '@/lib/supabase';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea
} from '@/admin/components/ui';
import { cn } from '@/utils/cn';

const STATUSES: InquiryStatus[] = ['new', 'in_progress', 'responded', 'closed', 'archived'];

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  responded: 'Responded',
  closed: 'Closed',
  archived: 'Archived'
};

const STATUS_TONE: Record<InquiryStatus, 'gold' | 'neutral' | 'success' | 'muted'> = {
  new: 'gold',
  in_progress: 'neutral',
  responded: 'success',
  closed: 'muted',
  archived: 'muted'
};

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const InquiriesPage: React.FC = () => {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const filters = { status: statusFilter, search: debouncedSearch };

  const list = useQuery({
    queryKey: queryKeys.admin.inquiries(filters),
    queryFn: () => listInquiries(filters)
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.inquiryCounts });
  };

  const patch = useMutation({
    mutationFn: ({
      id,
      changes
    }: {
      id: string;
      changes: { status?: InquiryStatus; admin_notes?: string | null };
    }) => updateInquiry(id, changes),
    onSuccess: (_d, { changes }) => {
      invalidate();
      toast.success(changes.status ? 'Status updated' : 'Notes saved');
    },
    onError: (e) => toast.error(describeError(e))
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInquiry(id),
    onSuccess: () => {
      invalidate();
      setConfirmId(null);
      toast.success('Enquiry deleted');
    },
    onError: (e) => toast.error(describeError(e))
  });

  const busyId =
    (patch.isPending && patch.variables?.id) || (remove.isPending && remove.variables) || null;

  const rows = list.data;

  return (
    <div>
      <PageHeader
        title="Traveller Enquiries"
        description="Every submission from the “Plan Your Sri Lanka Journey” form on the public site."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#1C4737]/45" />
          <Input
            className="pl-10"
            placeholder="Search by name, email or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | 'all')}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {list.isError && (
        <div className="mb-4">
          <ErrorNote>{describeError(list.error)}</ErrorNote>
        </div>
      )}

      {list.isPending ? (
        <Spinner label="Loading enquiries" />
      ) : !rows || rows.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="No enquiries here">
            {debouncedSearch || statusFilter !== 'all'
              ? 'Try a different search or status filter.'
              : 'Submissions from the public enquiry form will land here.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row: InquiryRow) => {
            const open = openId === row.id;
            const isBusy = busyId === row.id;

            return (
              <Card key={row.id} className={cn('overflow-hidden', isBusy && 'opacity-60')}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[#F5EFEB]/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-bold text-[#0F2E23]">
                        {row.name}
                      </span>
                      <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-light text-[#1A1A1A]/60">
                      {row.subject || 'General enquiry'}
                    </p>
                  </div>

                  <span className="hidden shrink-0 text-[11px] font-light text-[#1A1A1A]/45 sm:block">
                    {formatWhen(row.created_at)}
                  </span>

                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-[#1C4737] transition-transform',
                      open && 'rotate-180'
                    )}
                  />
                </button>

                {open && (
                  <div className="border-t border-[#D4C3B5]/45 p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Detail icon={Mail} label="Email">
                        <a
                          href={`mailto:${row.email}`}
                          className="text-[#1C4737] underline decoration-[#1C4737]/30 underline-offset-2"
                        >
                          {row.email}
                        </a>
                      </Detail>
                      <Detail icon={Phone} label="Phone">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="text-[#1C4737] underline decoration-[#1C4737]/30 underline-offset-2"
                          >
                            {row.phone}
                          </a>
                        ) : (
                          <span className="text-[#1A1A1A]/40">Not provided</span>
                        )}
                      </Detail>
                      <Detail icon={Users} label="Travellers">
                        {row.travelers}
                      </Detail>
                      <Detail icon={CalendarDays} label="Travel window">
                        {row.dates}
                      </Detail>
                    </div>

                    {row.message && (
                      <div className="mt-4">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C4737]">
                          Message
                        </div>
                        <p className="whitespace-pre-wrap rounded-xl bg-[#FBF9F6] p-3.5 text-xs font-light leading-relaxed text-[#1A1A1A]/80">
                          {row.message}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-4 sm:grid-cols-[12rem_1fr]">
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C4737]">
                          Status
                        </div>
                        <Select
                          value={row.status}
                          disabled={isBusy}
                          onChange={(e) =>
                            patch.mutate({
                              id: row.id,
                              changes: { status: e.target.value as InquiryStatus }
                            })
                          }
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C4737]">
                          Internal notes
                        </div>
                        <Textarea
                          rows={3}
                          defaultValue={row.admin_notes ?? ''}
                          placeholder="Notes for your team — never shown to the traveller."
                          disabled={isBusy}
                          onBlur={(e) => {
                            const next = e.target.value.trim() || null;
                            if (next !== (row.admin_notes ?? null)) {
                              patch.mutate({ id: row.id, changes: { admin_notes: next } });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#D4C3B5]/45 pt-4">
                      <span className="text-[11px] font-light text-[#1A1A1A]/45">
                        Received {formatWhen(row.created_at)}
                      </span>

                      {confirmId === row.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="danger"
                            loading={isBusy}
                            onClick={() => remove.mutate(row.id)}
                          >
                            Delete permanently
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirmId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => setConfirmId(row.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Detail: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2.5">
    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1C4737]/55" />
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C4737]">
        {label}
      </div>
      <div className="mt-0.5 break-words text-xs font-medium text-[#1A1A1A]">{children}</div>
    </div>
  </div>
);
