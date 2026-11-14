# Launch checklist

Everything that has to happen before the site goes live, in one place. These
are decisions and dashboard work only people can do; the code for each is
already in the repo.

Each item says **what it blocks** and **who** does it:

- **Owner:** the business decision-maker.
- **Railway admin**, **Cloudflare admin**, **GitHub admin**, **DNS admin:**
  whoever holds that account.
- **Developer.**
- **Content editor:** someone with an admin login.

The order is such that nothing waits on an item listed after it. Tick items
off in a pull request, so the history shows when each was done.

---

## Infrastructure and safety

- [ ] **1. Point-in-time recovery: verify it's enabled.** *(Enabled by the
      owner ahead of launch; confirm it stays on.)* Railway → Postgres →
      Backups should show PITR on, with a restorable range. Rehearse one
      restore to a fork ([`RESTORE.md`](RESTORE.md)).
      **Blocks:** any recovery from data loss. **Who:** Railway admin.
- [ ] **2. Rotate the Postgres password (address was public; password exposed earlier).**
      The password was exposed during setup (read into a local tool session,
      kept in `.env`, sent over the public proxy), and the proxy's address was
      in a test file in this repo while it was public (replaced in #58; still in
      the history). Follow [`runbooks/rotate-postgres-password.md`](runbooks/rotate-postgres-password.md):
      change it in Postgres, then the Postgres service's variables, redeploy the
      API service, check `/api/health`, and update `PROD_DATABASE_URL` in `.env`.
      **Blocks:** go-live. **Who:** Railway admin.
- [ ] **3. `DATABASE_URL` on the API service is the internal reference**
      (`${{Postgres.DATABASE_URL}}`, a `*.railway.internal` host), so database
      traffic stays on Railway's private network.
      **Blocks:** go-live. **Who:** Railway admin.
- [ ] **4. Disable the Postgres TCP proxy when not running --prod scripts; update
      PROD_DATABASE_URL when re-enabled.** The proxy exists only so scripts can
      reach production from a laptop with `--prod`: `admin:create`,
      `images:audit`, `images:import`, `content:import`, `media:rebase`. The site
      doesn't use it (item 3). Turn it on (Railway → Postgres → Settings →
      Networking) just before such a run and off straight after. Railway's docs
      don't say whether a re-added proxy keeps its domain and port, so each time
      it's re-enabled, copy the new `DATABASE_PUBLIC_URL` into `PROD_DATABASE_URL`
      in `.env` (with `?sslmode=require`).
      **Blocks:** reducing what's exposed to the internet. **Who:** Railway
      admin.
- [ ] **5. Match CI's Postgres version to production.** Read the major
      version in Railway (or from `npm run migrate -- --dry-run`, which prints
      it) and set the same in `.github/workflows/ci.yml` (`public.ecr.aws/docker/library/postgres:18` today).
      **Blocks:** CI testing what production runs. **Who:** Developer.
- [x] **6. Protect `main`.** On since 6 November 2026: a branch ruleset in GitHub,
      *Settings → Rules → Rulesets*, targeting the default branch, enforcement
      *Active*, with an empty bypass list:
      - **Require a pull request before merging:** on, with **0 required
        approvals**, because Sasindu reviews and merges his own PRs, and
        GitHub doesn't let an author approve their own (CLAUDE.md).
      - **Require status checks to pass:** on, the check **`checks`**.
      - **Block force pushes:** on.
      - **Restrict deletions:** on.

      **Blocks:** safe deploys. **Who:** GitHub admin.
- [ ] **6a. Railway → API service → Settings → Wait for CI: on,** so a deploy waits
      for the check above. Confirm it stays on.
      **Blocks:** safe deploys. **Who:** Railway admin.

## Brand and domain

- [ ] **7. Decide the brand.** The code says "Travel Eye" everywhere, as a
      placeholder.
      **Blocks:** 8, 9, 10, 11, 17. **Who:** Owner.
- [ ] **8. Buy the domain.** Add it to the Railway API service as a custom
      domain and create the DNS records Railway gives. Then set
      `PUBLIC_SITE_URL` to `https://<domain>` on the API service: every
      canonical link, share preview and sitemap entry is built from it.
      **Blocks:** 9, 10, 11, 17, and real visitors. **Who:** Owner + DNS admin.
- [ ] **9. Move R2 to a custom domain**: `images.serendibluxetours.com`, in a new
      bucket on the client's Cloudflare account (which owns the domain). Today images
      are served from `r2.dev`, which Cloudflare rate-limits and describes as
      for development. Every step, in order, with checks and rollback:
      [`docs/runbooks/move-r2-to-client.md`](runbooks/move-r2-to-client.md).

      **Blocks:** go-live. **Who:** Cloudflare admin + developer.
- [ ] **10. Verify a sending domain in Resend.** Then set `NOTIFY_EMAIL_FROM`
      to an address on it, and add other recipients if you want them. Until
      then, alert emails only reach the Resend account's own address.
      **Blocks:** alert emails to anyone else. **Who:** DNS admin + owner.
- [ ] **11. Raise HSTS** from one day to a year
      (`HSTS_MAX_AGE` in `server/src/security-headers.ts`), and decide on
      `includeSubDomains` and preload. Only once the domain is settled: a
      long HSTS can't be withdrawn.
      **Blocks:** long-term HTTPS-only. **Who:** Developer, after 8.

## Content and legal

- [ ] **12. Privacy policy, terms, and sustainability pages.** The privacy
      policy must state what the enquiry form keeps and for how long; the
      README's "Privacy" section has the facts (closed enquiries 12 months,
      spam 30 days). **It must also cover the newsletter:** the address
      and when it was given are kept until the subscriber unsubscribes
      (which deletes it), and its rate limit keeps IP addresses for 24 hours
      (README, "Newsletter"). The Footer's consent line links to it. Publish all three
      and set their URLs in *Admin → Settings*.
      **Blocks:** go-live, since the site collects personal data. **Who:**
      Owner (legal review advised) + content editor.
