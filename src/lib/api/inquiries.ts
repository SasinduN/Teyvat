import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { InquiryRow, InquiryStatus } from '@shared/database.types';

/** What the public `InquiryModal` collects. */
export interface InquiryDraft {
  name: string;
  email: string;
  phone: string;
  travelers: string;
  dates: string;
  subject: string;
  message: string;
}

/**
 * Public submission. Allowed for anon by the `anyone can submit an inquiry`
 * RLS policy, which also pins `status` to 'new' — a visitor cannot create an
 * enquiry that is already marked handled, nor write `admin_notes`.
 */
export async function submitInquiry(draft: InquiryDraft): Promise<void> {
  // Until phase 6 moves enquiries onto /api, a deployment without Supabase
  // credentials cannot accept them. Say so plainly instead of letting a request
  // to the placeholder URL fail with a bare "Failed to fetch".
  if (!isSupabaseConfigured) {
    throw new Error('Enquiries can’t be sent right now. Please try again later.');
  }

  const { error } = await supabase.from('inquiries').insert({
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim() || null,
    travelers: draft.travelers,
    dates: draft.dates,
    subject: draft.subject.trim(),
    message: draft.message.trim()
  });

  if (error) throw error;
}

/* -------------------------------------------------------------- admin side */

export interface InquiryQuery {
  status?: InquiryStatus | 'all';
  search?: string;
}

export async function listInquiries(query: InquiryQuery = {}): Promise<InquiryRow[]> {
  let q = supabase.from('inquiries').select('*').order('created_at', { ascending: false });

  if (query.status && query.status !== 'all') {
    q = q.eq('status', query.status);
  }

  const term = query.search?.trim();
  if (term) {
    // Escape PostgREST's `or` filter separators before interpolating.
    const safe = term.replace(/[,()\\]/g, ' ');
    q = q.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,subject.ilike.%${safe}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InquiryRow[];
}

export async function updateInquiry(
  id: string,
  patch: { status?: InquiryStatus; admin_notes?: string | null }
): Promise<void> {
  const { error } = await supabase.from('inquiries').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteInquiry(id: string): Promise<void> {
  const { error } = await supabase.from('inquiries').delete().eq('id', id);
  if (error) throw error;
}

/** Counts for the admin dashboard tiles. */
export async function countInquiriesByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('inquiries').select('status');
  if (error) throw error;

  const counts: Record<string, number> = { total: 0 };
  for (const row of (data ?? []) as { status: InquiryStatus }[]) {
    counts.total += 1;
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}
