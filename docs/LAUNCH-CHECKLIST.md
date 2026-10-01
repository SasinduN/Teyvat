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
- [ ] **2. Rotate the Postgres password.** It was exposed during setup (read
      into a local tool session, kept in `.env`, sent over the public proxy).
      Rotate it in Railway, check the API service's `DATABASE_URL` reference
      still resolves, and update `.env` wherever the public URL is used.
      **Blocks:** go-live. **Who:** Railway admin.
- [ ] **3. `DATABASE_URL` on the API service is the internal reference**
      (`${{Postgres.DATABASE_URL}}`, a `*.railway.internal` host), so database
      traffic stays on Railway's private network.
      **Blocks:** go-live. **Who:** Railway admin.
- [ ] **4. Remove the public TCP proxy, or decide to keep it.** It exists so
      scripts can reach production from a laptop: `admin:create`,
      `images:audit`, `media:rebase`. Without it, those can't run. Keep it
      until 9 and 16 are done, then decide.
      **Blocks:** reducing what's exposed to the internet. **Who:** Railway
      admin + owner.
- [ ] **5. Match CI's Postgres version to production.** Read the major
      version in Railway (or from `npm run migrate -- --dry-run`, which prints
      it) and set the same in `.github/workflows/ci.yml` (`postgres:18` today).
      **Blocks:** CI testing what production runs. **Who:** Developer.
- [ ] **6. Protect `main`.** In GitHub, *Settings → Rules → Rulesets → New
      branch ruleset*, targeting `main`, enforcement *Active*, with an empty
      bypass list:
      - **Restrict deletions:** on.
      - **Block force pushes:** on.
      - **Require a pull request before merging:** on, with **0 required
        approvals** for now, because a solo owner can't approve their own PR.
        **Raise to 1 when a teammate joins.**
      - **Require status checks to pass:** on. Add the check **`checks`**,
        and tick *Require branches to be up to date before merging*.

      Then in Railway: API service → Settings → **Wait for CI**: on.
      **Blocks:** safe deploys. **Who:** GitHub admin + Railway admin.

## Brand and domain

- [ ] **7. Decide the brand.** The code says "Travel Eye" everywhere, as a
      placeholder.
      **Blocks:** 8, 9, 10, 11, 17. **Who:** Owner.
- [ ] **8. Buy the domain.** Add it to the Railway API service as a custom
      domain and create the DNS records Railway gives.
      **Blocks:** 9, 10, 11, 17, and real visitors. **Who:** Owner + DNS admin.
- [ ] **9. Move R2 to a custom domain** (e.g. `media.<domain>`). Today images
      are served from `r2.dev`, which Cloudflare rate-limits and describes as
      for development.
      1. Connect the domain to the bucket in Cloudflare.
      2. `npm run media:rebase -- --from <r2.dev base> --to <new base> --dry-run`,
         then the same command without `--dry-run`.
      3. Set `R2_PUBLIC_BASE_URL` to the new base in Railway and `.env`. The
         CSP and the image allow-list follow automatically.

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
      spam 30 days). Publish all three and set their URLs in *Admin →
      Settings*.
      **Blocks:** go-live, since the site collects personal data. **Who:**
      Owner (legal review advised) + content editor.
- [ ] **13. Real contact details** in *Admin → Settings*: postal address,
      phone, and contact email. The current values are the demo's.
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
      - confirm the CARTO plan covers commercial use.

      **Blocks:** commercial go-live. **Who:** Owner (CARTO account).
- [ ] **16. Image audit before each CSP change.** `npm run images:audit`
      against production must report nothing blocked. *(Last run, 1 October
      2026, before the phase 7 deploy: 70 images, all allowed.)*
      **Blocks:** CSP deploys. **Who:** Developer.
- [ ] **17. Rename "Travel Eye"** to the chosen brand in the code, page
      titles, emails and the admin.
      **Blocks:** go-live under the real brand. **Who:** Developer, after 7.

## Accounts and clean-up

- [ ] **18. Review admin accounts.** Real staff only, each with their own
      login and no shared passwords. Use `npm run admin:create --
      --reset-password` for anyone who needs a new password.
      **Blocks:** go-live. **Who:** Owner + developer.
- [ ] **19. The old Supabase project:** check it for real enquiries from
      before the move to Railway, export any you want to keep, then delete
      the project.
      **Blocks:** closing an unused service that may hold personal data.
      **Who:** Owner.
- [ ] **20. `req.ip` is the visitor, not the proxy.** Verify it once on the
      live domain, using the check in the README's Security section.
      **Blocks:** the per-IP rate limits working. **Who:** Developer.

## Always

- **Never run `db/migrations/0002_seed.sql` by hand** against production. It
  overwrites every admin edit to the seeded rows.
- **No secrets in git.** `.env` stays ignored (`git check-ignore -v .env`).
  The repository is public.
