-- =============================================================================
-- Teyvat / Travel Eye Sri Lanka — newsletter unsubscribe tokens and consent
-- =============================================================================
-- Every subscriber gets an unguessable token (a random UUID). The link
-- /unsubscribe?token=<token> (`newsletterUnsubscribeUrl` in
-- shared/site-paths.ts) must go in every newsletter email; opening it and
-- pressing the button deletes the row, so the address is gone rather than
-- flagged.
--
-- `consented_at` records when the address was given with the form's consent
-- line showing (the footer, from this release on). Existing rows get the
-- time of this migration: they were collected without that line, which the
-- launch checklist notes.
--
-- Nothing sends newsletters yet (docs/LAUNCH-CHECKLIST.md).
--
-- Idempotent: re-running it is a no-op.
-- =============================================================================

begin;

alter table public.newsletter_subscribers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists consented_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.newsletter_subscribers'::regclass
       and conname = 'newsletter_subscribers_unsubscribe_token_key'
  ) then
    alter table public.newsletter_subscribers
      add constraint newsletter_subscribers_unsubscribe_token_key unique (unsubscribe_token);
  end if;
end;
$$;

commit;
