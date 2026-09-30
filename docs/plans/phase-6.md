# Phase 6 plan: enquiries on our own API, and Supabase removed

Status: APPROVED: decisions 1–9 as written, retention 12 months, with the
changes in "Approved changes" below.

Scope:

- The public enquiry form submits to `POST /api/inquiries`.
- The admin inbox reads and writes through `/api/admin/inquiries/*`.
- Supabase leaves the codebase. Enquiries are its last user.

Also covered: how an admin notices a new enquiry, and the privacy rules for
enquiry data. The full README clean-up stays in phase 7.

## Approved changes

1. **CSV phone column exception.** A phone value that strictly matches a phone
   number (only digits, spaces, `+`, `-`, `(` and `)`, nothing else) is not
   prefixed with `'`. Every other cell, and any phone value that doesn't
   match, keeps the escaping. Tests cover both.
2. **Old Supabase project: left alone.** You'll check whether it holds real
   enquiries; phase 7 deletes it. The open question below is settled that way.
3. **Notifications: build steps 1 and 2 of section 5.** You'll create the
   Resend account. The test-sender rule is confirmed against Resend's docs
   (section 5).

## Decisions in this plan

These need a yes or no before any code is written:

1. **Three statuses: `new`, `contacted`, `closed`.**
   - The schema currently allows five (`new`, `in_progress`, `responded`,
     `closed`, `archived`), and the old inbox UI uses all five.
   - Migration 0006 maps them: `in_progress` and `responded` become
     `contacted`, and `archived` becomes `closed`. Then it replaces the CHECK.
   - The Railway table is very likely empty, because the form never wrote to
     it. The mapping makes the migration safe either way.
2. **Closed enquiries are deleted automatically 12 months after closing.**
   This is the retention period to put in the privacy policy.
   - A `closed_at` column is set when the status becomes `closed` and cleared
     if it is reopened.
   - The existing hourly sweep deletes rows closed more than 12 months ago.
   - `new` and `contacted` enquiries are never deleted automatically.
   - 12 months covers a follow-up season (someone who asked about December
     travel and comes back the next year) without keeping contact details
     indefinitely. 24 months is the obvious alternative if you'd rather keep
     them longer.
3. **Honeypot hits are kept, not thrown away.**
   - A form that fills the hidden field gets the same "sent" answer as a real
     one, so a bot learns nothing.
   - But it's stored with `spam = true`, hidden from the inbox by default,
     under a **Spam** filter.
   - Spam rows are deleted after 30 days by the same sweep.
   - Reason: browser autofill or a password manager can occasionally fill a
     honeypot. Discarding those would silently lose a real traveller's
     enquiry. Stored, they can still be recovered.
4. **`InquiryDraft` gains one optional field, `website`, for the honeypot.**
   `submitInquiry(draft)` keeps its signature; the value has to reach the
   server somehow, and this is the smallest way. It's a type change, not a
   call change.
5. **Rate limit per IP: 5 submissions per 15 minutes, 20 per 24 hours.** It
   uses the login throttle's pattern: a Postgres table of attempts (IP and
   time only, nothing else), counted before anything is stored, and swept
   after 24 hours. Honeypot hits count too.
   - The limits are generous on purpose. Sri Lankan mobile networks put many
     people behind one shared address (carrier-grade NAT), as do hotels and
     cafés.
   - The README's `req.ip` check from phase 3 matters here as well.
