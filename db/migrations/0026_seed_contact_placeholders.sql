-- ---------------------------------------------------------------------------
-- The seed's contact details become obvious placeholders
--
-- 0001 seeded a postal address and phone number that look real but belong to
-- nobody. Contact details come only from Admin → Settings, so the seed's now
-- read as placeholders anyone will notice. (The rebrand first did this by
-- editing 0001 itself; applied migrations are never edited, so it is here.)
-- The seed's contact email is 0025's.
--
-- As in 0021, a column changes only while it still holds the exact text the
-- seed wrote, so anything an admin saved stays. Re-runnable: a second run
-- matches nothing.
-- ---------------------------------------------------------------------------

begin;

update public.site_settings
   set postal_address = 'Placeholder address: set it in Admin → Settings'
 where id and postal_address = 'Level 12, Galle Face Terrace, Colombo 03, Sri Lanka';

update public.site_settings
   set phone = '+94 00 000 0000'
 where id and phone = '+94 11 234 5678';

commit;
