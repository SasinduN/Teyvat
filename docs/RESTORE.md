# Restoring the database

Railway's **point-in-time recovery (PITR)** can rebuild the Postgres database
as it was at any moment in the last ~4 weeks. Use it after an accidental
delete, a bad migration, or a script that went wrong.

Everything here is done in the **Railway dashboard**. Don't use the Railway
CLI from a developer machine: the local CLI may be linked to a different
project.

Source: Railway's documentation, [Point-in-Time Recovery](https://docs.railway.com/volumes/point-in-time-recovery)
and [Back Up and Restore Postgres](https://docs.railway.com/guides/postgres-backups-restores).
Check them for changes before relying on the details below.

---

## Before anything goes wrong: is it on?

PITR has to be **enabled first**, and it is **not retroactive**: the restore
window starts at the first base backup taken after enabling. If it isn't on,
there's nothing to restore from.

1. Railway → the project → the **Postgres** service → **Backups** tab.
2. If you see *Point-in-time recovery is off*, click **Enable PITR** and
   confirm.
3. Railway then:
   - creates a storage bucket (`Postgres-PITR`);
   - sets the archive variables on the service;
   - redeploys Postgres once (a short interruption).

Good to know:

- **Window:** about 4 weeks. Railway keeps the last 4 weekly full backups, a
  daily differential, and every WAL segment in between.
- **Image tag:** keep the Postgres image on a **major** tag (e.g. `…:16`), not
  a pinned minor version. PITR doesn't support minor pinning.
- **Cost:** the bucket's storage and egress (compressed).

Check the Backups tab now and then. It shows the archiver's health and the
restorable range.

---

## Restoring the whole database

A restore never touches the original database. It builds a **new** service
next to it, and you switch the app over when you're satisfied.

1. **Pick the moment.** Choose the last time you know the data was right,
   just before the mistake. Times are in UTC.
2. **Postgres service → Backups →** choose that date and time → **Restore to
   this moment.**
3. **Wait for the new service,** named `<Postgres>-restored-YYYYMMDD-HHMM`.
   On first boot it loads the base backup and replays the archive up to your
   moment. Large databases take longer.
4. **Check it.** Open the restored service's **Data** tab and look at what
   went wrong. Is the deleted content back? Are the enquiries you expect
   there? The site isn't using it yet, so look as long as you need.
5. **Switch the app over.** **API service → Variables → `DATABASE_URL`.**
   Change the reference from `${{Postgres.DATABASE_URL}}` to
   `${{<restored service name>.DATABASE_URL}}`, and redeploy the API service.
   - The start command runs `npm run migrate` first. If the restored copy is
     from before a migration, that migration is applied again; migrations are
     written to be safe to re-run.
6. **Check the live site:** the public page, then sign in to `/admin`.
   Sessions created after the restore point are gone, so everyone signs in
   again.
7. **Tidy up:**
   - Once you're sure, rename or remove the old Postgres service.
   - **Enable PITR on the restored service.** A restored copy does not
     archive until you do. Until then there's no backup.
   - If the old service had the public TCP proxy and you still need it, add
     it to the new one. Update `.env` on any machine that used the old public
     URL.

Anything that arrived after the restore point and before the switch-over is
**not** in the restored database: enquiries, admin edits, new users. If that
matters, copy those rows from the old service before removing it.

---

## Restoring part of it (one deleted row, one table)

When most of the data is fine and only something specific is gone:

1. Restore to the moment before the loss, as above (steps 1–4). This creates
   a fork; don't switch the app over.
2. Copy what you need from the fork back into the live database. For a
   handful of rows, use the Data tab or a SQL client connected to both.
3. Delete the fork.

---

## Things to know

- **Uploaded images live in R2, not in Postgres.** A database restore doesn't
  bring back a deleted R2 object, and doesn't remove one either. After a
  restore, *Admin → Media library* may list images whose files are gone (if
  they were deleted after the restore point), or the bucket may hold files
  with no library row.
- **The app keeps no other copy of the data.** Notification emails carry no
  enquiry content, so a lost enquiry can only come back from PITR.
- **Rehearse it once** before launch: restore to a fork, look at it, delete
  it. It's the only way to know it works while it doesn't matter.
