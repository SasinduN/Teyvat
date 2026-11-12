-- =============================================================================
-- sign-in throttling
-- =============================================================================
-- One row per POST /api/auth/login that got as far as checking a password.
-- The API counts recent failures here before it verifies anything, so the
-- limits survive a redeploy and hold across replicas (server/src/auth/throttle.ts):
--
--     5  failures per (email_hash, ip)   in 15 minutes
--     20 failures per ip                 in 15 minutes
--     50 failures per email_hash         in 15 minutes
--
-- `email_hash` is the SHA-256 (hex) of the trimmed, lowercased email that was
-- submitted, never the email itself: people sometimes type their password into
-- the email field, and this table must not become a list of those.
--
-- Rows older than 24 hours are deleted by the API's hourly sweep. Nothing reads
-- further back than 15 minutes.
--
-- Idempotent, like 0001: re-running it is a no-op.
-- =============================================================================

begin;

create table if not exists public.login_attempts (
  id           bigint generated always as identity primary key,
  email_hash   text not null check (length(email_hash) = 64),
  ip           inet not null,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists login_attempts_email_idx
  on public.login_attempts (email_hash, attempted_at);
create index if not exists login_attempts_ip_idx
  on public.login_attempts (ip, attempted_at);

comment on column public.login_attempts.email_hash is
  'SHA-256 hex of the trimmed, lowercased submitted email. The email itself is never stored.';

commit;
