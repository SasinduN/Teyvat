-- Older imported booking tables used one rate-limit counter per IP.
-- CREATE TABLE IF NOT EXISTS in 0014 could not upgrade that existing table.
-- Preserve its count/window for all actions rather than resetting protection.
begin;
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'booking_attempts' and column_name = 'action'
  ) then
    lock table public.booking_attempts in access exclusive mode;
    alter table public.booking_attempts add column action text;
    update public.booking_attempts set action = 'session';
    alter table public.booking_attempts drop constraint booking_attempts_pkey;
    insert into public.booking_attempts (ip, action, attempts, window_started)
      select ip, actions.action, attempts, window_started
      from public.booking_attempts cross join (values ('create'), ('change')) as actions(action);
    alter table public.booking_attempts alter column action set not null;
    alter table public.booking_attempts add constraint booking_attempts_action_check
      check (action in ('session', 'create', 'change'));
    alter table public.booking_attempts add primary key (ip, action);
  end if;
end $$;
commit;
