-- ---------------------------------------------------------------------------
-- The rebrand: seed text that named the earlier brand
--
-- As in 0021, a column changes only while it still holds the exact text the
-- seed wrote, so anything an admin saved stays. Re-runnable: a second run
-- matches nothing.
--
-- The earlier text is matched by its md5, not written out, so the earlier name
-- appears nowhere in the repository (server/test/brand-strings.test.ts).
-- `npm run brand:audit -- --prod` lists whatever is left, by table, id and
-- column, for fixing in the admin.
--
-- What the seeds held, checked against db/migrations and scripts/fixtures:
--   site_settings.contact_email   0001's address at the earlier domain.
-- No destination, experience, tour, article, author, hidden gem, photo story,
-- hero slide or pillar seeded by 0002, 0021 or 0023 named the earlier brand.
-- The home headline and the footer quote were in the code, not the database:
-- they are the tagline now (shared/brand.ts, Admin → Settings).
-- ---------------------------------------------------------------------------

begin;

update public.site_settings
   set contact_email = 'hello@serendibluxetours.com'
 where id and md5(contact_email) = 'd68190146081ba12c4b34fdeea5aa86c';

commit;
