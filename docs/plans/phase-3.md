# Phase 3 plan: our own auth, and Supabase out of the public bundle

Status: APPROVED by Sasindu, with the decisions and changes below already merged in.
Save this file in the repo as docs/plans/phase-3.md so later sessions can read it.

## Decisions already made

- Every user is an admin. There is no second role. requireAdmin means "a valid, unexpired session whose user still exists". The "signed in but not admin" screen is removed.
- Sessions last 7 days, fixed from sign-in (not extended by activity). Sign-out and sign-out-everywhere end them immediately.

## Findings that shape the plan

- The admin panel won't work for content between phase 3 and phase 4. Only sign-in moves in phase 3. The dashboard, collection pages and inbox still query Supabase, and the content now lives in Railway. After phase 3 you can sign in, but those pages will error until phase 4.
- After deploying, no one can sign in until an admin is created. The Railway users table is empty. Run create-admin.ts locally against the DATABASE_URL in .env. No Railway CLI needed.
- AuthProvider currently wraps the public route as well as the admin. It moves inside AdminApp, so the public page makes no auth calls at all.

## 1. Database: db/migrations/0003_login_attempts.sql

- One new table, login_attempts:
  - id
  - email_hash: SHA-256 of the trimmed, lowercased submitted email
  - ip (inet)
  - succeeded
  - attempted_at
  - Indexes on (email_hash, attempted_at) and (ip, attempted_at)
- A hash instead of the email, because people sometimes type their password into the email field.
- users and sessions already exist in 0001_init.sql and don't change.

## 2. Server

New dependency: @node-rs/argon2 (argon2id, m=19456, t=2, p=1). Check that the lockfile includes the prebuilt Linux x64 binary Railway needs.

New files in server/src/auth/:

- passwords.ts: hash, verify, and a dummy hash generated once at boot from random bytes with the same cost settings.
- sessions.ts:
  - Random 32-byte token in the cookie; only its SHA-256 stored in token_hash.
  - Lookup requires expires_at > now().
  - last_seen_at updated at most once every 5 minutes.
  - Revoke one session, or all of a user's sessions.
- cookies.ts: a small cookie parser (no cookie-parser dependency).
  - Cookie: __Host-teyvat_session, HttpOnly, Secure, SameSite=Strict, Path=/.
  - 7 days, fixed from sign-in.
  - Confirm in Chrome that the cookie works on http://localhost.
- middleware.ts:
  - requireSession: attaches the signed-in user, or 401.
  - requireAdmin: same as requireSession under the all-admin model.
  - sameOrigin: every /api request that isn't GET, HEAD or OPTIONS. Origin must equal req.protocol://host. If Origin is missing, accept Sec-Fetch-Site: same-origin; otherwise 403. Works in dev because the Vite proxy uses changeOrigin: false.
- throttle.ts: the login limits (section 3).
- sweep.ts: at boot and then hourly, delete expired sessions and login_attempts rows older than 24 hours. Stop the timer at shutdown.

Routes (server/src/routes/auth.ts), all Cache-Control: no-store:

| Route | Guard | Result |
|---|---|---|
| POST /api/auth/login | sameOrigin, throttle | 200 { user } + cookie, 401, 429 |
| GET /api/auth/me | requireSession | 200 { user }, 401 |
| POST /api/auth/logout | sameOrigin | deletes this session, clears cookie, 204 |
| POST /api/auth/logout-all | sameOrigin, requireSession | deletes all the user's sessions, 204 |

- Login body validated with Zod: email up to 254 characters, password 1–1024 characters.
- Emails trimmed and lowercased.
- A successful login sets last_login_at and records user agent and IP on the session.

Shared contract (shared/api.ts): API_ROUTES.auth.*, AuthUser (id, email, fullName), and a too_many_requests error code returned as HTTP 429.

## 3. Security requirements

### Brute-force protection on login

Limits, each over a rolling 15 minutes, counting failures:

- 5 per (email_hash, ip). An attacker can only lock themselves out, not the real admin on another network.
- 20 per ip, across all emails.
- 50 per email_hash, across all IPs. Catches a spread-out attack without letting one person lock the admin out.

The IP is req.ip with trust proxy 1, i.e. the address Railway's proxy saw.

When a limit is hit:
- 429 with Retry-After and "Too many sign-in attempts. Try again in N minutes."
- Checked before the password is verified, so a correct password during a lockout also gets 429 and costs no hashing work.
- The response is identical whether or not the email exists.

Resets: a successful login clears that email's failures (not the IP's). create-admin --reset-password also clears the email's failures.

Counters are rows in Postgres, so they survive redeploys and hold across replicas. Simultaneous requests can slightly overshoot a limit; that's accepted.

### No user enumeration

