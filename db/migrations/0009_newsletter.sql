begin;

create table public.newsletter_subscribers (
  email text primary key check (length(email) <= 254 and email = lower(email)),
  created_at timestamptz not null default now()
);

-- Atomic, bounded per-IP counter. No raw request data is written to logs.
create table public.newsletter_attempts (
  ip inet primary key,
  window_started timestamptz not null default now(),
  attempts integer not null default 1
);

commit;