- [ ] **13. Real contact details** in *Admin → Settings*: postal address,
      phone, and contact email. The current values are the demo's. Also the
      **WhatsApp number** (international format, e.g. `94771234567`): until
      it is set, the site has no WhatsApp button. Check it with *Test in
      WhatsApp* beside the field.
      **Blocks:** go-live. **Who:** Owner + content editor.
- [ ] **14. Owned or licensed photos** to replace the Unsplash ones. Upload
      through the media library.
      **Blocks:** a brand that owns its look; not legally blocking. **Who:**
      Owner + content editor.
- [ ] **15. Map tiles: CARTO key.** *(The keyed tile URL and the required
      map credit are in: `VITE_CARTO_KEY`, set in Railway.)* Remaining:
      - in the CARTO dashboard, **restrict the key to the site's domains and
        add the real domain at launch**; it currently serves requests with
        no referrer at all, so anyone could use it;
      - confirm the CARTO plan covers commercial use;
      - on the live `/explore`, check the map shows streets, not "API key
        required" tiles. Vite inlines `VITE_CARTO_KEY` when the client is
        built, so it must be set before the build that's deployed.

      **Blocks:** commercial go-live. **Who:** Owner (CARTO account).
- [ ] **16. Image audit before each CSP change.** `npm run images:audit -- --prod`
      against production must report nothing blocked. *(Last run, 1 October
      2026, before the phase 7 deploy: 70 images, all allowed.)*
      **Blocks:** CSP deploys. **Who:** Developer.
- [ ] **17. Rename "Travel Eye"** to the chosen brand in the code, page
      titles, emails and the admin.
      **Blocks:** go-live under the real brand. **Who:** Developer, after 7.

- [ ] **22. Newsletter: send it, or hide the form.** Nothing sends
      newsletters: the Footer's form only stores addresses. Either set up
      sending (every email carries `newsletterUnsubscribeUrl(origin, token)`
      and a `List-Unsubscribe` header) or hide the form until then. Addresses
      collected before migration 0012 were given without the consent line;
      email them nothing until they confirm, or delete them.
      **Blocks:** go-live with the form visible. **Who:** Owner, then
      Developer.
- [x] **23. Copy the Wikimedia photos into R2, then drop the host from the
      CSP.** Done: the photos are in R2, and `chore/cleanup-after-r2` removes the
      host. What was done: once the fix-forward PR for #11 is deployed, run
      `npm run images:import -- --dry-run --prod` and then
      `npm run images:import -- --prod` (needs `PROD_DATABASE_URL` and the
      five `R2_*` values in `.env`). Then `npm run images:audit -- --prod` on the
      branch that removes `upload.wikimedia.org` (item 16) must report
      nothing blocked before that branch is merged. If it's merged first,
      migration 0013 puts the rows still on Wikimedia back on their seed
      photos: nothing is blocked, but those rows lose the new photos.
      (docs/plans/fix-pr11.md, PR B.)
      **Blocks:** the CSP's last third-party image host going. **Who:**
      Developer, with the Railway and Cloudflare values.
- [ ] **24. Bookings (off until this is done).** The bookings PR adds
      migration 0014 (five tables; undo in `docs/BOOKING_DATABASE.md`), which
      the deploy runs: **confirm a fresh backup before merging it.** Then,
      before setting `BOOKINGS_ENABLED=true` in Railway:
      - enter each vehicle category's real passenger capacity in *Admin →
        Bookings* (the seeded "Car" takes no requests until then);
      - the privacy policy (item 12) covers booking requests: contact details
        and the places sent (GPS coordinates only if the traveller chose
        them), kept 12 months after a request ends (completed, declined or
        cancelled), open ones until staff close them; rate limits keep IP
        addresses for 24 hours; status emails go through Resend;
      - booking terms (a request, not a reservation; price agreed after);
      - a verified Resend sender, or travellers get no status emails.

      **Blocks:** turning bookings on. **Who:** Owner, then Developer.

## Accounts and clean-up

- [ ] **18. Review admin accounts.** Real staff only, each with their own
      login and no shared passwords. Use `npm run admin:create --
      --reset-password --prod` for anyone who needs a new password.
      **Blocks:** go-live. **Who:** Owner + developer.
- [ ] **19. The old Supabase project:** check it for real enquiries from
      before the move to Railway, export any you want to keep, then delete
      the project.
      **Blocks:** closing an unused service that may hold personal data.
      **Who:** Owner.
- [ ] **20. `req.ip` is the visitor, not the proxy.** Verify it once on the
      live domain, using the check in the README's Security section.
      **Blocks:** the per-IP rate limits working. **Who:** Developer.
- [ ] **21. Open the site to search engines: set `SITE_INDEXABLE=true`** on
      the API service, last, once the domain (8), `PUBLIC_SITE_URL` and the
      real content (12–14) are in. Until then robots.txt disallows
      everything, every page says `noindex`, and there is no sitemap or
      `llms.txt`. After setting it, check `/robots.txt` names the sitemap,
      `/sitemap.xml` and `/llms.txt` list the pages, then submit the sitemap
      in Google Search Console.
      **Blocks:** search traffic. **Who:** Railway admin + owner.

## Always

- **Never run `db/migrations/0002_seed.sql` by hand** against production. It
  overwrites every admin edit to the seeded rows.
- **No secrets in git.** `.env` stays ignored (`git check-ignore -v .env`).
  The repository was public until it was made private: treat anything in its
  history as published.