6. **The server stops logging error objects whole.** This applies to every
   route, not only enquiries.
   - Today `errorHandler` logs the entire error. A Postgres CHECK violation
     carries `detail: "Failing row contains (…)"`, the whole row, meaning a
     name, email and message. (Verified on `teyvat_test`: a failing enquiry
     insert's `detail` contains the submitted name and email.) A JSON parse error carries the raw request
     body.
   - The handler will log only the error's name, message, Postgres `code`,
     constraint name and stack. Never `detail`, `body`, `where` or
     parameters.
   - A test submits failing enquiries while capturing the console, and
     asserts none of the submitted strings appear.
7. **Removing `@supabase/supabase-js` pulls some phase 7 work forward**,
   because leaving it would break the build:
   - `scripts/migrate-images.ts` and `npm run images:migrate` (they import the
     SDK);
   - the `supabase` entry in `vite.config.ts` `manualChunks`;
   - the `VITE_SUPABASE_*` types in `src/vite-env.d.ts`.

   The README's Supabase sections stay until phase 7, as you said. I'll put a
   one-line note on them saying they are out of date.
8. **Notes and status changes use the phase 4 version rule.** `PATCH` carries
   `expectedUpdatedAt`, and a stale save gets 409. Otherwise two admins
   editing notes on the same enquiry would overwrite each other.
9. **Email and phone links are encoded.** The email CHECK allows `?` and `&`,
   so `mailto:${email}` could smuggle in a subject or body. It becomes
   `mailto:${encodeURIComponent(email)}`, and `tel:` keeps only `+`, digits
   and spaces.

### Enquiries already in Supabase (settled)

Left in the old project for now (approved change 2). Removing the client code
doesn't touch the project. Phase 7 deletes it after you've checked it for real
enquiries.

## Findings that shape the plan

- **The insert whitelist is the RLS guarantee's replacement.**
  `0001_init.sql` says the public endpoint must build its INSERT from
  visitor-supplied fields only, so `status` stays `new` and `admin_notes`
  stays NULL. The route names its columns explicitly. `status`, `spam`,
  `closed_at` and `admin_notes` are set by the server and never read from
  the request.
- **InquiryModal already shows the server's message** through
  `describeError`. So a 400 or 429 message written for visitors ("Please
  check your email address.", "Too many enquiries from this connection. Try
  again in N minutes.") needs no change to the modal.
- **The unrouted `InquiriesInbox`** already has the status filter, search,
  expandable detail, a status select, notes and delete. It shows the message
  with `whitespace-pre-wrap` in a `<p>` (React escapes text), and there's no
  `dangerouslySetInnerHTML` anywhere in the repo. It needs its data calls
  swapped, three statuses instead of five, the spam filter, versioned saves
  and CSV export.

## 1. Migration `0006_inquiries.sql`

- Map the statuses (decision 1) and replace the CHECK with
  `status in ('new','contacted','closed')`.
- `closed_at timestamptz` (decision 2), plus
  `CHECK ((status = 'closed') = (closed_at is not null))`, so it can't drift.
- `spam boolean not null default false` (decision 3).
- `public.inquiry_attempts (id, ip inet not null, attempted_at timestamptz)`,
  indexed on `(ip, attempted_at)` (decision 5).
- Indexes for the inbox: `(spam, status, created_at desc)`.
- Idempotent, like the others.

## 2. Public API: `POST /api/inquiries`

`sameOrigin` (already on every `/api` write), no session.

1. **Zod**, mirroring the CHECKs:
   - `name` 1–120 characters, trimmed;
   - `email` valid, up to 254 characters;
   - `phone` up to 40 characters, optional;
   - `travelers` and `dates` up to 80 characters;
   - `subject` up to 300 characters;
   - `message` up to 5000 characters;
   - `website` (the honeypot) optional.

   On failure: 400 with `fields`. The `message` names the first problem in
   plain words, because that is all the modal shows.
2. **Throttle** (decision 5): count this IP's attempts in the last 15 minutes
   and 24 hours. If over the limit: 429 with `Retry-After` and a message for
   visitors.
3. **Record the attempt** (IP and time only).
4. **Insert** with an explicit column list: `name`, `email`, `phone`,
   `travelers`, `dates`, `subject`, `message`, and `spam` (true if `website`
   is non-empty). Nothing else comes from the request.
5. **201** `{ ok: true }`, the same for spam and real enquiries.
6. **Notify** (section 5): after the response is sent, never blocking it and
   never failing it.

`src/lib/api/inquiries.ts`: `submitInquiry` becomes a `postJson` to this
route. Its signature is unchanged (decision 4).

## 3. The honeypot in `InquiryModal` (called-out markup change)

The only markup change to a frozen component in this phase:

```tsx
<div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
  <label>
    Leave this field empty
    <input type="text" name="leave_blank_hp" tabIndex={-1} autoComplete="off"
           value={formData.website} onChange={…} />
  </label>
</div>
```

- It's off-screen with an inline style rather than a new class, so no
  stylesheet changes.
- `aria-hidden`, so screen readers skip it.
- `tabIndex={-1}`, so keyboard users never land on it.
- An unusual name with `autoComplete="off"`, to keep autofill away.
- `blankForm` gains `website: ''`.

**Render comparison, visual.** The HTML will differ by design, so the check is
a pixel comparison.

- The modal is rendered at the phase 5 commit and at the phase 6 commit (with
  and without a prefilled subject), with the built CSS, in headless Chrome.
- Both are screenshotted over the DevTools protocol, reusing
  `server/test/chrome.ts`.
- The screenshots must match pixel for pixel. A second check confirms the
  honeypot can't be reached with Tab.

`git diff 4033faf -- src/components/` must show exactly the honeypot and the
`blankForm` field, nothing else.

## 4. Admin API: `/api/admin/inquiries`

Every route is `requireAdmin` + `Cache-Control: no-store`; writes also pass
`sameOrigin`.

| Route | Result |
|---|---|
| `GET /api/admin/inquiries?status=&search=&spam=` | list, newest first; `spam` defaults to false |
| `GET /api/admin/inquiries/counts` | `{ new, contacted, closed, spam }`; `new` excludes spam |
| `GET /api/admin/inquiries/:id` | one enquiry, or 404 |
| `PATCH /api/admin/inquiries/:id` | `{ status?, admin_notes?, spam?, expectedUpdatedAt }`; 409 if stale; sets or clears `closed_at` |
| `DELETE /api/admin/inquiries/:id` | 204, permanent |
| `GET /api/admin/inquiries/export.csv?status=&spam=` | CSV download (section 6) |

- Search matches name, email and subject with `ILIKE`, with the pattern's
  `%` and `_` escaped.
- `admin_notes` is up to 5000 characters, as in the schema.

**Inbox UI** (`InquiriesInbox` routed in place of the placeholder):

- Filter: All / New / Contacted / Closed / Spam.
- Detail view: expand a row.
- Status select, notes (saved on blur, with the 409 message and reload as in
  phase 4), delete with a confirm, and "Not spam" on spam rows.
- All enquiry text is rendered as text, never HTML.
- **Unread count** = `new`, excluding spam. It shows as a badge on the
  sidebar's Enquiries item and on the restored dashboard tile. It refreshes
  every 60 seconds and when the window regains focus.
- An **Export CSV** button for the current filter.

## 5. Getting noticed: new-enquiry emails

Proposal, in three steps. Each works without the next.

1. **Now, needs nothing:** the unread badge in the sidebar and on the
   dashboard, refreshed every minute, and the tab title shows the count
   ("(2) Enquiries · Travel Eye Admin") while the admin panel is open.
2. **As soon as there's a free Resend account:** email through Resend's
   HTTP API, called with `fetch` (no SDK dependency).
   - Without a verified domain, Resend only sends from
     `onboarding@resend.dev`, and only *to the account owner's own address*.
     For notifying the site owner, that is enough.
   - **Confirmed** against Resend's docs ("403 Error Using resend.dev
     Domain"): "You can only send testing emails to your own email address".
     Any other recipient gets a 403 until a domain is verified. The API is
     `POST https://api.resend.com/emails` with `Authorization: Bearer re_…`,
     a JSON body of `from`, `to`, `subject` and `text`, and an optional
     `Idempotency-Key` header; success is 200 `{ id }`.
   - A 403 from Resend is logged as "Resend refused the recipient: with the
     test sender, `NOTIFY_EMAIL_TO` must be the Resend account's own
     address", so a mismatched address is easy to spot.
   - Variables: `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM`
     (optional; defaults to the onboarding sender).
3. **Before go-live:** a verified sending domain, which needs the domain the
   brand decision will produce. Then `NOTIFY_EMAIL_FROM` becomes an address
   on it, and any admin address can receive.

How the email behaves:

- **No enquiry content.** The email says "New enquiry on Travel Eye" and links
  to `/admin/inquiries`. No name, email or message, so personal data isn't
  copied to an email provider or sitting in inboxes, and the privacy policy
  stays simple.
- **At most one email per 15 minutes**, saying how many came in, so a spam
  wave can't flood the admin. Spam rows never trigger one.
- **Off without the variables**, like R2: the site runs normally.
- A failed send is logged without any enquiry data, and never affects the
  visitor's submission.

"Travel Eye" in the email is the existing brand string in the code, not a
new one.

## 6. CSV export

- **Columns:** received, status, name, email, phone, travelers, dates,
  subject, message, admin notes, closed.
- **Quoting:** RFC 4180. Every field is quoted, `"` is doubled, and CRLF line
  ends. A UTF-8 BOM goes first, so Excel reads Sinhala and Tamil correctly.
- **Formula injection:** any cell that starts with `=`, `+`, `-`, `@`, a tab
  or a carriage return gets a leading `'`. That covers OWASP's list; tab and
  CR are included because Excel also acts on them.
  - **Phone column exception** (approved change 1): a phone value that
    matches `^[0-9 +()-]+$` exactly is not prefixed. It can't hold a
    function call or a reference, so there's nothing to inject. Any other
    phone value is escaped like every other cell.
- Sent with `Content-Disposition: attachment;
  filename="enquiries-YYYY-MM-DD.csv"` and `Cache-Control: no-store`.
- `csv.ts` is a pure function, unit-tested.

## 7. Removing Supabase

- Delete `src/lib/supabase.ts` and the dynamic import in `inquiries.ts`.
- Remove the `@supabase/supabase-js` dependency, then run `npm install` so the
  lockfile drops it and everything it brought in.
- Remove the `VITE_SUPABASE_*` entries from `.env.example` and their types
  from `src/vite-env.d.ts`.
- Remove the `supabase` entry from `manualChunks` in `vite.config.ts`.
- Delete `scripts/migrate-images.ts` and `npm run images:migrate`
  (decision 7).
- **Confirm it's gone:** no match for `supabase` in `src/`, `server/`,
  `shared/`, `scripts/`, `package.json`, `vite.config.ts` or `dist/`.
  Comments and the README are phase 7.
- The `describeError` codes `42501` and `23505` were PostgREST-specific. They
  go; the API's own messages replace them.

## 8. Privacy

- **Logs:** decision 6, plus a check that no enquiry route logs request data.
  The notification failure log names the provider's status code, and nothing
  else.
- **Permanent delete:** the inbox's delete removes the row. There's no soft
  delete and no copy anywhere else: notification emails carry no content, and
  the throttle table holds IPs only.
- **Retention** (decision 2): closed enquiries after 12 months, spam after 30
  days, throttle rows after 24 hours. I'll add a short paragraph to the README
  for the privacy policy page, stating what is collected, why, how long it's
  kept, and who can see it.

## 9. Tests

`server/test/inquiries.test.ts`:

- **Whitelist:** a public POST that also sends `status: 'closed'`,
  `admin_notes`, `spam: false`, `closed_at` and `id` stores `status = 'new'`,
  `admin_notes = NULL`, a generated id, and `spam` decided by the honeypot
  alone.
- **Honeypot:** a filled `website` gets 201 and is stored with
  `spam = true`, is absent from the default inbox list, and is present under
  the spam filter.
- **Validation:** each field over its limit, a missing name, and a bad email
  all give 400 with the right `fields` key and a plain-language `message`.
- **Rate limit:**
  - the 6th submission from one IP within 15 minutes gets 429 with
    `Retry-After`;
  - another IP still gets through;
  - the 24-hour limit works the same way.
- **Cross-origin POST:** 403, and nothing is stored.
- **Inbox auth:** every inbox endpoint returns 401 without a session.
- **Inbox:**
  - status changes set and clear `closed_at`;
  - notes save;
  - a stale `PATCH` gets 409;
  - delete removes the row;
  - `counts` excludes spam from `new`.
- **CSV:**
  - cells starting with `=`, `+`, `-`, `@`, a tab or a CR get the `'`
    prefix;
  - a phone of only digits, spaces and `+ - ( )` (`+94 77 123 4567`,
    `(011) 234-5678`) is not prefixed. A phone with anything else
    (`+94 77 123 4567 =1+1`, `-2+3;cmd`, `@SUM(A1)`) is. The same
    `+94 …` text in the message column is still prefixed;
  - quotes and newlines survive quoting;
  - the BOM is present;
  - a submitted message `=HYPERLINK("http://evil","x")` comes out escaped in
    the export.
- **Retention sweep:** closed over 12 months ago → deleted; closed 11 months
  ago, `new` and `contacted` → kept; spam over 30 days → deleted.
- **No personal data in logs:** failing inserts (a forced CHECK violation)
  and malformed JSON are sent while `console.*` is captured, and none of the
  submitted name, email or message strings may appear.
- **Notifications,** with a fake sender:
  - one email for three enquiries within 15 minutes;
  - none for spam;
  - the body contains none of the enquiry's fields;
  - a failing sender doesn't fail the submission;
  - no email and no error when the variables are unset.
- **Migration:** the five old statuses map to the three new ones.

In headless Chrome (`server/test/browser-inquiry.test.ts`): the pixel
comparison and the Tab-order check from section 3.

## 10. Checks and wrap-up

- `typecheck`, `verify:roundtrip`, `npm test`, `build`.
- The Supabase search from section 7 comes back empty.
- The visual render comparison (section 3), and the component diff showing
  only the honeypot.
- Bundle: the public entry chunk before and after. `inquiries.ts` no longer
  pulls a Supabase chunk, so the lazily loaded Supabase SDK disappears from
  `dist/` entirely.
- CLAUDE.md: the phase table, notes, and the new optional variables in the
  Railway list. README: the privacy paragraph, the inbox, notifications, and
  launch-checklist entries (Resend domain, retention in the privacy policy).
- Commit locally, show the results, and ask before pushing.
