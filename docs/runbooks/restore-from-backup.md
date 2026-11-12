# Restore from a `db:backup` dump

`npm run db:backup -- --prod` keeps a copy of production on your laptop. This
runbook puts one back. It's the second line of defence: Railway's
point-in-time recovery comes first (`docs/RESTORE.md`). Use a dump when PITR
is off, the moment you need is outside its window, or you want to look at old
data without touching production.

Never paste a database URL or password into a chat, an issue or a commit. The
commands below read them from your shell's environment.

---

## 1. Take a backup (before anything risky)

```bash
npm run db:backup -- --prod
```

- It reads `PROD_DATABASE_URL`, prints the host and database, and goes on only
  once you type the host back. It runs only in an interactive terminal.
- It writes `backups/<date>-<time>.dump`. The time is UTC, and the format is
  pg_dump's *custom* format, compressed.
- It ends with the file's size and two table counts, the dump's and the
  database's. They must match, or it says so and exits with an error.
- `backups/` is git-ignored, and `no-committed-backups` fails if a dump is ever
  tracked. A dump holds password hashes and enquiries: keep it on an encrypted
  disk, and delete old ones you no longer need.
- If it says this pg_dump is older than the server, install that version's
  PostgreSQL client tools, or set `PG_BIN` to their `bin` folder.

## 2. Check a dump

```bash
pg_restore --list backups/2026-11-13-142530.dump | head
```

If it lists the archive's contents, the file is whole. `db:backup` already ran
this when it saved the file.

## 3. Look inside it locally (safe)

Restore into a scratch database on your own Postgres (port 5433), never into
`*_dev` or `*_test` that you're using:

```bash
createdb -h localhost -p 5433 -U postgres restore_check
pg_restore -h localhost -p 5433 -U postgres --no-owner --no-acl \
  --exit-on-error --single-transaction --dbname restore_check backups/<file>.dump
psql -h localhost -p 5433 -U postgres restore_check -c 'select count(*) from public.destinations'
dropdb -h localhost -p 5433 -U postgres restore_check
```

`--no-owner --no-acl` drop Railway's role names, which don't exist locally.
`db-backup.test` runs this same restore against the test database on every run.

To copy one row's old text back by hand, find it here and paste it into the
admin. That is the safest restore of all.

## 4. Restore production from a dump (last resort)

This replaces production's data with the dump's. Everything written since the
dump is lost: enquiries, bookings, admin edits, sessions. Tell Sasindu first,
and prefer PITR when it can reach the moment you need.

1. **Take a fresh backup of production as it is now** (step 1), even if it's
   broken. You may need something from it.
2. **Restore into a new Railway Postgres service**, not over the live one. In
   the Railway dashboard, add a new Postgres service to the project, on the
   same major version as the dump's server (step 1 printed it). Copy its
   `DATABASE_PUBLIC_URL` into your shell as `RESTORE_URL`. Don't add it to
   `.env` or a file.
3. Restore into it:

   ```bash
   pg_restore --no-owner --no-acl --exit-on-error --single-transaction \
     --dbname "$RESTORE_URL" backups/<file>.dump
   ```

   It's all or nothing: on any error nothing is kept. Read the message, fix the
   cause, and run it again.
4. Check it. Connect with `psql "$RESTORE_URL"` and count a few tables. The
   `schema_migrations` ledger comes back with the data, so migrations already
   applied stay applied.
5. Point the API at it. In Railway, set the API service's `DATABASE_URL` to the
   new service's reference (`${{NewPostgres.DATABASE_URL}}`, the internal URL).
   The deploy that follows runs `migrate`, which applies only what the dump
   didn't have.
6. Check the site, sign in to the admin, send a test enquiry.
7. Rotate the new service's password if the URL ever left your terminal
   (`docs/runbooks/rotate-postgres-password.md`), and keep the old service until
   you're sure. Then remove it in Railway.
8. Run `unset RESTORE_URL` and close the terminal.

## What a dump doesn't hold

- **Photos.** They're in R2, not the database; `media` holds only their keys and
  URLs. Nothing deletes from R2 automatically (CLAUDE.md), so the files are
  normally still there.
- **Railway's variables** (`R2_*`, `RESEND_API_KEY`, …). They live in the service
  settings.
- **Sessions that matter.** Restored sessions may have expired. Admins just sign
  in again.
