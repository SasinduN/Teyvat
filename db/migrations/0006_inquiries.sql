-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — enquiries on the API
-- =============================================================================
-- Phase 6 moves the enquiry form and inbox onto our own API.
--
--   * Three statuses instead of five: new, contacted, closed.
--       in_progress, responded -> contacted
--       archived               -> closed
--   * closed_at: set when an enquiry is closed, cleared if it is reopened.
--     The hourly sweep deletes enquiries closed more than 12 months ago
--     (the retention period in the privacy policy).
--   * spam: set when the form's hidden honeypot field was filled in. Spam is
--     kept (autofill can fill a honeypot by accident) but hidden from the
--     inbox, and swept after 30 days.
--   * inquiry_attempts: the public form's rate limit, per IP. IP and time
--     only; swept after 24 hours.
--
-- The public insert builds its column list from visitor fields only, so
-- status, admin_notes, spam and closed_at are always the server's to set.
-- That replaces the old `anyone can submit an inquiry` RLS policy.
--
-- Idempotent: every constraint is dropped if present and re-added, so
-- re-running it maps any old statuses again and is otherwise a no-op.
-- =============================================================================

begin;

alter table public.inquiries add column if not exists closed_at timestamptz;
alter table public.inquiries add column if not exists spam boolean not null default false;

alter table public.inquiries drop constraint if exists inquiries_status_check;
alter table public.inquiries drop constraint if exists inquiries_closed_at_matches_status;

update public.inquiries
   set status = case status
                  when 'in_progress' then 'contacted'
                  when 'responded'   then 'contacted'
                  when 'archived'    then 'closed'
                end
 where status in ('in_progress', 'responded', 'archived');

-- Closed before closed_at existed: the last change is the best guess.
update public.inquiries set closed_at = updated_at where status = 'closed' and closed_at is null;
update public.inquiries set closed_at = null where status <> 'closed' and closed_at is not null;

alter table public.inquiries
  add constraint inquiries_status_check check (status in ('new', 'contacted', 'closed'));
alter table public.inquiries
  add constraint inquiries_closed_at_matches_status check ((status = 'closed') = (closed_at is not null));

-- The inbox lists by (spam, status), newest first.
drop index if exists public.inquiries_status_idx;
create index if not exists inquiries_inbox_idx on public.inquiries (spam, status, created_at desc);
create index if not exists inquiries_closed_idx on public.inquiries (closed_at) where closed_at is not null;

create table if not exists public.inquiry_attempts (
  id           bigint generated always as identity primary key,
  ip           inet not null,
  attempted_at timestamptz not null default now()
);

create index if not exists inquiry_attempts_ip_idx on public.inquiry_attempts (ip, attempted_at);

comment on table public.inquiry_attempts is
  'Rate limit for the public enquiry form. IP and time only; swept after 24 hours.';

commit;
