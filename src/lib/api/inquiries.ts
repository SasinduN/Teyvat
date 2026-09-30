/**
 * Enquiries: the public form's submission, and the admin inbox's reads and
 * writes, through our own API.
 */
import { API_ROUTES, type InquiryCounts } from '@shared/api';
import type { InquiryRow, InquiryStatus } from '@shared/database.types';
import { deleteJson, getJson, patchJson, postJson } from '@/lib/api/http';

/** What the public `InquiryModal` collects. */
export interface InquiryDraft {
  name: string;
  email: string;
  phone: string;
  travelers: string;
  dates: string;
  subject: string;
  message: string;
  /**
   * The form's hidden honeypot. A person never sees it, so it stays empty;
   * the server stores anything that fills it as spam.
   */
  website?: string;
}

/**
 * Public submission. The server takes only the visitor's fields from this:
 * status, admin notes and the spam flag are always its own to set. A 400 or
 * 429 comes back with a message written for the visitor, which the modal
 * shows as it is.
 */
export async function submitInquiry(draft: InquiryDraft): Promise<void> {
  await postJson(API_ROUTES.inquiries, draft);
}

/* -------------------------------------------------------------- admin side */

export interface InquiryQuery {
  status?: InquiryStatus | 'all';
  search?: string;
  /** true: only spam. false (the default): only real enquiries. */
  spam?: boolean;
}

function queryString(query: InquiryQuery): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.spam) params.set('spam', 'true');
  const text = params.toString();
  return text ? `?${text}` : '';
}

const base = API_ROUTES.admin.inquiries;

export function listInquiries(query: InquiryQuery = {}): Promise<InquiryRow[]> {
  return getJson<InquiryRow[]>(`${base}${queryString(query)}`);
}

/**
 * `expectedUpdatedAt` is the `updated_at` the inbox loaded. If someone else
 * has changed the enquiry since, the API refuses with 409.
 */
export function updateInquiry(
  id: string,
  patch: { status?: InquiryStatus; admin_notes?: string | null; spam?: boolean },
  expectedUpdatedAt: string
): Promise<InquiryRow> {
  return patchJson<InquiryRow>(`${base}/${encodeURIComponent(id)}`, { ...patch, expectedUpdatedAt });
}

/** Permanent. */
export async function deleteInquiry(id: string): Promise<void> {
  await deleteJson<null>(`${base}/${encodeURIComponent(id)}`);
}

/** New, contacted and closed exclude spam; spam is counted on its own. */
export function countInquiries(): Promise<InquiryCounts> {
  return getJson<InquiryCounts>(`${base}/counts`);
}

/** A same-origin link: the session cookie goes with it, so the browser downloads the file. */
export function exportUrl(query: InquiryQuery): string {
  return `${base}/export.csv${queryString(query)}`;
}