- Unknown email and wrong password both return 401 "Incorrect email or password."
- An unknown email is verified against the dummy hash, so both paths run exactly one argon2 verify.
- 400 and 429 responses don't depend on whether the email exists.
- argon2 runs on Node's worker threads (default 4), capping concurrent hashing memory at about 4 × 19 MiB.

### Supabase out of the public bundle

- App.tsx: remove the AuthProvider wrapper. AdminApp wraps its own routes instead.
- AuthContext stops importing Supabase and calls /api/auth/*.
- src/lib/api/inquiries.ts loads the Supabase client only when called (await import('@/lib/supabase')). Phase 6 deletes this.
- describeError moves to src/lib/errors.ts; supabase.ts re-exports it so admin files don't change.
- Component call-out: src/components/InquiryModal.tsx line 5 changes its import from '@/lib/supabase' to '@/lib/errors'. Import-only; the render comparison must confirm identical HTML.
- Before (current main), everything dist/index.html references:

  | File | Size | Gzip |
  |---|---|---|
  | index-*.js | 501.1 kB | 149.9 kB |
  | leaflet-*.js | 161.4 kB | 47.1 kB |
  | supabase-*.js (goes) | 223.7 kB | 58.3 kB |
  | index-*.css | 66.0 kB | 10.4 kB |
  | Total | 952.3 kB | 265.8 kB |

- Expected after: about 725 kB (about 207 kB gzipped). Report the measured number.
- After building, check: index.html no longer preloads the Supabase chunk; only submitting the enquiry form loads it; the main chunk is back under 500 kB.
- Out of scope: Leaflet.

## 4. Tests

Runner: node:test via tsx --test, no new dependencies. Each test starts the app on a random port (createApp().listen(0)) and calls it with fetch. Tests simulate different client IPs with X-Forwarded-For, which trust proxy 1 honours for one hop.

Test database guard. Setup fails with a clear error, with no fallback to any default host or port, unless TEST_DATABASE_URL:
- is set,
- points at localhost,
- names a database ending in _test,
- includes an explicit port.

Setup applies all migrations to that database, then empties users, sessions and login_attempts between tests.

Cases:
- login ok: sets the cookie, then /me returns the user
- wrong password: 401
- unknown email: the same 401 body as a wrong password, and argon2 verify ran exactly once on each path. Also compare median time over 10 runs of each within 25%; if that timing assertion proves flaky, drop it and keep the verify-count assertion.
- rate limit, same email and IP: the 6th attempt gets 429 with Retry-After, even with the correct password
- rate limit, IP A vs IP B: after IP A is locked out for an email, the same email still works from IP B
- rate limit, per IP: the 21st failure from one IP across different emails gets 429
- rate limit, per email: the 51st failure for one email across many IPs gets 429
- expired session: move expires_at into the past, then /me returns 401
- revoked session: after logout the old cookie gets 401; after logout-all both of two sessions get 401
- cross-origin POST: Origin https://evil.example gets 403; no Origin and no Sec-Fetch-Site gets 403
- requireAdmin, on a throwaway test app: no cookie, a made-up token, and a session whose user was deleted all get 401

## 5. scripts/create-admin.ts (npm run admin:create)

- Usage: npm run admin:create -- --email you@x.lk --name "Full Name"
- Password typed twice at a hidden prompt, never on the command line. 12–1024 characters.
- If the email exists, refuse unless --reset-password, which replaces the hash, deletes that user's sessions and clears the email's login failures.
- Print a warning if the email matches site_settings.contact_email, because that address is public in the footer.
- Never prints the password or hash.
- Runs against DATABASE_URL, which in the local .env is production.

## 6. Admin frontend (src/admin, not part of the frozen design)

- AuthContext uses TanStack Query on /api/auth/me and exposes user, initializing, signIn, signOut and signOutEverywhere. Signing out clears the admin query cache.
- LoginPage: remove the "Supabase is not configured" note; show the 401 and 429 messages as returned.
- RequireAdmin: remove the "no admin access" screen. Update its comment: protection now comes from the server middleware.
- AdminLayout and DashboardPage: adapt to the new user shape; add "Sign out everywhere" next to "Sign out".

## 7. Docs

- README security section: explain that the per-IP limit depends on req.ip being the real visitor address. If Railway's proxy setup ever makes it the proxy's own address, "20 per IP" becomes a site-wide lockout. How to check after deploy: one wrong password from a laptop and one from a phone on mobile data, then confirm login_attempts.ip shows two different addresses.
- Update the status table in CLAUDE.md.

## 8. Checks and wrap-up

- typecheck, verify:roundtrip, npm test, build
- Rerun the render comparison against demo-baseline (InquiryModal is touched)
- Bundle size before and after
- Chrome pass: sign-in and sign-out; an expired or invalid cookie sends you to the login page; sign out everywhere; the public page makes no requests to /api/auth
- Commit locally, show the results, and ask before pushing
