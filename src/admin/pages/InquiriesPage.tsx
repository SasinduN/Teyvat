import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays,
  ChevronDown,
  Download,
  Inbox,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react';

import { deleteInquiry, exportUrl, listInquiries, updateInquiry } from '@/lib/api/inquiries';
import { INQUIRY_STATUSES, type InquiryRow, type InquiryStatus } from '@shared/database.types';
import { queryKeys } from '@/lib/queryClient';
import { describeError } from '@/lib/errors';
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

const STATUSES = INQUIRY_STATUSES;

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed'
};

const STATUS_TONE: Record<InquiryStatus, 'gold' | 'neutral' | 'success' | 'muted'> = {
  new: 'gold',
  contacted: 'neutral',
  closed: 'muted'
};

/** The filter: a status, all of them, or the spam folder. */
type Filter = InquiryStatus | 'all' | 'spam';

/**
 * Contact links built from text a stranger typed. The email CHECK allows `?`
 * and `&`, which in a raw `mailto:` would add a subject or body of their
 * choosing; encoded, the whole value is the address. `tel:` keeps only what
 * a phone number can hold.
 */
const mailtoHref = (email: string) => `mailto:${encodeURIComponent(email)}`;
const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, '')}`;

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

/**
 * The enquiry inbox. Everything here is text a stranger wrote, so it is only
 * ever rendered as text: React escapes it, and nothing uses
 * `dangerouslySetInnerHTML`.
 */
export const InquiriesPage: React.FC = () => {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const spam = statusFilter === 'spam';
  const filters = {
    status: spam ? ('all' as const) : statusFilter,
    search: debouncedSearch,
    spam
  };

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
      row,
      changes
    }: {
      row: InquiryRow;
      changes: { status?: InquiryStatus; admin_notes?: string | null; spam?: boolean };
    }) => updateInquiry(row.id, changes, row.updated_at),
    onSuccess: (_d, { changes }) => {
      invalidate();
      toast.success(
        changes.spam === false ? 'Moved to the inbox' : changes.status ? 'Status updated' : 'Notes saved'
      );
    },
    // A 409 means someone else changed it; the reload shows their version.
    onError: (e) => {
      toast.error(describeError(e));
      invalidate();
    }
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
    (patch.isPending && patch.variables?.row.id) || (remove.isPending && remove.variables) || null;

  const rows = list.data;

  return (
    <div>
      <PageHeader
        title="Traveller Enquiries"
        description="Every submission from the “Plan Your Sri Lanka Journey” form on the public site. Closed enquiries are deleted automatically 12 months after closing; spam after 30 days."
        actions={
          <a href={exportUrl(filters)} download>
            <Button type="button" variant="secondary" icon={Download}>
              Export CSV
            </Button>
          </a>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--brand-primary)]/45" />
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
          onChange={(e) => setStatusFilter(e.target.value as Filter)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
          <option value="spam">Spam</option>
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
            {spam
              ? 'Nothing caught by the spam filter.'
              : debouncedSearch || statusFilter !== 'all'
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
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[var(--background-secondary)]/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-bold text-[var(--brand-primary)]">
                        {row.name}
                      </span>
                      {row.spam ? (
                        <Badge tone="muted">Spam</Badge>
                      ) : (
                        <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-light text-[var(--text-primary)]/60">
                      {row.subject || 'General enquiry'}
                    </p>
                  </div>

                  <span className="hidden shrink-0 text-[11px] font-light text-[var(--text-primary)]/45 sm:block">
                    {formatWhen(row.created_at)}
                  </span>

                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-[var(--brand-primary)] transition-transform',
                      open && 'rotate-180'
                    )}
                  />
                </button>

                {open && (
                  <div className="border-t border-[var(--border-strong)]/45 p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Detail icon={Mail} label="Email">
                        <a
                          href={mailtoHref(row.email)}
                          className="text-[var(--brand-primary)] underline decoration-[var(--inverse-raised)]/30 underline-offset-2"
                        >
                          {row.email}
                        </a>
                      </Detail>
                      <Detail icon={Phone} label="Phone">
                        {row.phone ? (
                          <a
                            href={telHref(row.phone)}
                            className="text-[var(--brand-primary)] underline decoration-[var(--inverse-raised)]/30 underline-offset-2"
                          >
                            {row.phone}
                          </a>
                        ) : (
                          <span className="text-[var(--text-primary)]/40">Not provided</span>
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
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                          Message
                        </div>
                        <p className="whitespace-pre-wrap rounded-xl bg-[var(--background)] p-3.5 text-xs font-light leading-relaxed text-[var(--text-primary)]/80">
                          {row.message}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid gap-4 sm:grid-cols-[12rem_1fr]">
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                          Status
                        </div>
                        <Select
                          value={row.status}
                          disabled={isBusy}
                          onChange={(e) =>
                            patch.mutate({
                              row,
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
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                          Internal notes
                        </div>
                        <Textarea
                          // Remount on every saved version, so a reload after
                          // someone else's change shows their notes.
                          key={row.updated_at}
                          rows={3}
                          defaultValue={row.admin_notes ?? ''}
                          placeholder="Notes for your team — never shown to the traveller."
                          disabled={isBusy}
                          onBlur={(e) => {
                            const next = e.target.value.trim() || null;
                            if (next !== (row.admin_notes ?? null)) {
                              patch.mutate({ row, changes: { admin_notes: next } });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[var(--border-strong)]/45 pt-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-light text-[var(--text-primary)]/45">
                          Received {formatWhen(row.created_at)}
                        </span>
                        {row.spam && (
                          <Button
                            variant="secondary"
                            icon={ShieldCheck}
                            disabled={isBusy}
                            onClick={() => patch.mutate({ row, changes: { spam: false } })}
                          >
                            Not spam
                          </Button>
                        )}
                      </div>

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
    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]/55" />
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
        {label}
      </div>
      <div className="mt-0.5 break-words text-xs font-medium text-[var(--text-primary)]">{children}</div>
    </div>
  </div>
);
