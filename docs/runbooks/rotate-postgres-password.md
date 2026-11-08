# Runbook: rotate the production Postgres password

For launch checklist item 2. Everything here is done by hand, by whoever holds the Railway
account, in Railway's dashboard and a local terminal. No step is for a tool session to run.

**Why:** the password was exposed during setup, and the TCP proxy's address was in a test file
while the repository was public (#58 replaced it; the history keeps it).

**How long:** about 15 minutes, of which the site may fail for **a few minutes**, between
step 3 and step 6. Pick a quiet hour.

**What Railway's docs don't say** (checked 8 November 2026,
[PostgreSQL](https://docs.railway.com/guides/postgresql),
[variables](https://docs.railway.com/guides/variables)):
- whether changing the Postgres service's password variable changes the database's real
  password;
- whether a re-added TCP proxy keeps its address.

So this runbook treats the real password (inside Postgres) and the variable (in Railway) as
**two separate things that must be made to agree**, and changes the real one first, while you
can still connect.

Steps marked **⚠ Risky** are where the site can lose its database. Each says how to back out.

---

## Before you start (changes nothing)

1. **Have a backup.** Railway → Postgres → Backups: point-in-time recovery is on and shows a
   restorable range (checklist item 1), or take a manual backup now. See
   [`RESTORE.md`](../RESTORE.md).
2. **Read the Postgres service's variables.** Railway → Postgres → Variables. Note, without
   copying any value anywhere:
   - **the user:** `PGUSER` (usually `postgres`);
   - **the password variables:** `PGPASSWORD` and/or `POSTGRES_PASSWORD`;
   - **how `DATABASE_URL` and `DATABASE_PUBLIC_URL` are built.** Click each one: are they
     *references* to the password variable (`${{PGPASSWORD}}` or `${{POSTGRES_PASSWORD}}`), or
     does the password sit in them as plain text? If it's plain text, you'll edit those two
     as well in step 5.
3. **Check the site's reference.** Railway → the API service (Teyvat) → Variables:
   `DATABASE_URL` must be exactly `${{Postgres.DATABASE_URL}}` (checklist item 3). Then the
   site follows the Postgres service's value, and nothing about the password lives on the
   API service.
4. **Make the new password.** Hex only, so it never needs escaping in a URL:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   - **Where to keep it:** put it in your password manager, **next to the old password**.
     Keep both until the end: the old one is how you back out.
   - **Where it must never go:** git, a chat, an issue, or a tool session.
5. **Turn the TCP proxy on,** if it's off (Postgres → Settings → Networking), and note the host
   and port it shows. You need it to reach the database from your laptop.
6. **Have `psql` ready** (the local Postgres 18 install has it).

## The change

### 1. Open a session with the old password, and keep it open

```sh
psql "host=<proxy host> port=<proxy port> user=<PGUSER> dbname=railway sslmode=require"
```

- **The password:** psql asks for it. Give the **old** one. Typing it at the prompt keeps it
  out of your shell history.
- **The database name:** use `PGDATABASE` if it isn't `railway`.
- **Keep this window open** until step 5 is deployed: as long as it stays open, you can put
  anything back.

### 2. Check the name of the user

```sql
select current_user;
```

It must match `PGUSER`. If it doesn't, stop and find out why before going on.

### 3. ⚠ Risky: change the real password

In the open session:

```sql
\password <PGUSER>
```

- **What `\password` does:** psql asks for the new password twice, and sends the server only
  its SCRAM hash. The new password never reaches the server's logs or your shell history.
  Don't use `ALTER ROLE … PASSWORD '…'` with the password typed into the command.
- **The risk:** from this moment, **new** connections with the old password fail. Connections
  that are already open stay open. The site's pool closes idle connections after 30 seconds
  (`server/src/db.ts`), and the replacements it opens use the old password, from its
  `DATABASE_URL`. So **the site may start failing within a minute**, until step 6.
- **To back out:** in the same open session, run `\password <PGUSER>` again and give the
  **old** password. The site recovers by itself, with no redeploy.

### 4. Prove the new password works, from a second window

```sh
psql "host=<proxy host> port=<proxy port> user=<PGUSER> dbname=railway sslmode=require" -c "select 1"
```

Give the **new** password.

- **If it works:** go on to step 5.
- **If it fails:** use the first window, still open, to set it again (`\password`), or to put
  the old one back (step 3's way back).

### 5. ⚠ Risky: put the new password in the Postgres service's variables

Railway → Postgres → Variables:

1. **The password variables:** set `PGPASSWORD`, and `POSTGRES_PASSWORD` if it exists, to the
   **new** password.
2. **The two URLs:** if step 2 of "Before you start" showed `DATABASE_URL` or
   `DATABASE_PUBLIC_URL` holding the password as plain text, edit them too.
3. **Leave everything else alone:** don't change `PGUSER`, the database name, or the host
   variables.
4. **Deploy:** Railway stages the changes. Review them: only the password, and maybe the two
   URLs, should be listed. Then **Deploy**.

**What the deploy does:**
- **It restarts the Postgres service**, so expect a short gap, and your first `psql` window
  will be disconnected.
- **What the restart does to the password isn't documented.** It may leave the real password
  as step 3 set it, or set it again from the variable. Both give the new password, because
  step 3 and this step used the same value.

**Then check:**
- **The new password still works:** run step 4's command again, with the new password.
- **The service is healthy:** Postgres → Deployments, with no crash loop in its logs.

**If the new password fails after the restart,** try the old one.
- **If the old one works:** the restart set the password back from a variable you missed
  (`PGPASSWORD`/`POSTGRES_PASSWORD`, or a URL holding plain text). Fix that variable and
  deploy again, or connect with the old password and repeat step 3.
- **If neither works:** see "If the site can't connect" below.

### 6. ⚠ Risky: redeploy the API service

Railway → Teyvat → Deployments → the latest deployment → **Redeploy**. A running service keeps
the `DATABASE_URL` it started with; a redeploy picks up the new value through
`${{Postgres.DATABASE_URL}}`.

**What protects you here:**
- **The health check gates the rollout.** Railway's health check is `/api/health`, which
  answers 200 only when a real `select 1` works (`server/src/routes/health.ts`). If the new
  deployment can't log in, the check fails and the rollout doesn't complete.
- **The old deployment stays up meanwhile,** but it uses the old password too, so after step 3
  it's failing anyway. A failed rollout here means the site stays down until you fix the
  variables: go to "If the site can't connect".

### 7. Check the site

```sh
curl -s -i https://<site>/api/health
```

- **What it should return:** `HTTP/1.1 200` with `"status":"ok","database":"up"` (`<site>` is
  `teyvat-production.up.railway.app` until the domain moves).
- **What a failure looks like:** a 500 with `Database unreachable.` means the API still can't
  log in.

Then:
- **Open the home page and a destination page:** they read `/api/content` from the database.
- **Sign in to `/admin`:** sessions are in the database.
- **Teyvat's logs:** there should be no `password authentication failed` and no
  `[db] health probe failed` after the new deployment started.

### 8. Update your laptop's `PROD_DATABASE_URL`

Do this by hand, in your own editor, in `.env` (never paste `.env` anywhere):

1. **Copy the new `DATABASE_PUBLIC_URL`:** Railway → Postgres → Variables, then
   `DATABASE_PUBLIC_URL` (it now carries the new password).
2. **Set `PROD_DATABASE_URL`** to that value, with `?sslmode=require` on the end (README,
   "Database").
3. **Check it with a read-only script:**

   ```sh
   npm run images:audit -- --prod
   ```

   It prints the host and asks you to type it back, then only reads.
   - **A login error:** the line in `.env` is wrong.
   - **A connection that hangs or is refused:** the proxy is off, or has a new address.

### 9. Turn the TCP proxy off again

Postgres → Settings → Networking: remove the TCP proxy (checklist item 4). The site doesn't use
it; it uses the private `*.railway.internal` address.

**The next time you need a `--prod` script:**
1. Turn the proxy on.
2. Copy the `DATABASE_PUBLIC_URL` Railway then shows into `PROD_DATABASE_URL`. The domain and
   port may have changed.
3. Run the script, then turn the proxy off.

### 10. Finish

1. **The old password:** delete it from your password manager, once the site has been fine for
   a day.
2. **The checklist:** tick item 2 in `docs/LAUNCH-CHECKLIST.md` in a pull request, with the
   date.

---

## If the site can't connect

**How it shows:**
- `/api/health` answers 500 `Database unreachable.`;
- pages show their error state;
- Teyvat's logs say `password authentication failed for user …`.

**What it means:** the password the API sends (from the Postgres service's variables) and the
real one disagree. Work out which password Postgres actually has, then make the other side
match.

1. **Is Postgres up at all?**
   - Postgres → Deployments: if it's restarting or crashing, wait for it or read its logs first.
   - Errors about the connection, not the password: this runbook can't fix those.
2. **Which password does it have?** Connect with `psql` as in step 4: try the **new** password,
   then the **old** one. Whichever works is the real one. (If the proxy is off, turn it on.)
3. **Make the other side agree.** Use whichever is quicker:
   - **Change the variables to the real password:** set `PGPASSWORD`/`POSTGRES_PASSWORD` (and
     any plain-text URL) to it, deploy the Postgres service, then redeploy Teyvat (steps 5–6).
   - **Change the real password to match the variables:** connected with the working password,
     run `\password <PGUSER>` and give the value the variables hold. Then redeploy Teyvat.
     Postgres needs no restart for this.
4. **Neither password works:**
   - **Look for a forgotten variable:** the password may have been set from a variable you
     didn't change. Check `PGPASSWORD`, `POSTGRES_PASSWORD` and both URLs in the Postgres
     service for a third value.
   - **Get a shell inside the Postgres service:** Railway's CLI can open one (`railway ssh`,
     run by you: tool sessions never run the Railway CLI). In the image Railway's template
     uses, `psql -U <PGUSER>` over the local socket may be allowed without a password. If it
     is, run `\password <PGUSER>` there with the value from the variables, then redeploy Teyvat.
   - **If that doesn't work either:** contact Railway support. Restoring a backup doesn't help:
     a restored database keeps whatever password it had.
5. **Afterwards:** check `/api/health` again (step 7).

**What never helps:**
- running `0002_seed.sql`, or any migration, by hand;
- deleting or recreating the Postgres service;
- changing `PGUSER` or the database name.
