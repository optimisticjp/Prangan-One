# Production runbook

This is the current, single source of truth for how Prangan One actually runs in production. If anything in `docs/` or elsewhere in this repo disagrees with this file, this file is correct - older documents describing a pre-Supabase, local-only version of the app have been moved to `docs/archive/` with a note explaining why, specifically so nothing in this repo can be mistaken for a second, competing source of truth.

Everything below is written from what's actually verifiable in this repository: real code, real schema, real test results. Anything that requires access to your live Supabase dashboard - which this repo cannot see or verify on its own - is marked explicitly as **requires manual verification**, not assumed complete because the platform documentation says a feature exists.

---

## 1. Architecture overview

React 18 + TypeScript, built with Vite, deployed as a static site to Cloudflare Pages. No custom backend server and no API routes of your own - the browser talks directly to Supabase (Postgres, Auth, Storage) for everything real, with every access rule enforced by Postgres's own Row Level Security, not by anything in the client code. The client-side role checks in `src/lib/permissions.ts` exist purely for UX (hiding a button someone couldn't use anyway) and are explicitly documented as not being the real security boundary anywhere they're used.

`src/lib/store.tsx` is the single data layer every page goes through (`useData()`), which is what let the entire backend move from browser-only local storage to real Supabase without touching any page's own code - only this one file's internals changed.

Two session types share the same UI: a genuine, authenticated Supabase session (`isRealSession: true`) for real societies, and a local-only demo/preview session (`isRealSession: false`) that never reaches Supabase at all. Every real write in the app checks this flag before ever calling Supabase - verified exhaustively, function by function, in earlier work on this project, not assumed.

## 2. Canonical schema and migration process

`supabase/schema.sql`, in this repository, is the single canonical schema. There is no second schema file competing with it - a copy of this exact file gets handed alongside each delivered build for convenience, but the file in the repo is always the real, current one.

This project does not use incremental migration files. Every schema change to date has been applied by fully resetting and reapplying the complete schema (`prangan-one-full-reset.sql` then `schema.sql`), not by diffing against the previous version. This is a deliberate choice, documented in the schema file's own comments, and has worked cleanly because the schema itself has no data worth preserving across a reset yet - the moment a real society's data exists in production, this process needs to change to genuine, additive migrations that never drop a table, and that change should happen before it's needed under pressure, not during an actual incident.

**To apply the schema to a fresh or reset project:**
```sql
-- 1. Run prangan-one-full-reset.sql (drops every table and function, if any exist)
-- 2. Run schema.sql in full
-- 3. Re-add the owner's own membership, since the reset removes it too:
insert into memberships (email, society_id, role, status)
values ('pnitin147@gmail.com', null, 'owner', 'active');
```

**Requires manual verification:** confirm the schema currently applied to the live Supabase project actually matches this repository's `schema.sql` exactly. This repository cannot see your live database's actual state. If there's any doubt, the safest path is a full reset and reapply using the process above, on a project with no real society data in it yet.

**Also requires manual verification, and worth calling out specifically: the public privacy page (`src/pages/public/Privacy.tsx`) states data is "hosted in AWS Mumbai."** This repository has no way to confirm which region your live Supabase project actually runs in - that claim was presumably written to match `supabase/README.md`'s own setup instructions (Mumbai if available at signup, Singapore otherwise), not independently verified against the live project. Check Supabase Dashboard → Project Settings → General for the actual region, and fix that page's wording if it's currently wrong - it's a factual claim on a public legal page, not something to leave assumed.

## 3. Environment variables

Everything the client code actually reads, confirmed directly against the source rather than assumed from `.env.example`:

| Variable | Purpose | Required in production |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project's URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase's current name for the client-safe key (formerly "anon key") | Yes |
| `VITE_SUPABASE_ANON_KEY` | Accepted as a fallback name for the same key, for compatibility | No (use the name above) |
| `VITE_DEMO_MODE` | Enables the `/demo` role-picker routes | Must be unset or `false` on the real production deployment |
| `VITE_DEMO_SEED` | Whether the local, browser-only fallback layer starts with sample data or empty | Doesn't affect a real session at all |

The `service_role` key must never appear in any `VITE_`-prefixed variable or anywhere in client code - it bypasses Row Level Security entirely and is a backend-only credential. `grep -r "service_role" dist/` after a production build should return nothing; this is worth running as a real check, not just trusting that it wouldn't happen.

Set the two required Supabase variables directly in Cloudflare Pages' own dashboard (Settings → Environment variables) for the production deployment, never committed to the repository.

## 4. Deployment process

Cloudflare Pages, git-connected: framework preset Vite, build command `npm run build`, output directory `dist`. Full step-by-step detail, including why Cloudflare rather than Vercel (a real, deliberate decision about commercial-use terms, not a default choice), is in `supabase/README.md`.

**Requires manual verification:** confirm the production Cloudflare Pages deployment is currently pointed at the intended branch, and that its environment variables match what's documented above.

## 5. Production verification checklist

Run this by hand once after any schema change, in addition to (not instead of) the automated isolation suite in section 6:

- [ ] Log in as two different residents in different societies and confirm each only ever sees their own society's data
- [ ] Log in as the owner and confirm the societies list shows every real tenant, not just one
- [ ] Try voting twice on the same poll from the same flat - the second attempt should fail
- [ ] Try reading a committee-only document as a resident role - should return nothing, not an error
- [ ] Turn a module off for a society and confirm its routes redirect away even when the URL is typed directly, not just hidden from navigation
- [ ] Confirm the keep-alive workflow (section 9) has actually run at least once successfully, not just that the file exists

## 6. Row Level Security verification

`supabase/tests/run-isolation-tests.sh` is the real, automated version of the checklist above, plus the owner support-mode safeguard added later in this project - it applies the actual schema to a fresh, throwaway database and runs around 40 real checks against it, then discards the database. Nothing it does touches the live Supabase project.

```bash
cd supabase/tests
./run-isolation-tests.sh
```

This is now also wired into CI (section 8) and runs automatically on every push, not only when someone remembers to run it by hand.

**What it actually proves, and what it doesn't:** it proves the schema in this repository enforces tenant isolation correctly, when applied fresh. It does not, on its own, prove the live Supabase project's currently-applied schema is identical to this one - see section 2's manual verification note.

## 7. Backup and restore

Covered in full, honestly, in section 12 below - kept separate rather than folded in here since it's one of the most consequential things in this whole document and deserves its own clear space.

## 8. Continuous integration

`.github/workflows/ci.yml`, added as part of this pass - previously, this project's 251 tests and the isolation suite only ever ran when someone remembered to run them by hand. Two jobs, running in parallel on every push and pull request:

- **app**: type checking (`tsc --noEmit`), the full Vitest suite, and a real production build
- **isolation**: the database isolation suite in section 6, against a real, temporary Postgres instance GitHub Actions provisions for the job and discards afterward

**Requires manual verification:** this workflow's logic and YAML were checked carefully and validated as well-formed, but this repository has no way to actually execute a GitHub Actions run from within it. The first real push after this lands is the actual first time it runs for real - watch the Actions tab on that push to confirm both jobs go green, rather than assuming they will.

## 9. Keep-alive ping

`.github/workflows/keep-supabase-awake.yml`, also added as part of this pass. A Supabase free-tier project with seven straight days of no traffic gets automatically paused until manually resumed from the dashboard - documented as a required step before go-live in `supabase/README.md` for a while, but never actually existed as a real, running workflow until now.

**Requires manual action, not just verification:** this workflow needs two repository secrets that only you can set, since this repo has no access to your GitHub repository settings - under Settings → Secrets and variables → Actions, add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with the same values as your production `.env`. Until those secrets exist, this workflow will run on schedule and fail every time. After adding them, trigger it once manually from the Actions tab (it supports `workflow_dispatch`, a manual run button, specifically for this) to confirm it actually succeeds, rather than waiting three days to find out.

## 10. Error monitoring

**Honestly: none exists.** No Sentry, no equivalent, confirmed directly - there is no error-reporting dependency in `package.json` and no initialization code for one anywhere in the source. A `src/components/ErrorBoundary.tsx` exists and prevents a single component crash from taking down the whole app, which is real and useful, but it does not report anything anywhere; it only prevents a blank white screen locally, for whoever happens to be looking at their own browser at that moment.

This is a real, open gap, not something this pass closed. Recommended: Sentry's free tier is a reasonable, low-effort starting point for a project this size.

## 11. Owner support access

Covered in detail in the project's own build history (`CLAUDE_CODE_NEXT_STEPS.md`, the entry on owner support mode). In short: an owner can enter a real, read-only, logged support session for any real society, seeing that society's actual live data. Every write for that society is refused for the duration of that session, enforced by Postgres itself (not only by the client app), reusing the same `impersonation_logs` table that records who entered, when, and why. A session no one explicitly exits ages out on its own after four hours, rather than leaving things blocked indefinitely by an accident.

There is no write-capable support mode. It existed at an earlier point in this project and was removed entirely, not hidden, once a full review of this whole product explicitly ruled out full impersonation and write-on-someone-else's-behalf as something this product should ever do.

## 12. Backup and restore checklist

Every item below is marked plainly. Nothing here is claimed complete just because Supabase's own marketing says the platform supports it - only what has actually, specifically been checked or done for this project gets marked verified.

**Legend:** ✅ verified · ⬜ not yet verified · 🚫 not available on the current plan · ⚠️ requires manual action from you

### Database backups

- ⬜ **Confirm what backup capability is actually enabled for this specific project.** Supabase Dashboard → Database → Backups. Free-tier projects typically get daily backups retained for a short window (a handful of days); paid plans add point-in-time recovery. Which of these actually applies here has not been confirmed against the live dashboard from this repository, and can't be - only someone with dashboard access can check this box.
- ⬜ **Confirm where the latest available backup actually is**, and its actual timestamp, not assumed current. Same location as above.
- ⬜ **Confirm whether point-in-time recovery is enabled.** If it isn't (likely, on a free-tier project), the honest implication is real: data lost between the last daily backup and the moment of an incident is not recoverable at all. That's a real limitation of the current plan, worth knowing plainly rather than discovering during an actual incident.
- ⬜ **Confirm who actually has permission to perform a restore.** Supabase project ownership/admin access, specifically.
- ⬜ **Perform one real restore test, on a separate, throwaway Supabase project, not the live one**, and record the date it was done and what was confirmed. This is explicitly required before onboarding the first real society, per the spec this pass was built against - a restore procedure nobody has ever actually run is a plan, not a working safety net.

### Storage files

- ⬜ **Do not assume Storage objects are covered by database backups - confirm this explicitly.** Database backups (whatever tier applies above) generally do not include Supabase Storage bucket contents; these are commonly a separate concern with their own retention behavior, and this needs confirming against the actual dashboard, not assumed.
- **Buckets containing real client documents, confirmed directly from `schema.sql`:** `complaint-photos`, `payment-proof`, `society-logos`, `documents`. The first three are private; `documents` follows the same four-tier permission the `documents` table itself uses.
- ⬜ **Document and set up a separate backup approach for these buckets specifically**, once the database-backup question above is answered - if buckets are confirmed excluded from whatever database backup applies, a scheduled export (the Supabase CLI can list and download bucket contents) is the straightforward path, not yet built as part of this pass.
- ⬜ **Confirm how restoring bucket contents would actually work**, once a backup approach exists for them.

### The one non-negotiable item

- ⬜ **Before the first real, paying society is onboarded: perform and record one real, complete restore test in a safe, separate environment.** Not simulated, not assumed from platform documentation - an actual restore, actually performed, actually confirmed to produce working data, with the date and outcome written down somewhere durable (this file is a reasonable place). This has not been done as part of this pass, and cannot be done from within this repository - it requires real Supabase dashboard access this repo doesn't have.

## 13. New society onboarding

The owner-console onboarding wizard (`/owner/societies/new`) is the real, current path - walks through creating a society, adding flats (including a CSV bulk-import option, see section 14), and generating the first bills, all writing to the real database as it goes. This was the subject of extensive, dedicated fixing work earlier in this project after a real bug was found where several of these steps were silently writing to a local-only layer instead of the real database - now covered by dedicated tests proving each step reaches Supabase for real, not just extending the wizard further without re-checking that foundation.

## 14. Data import

Flats support CSV bulk import from the Members page - a real, working feature (`validateFlatImport`/`addFlatsBulk` in the source), not a placeholder. No equivalent bulk-import path exists yet for bills, payments, or historical records; a society with existing history in a spreadsheet currently needs that entered flat by flat, or bill by bill, through the normal admin screens.

## 15. Client offboarding

**Honestly: there is no dedicated "offboard this client" feature.** The real, current options:

- **Pause billing without touching any data:** set the society's subscription status to paused or archived from the owner console (a real, database-backed action, verified as part of earlier work in this project). Fully reversible - all the society's data stays exactly as it was.
- **Genuinely remove a society's data:** no UI path for this exists. It would mean directly deleting the society's row via the Supabase dashboard or SQL editor, which cascades to remove every dependent record (flats, bills, payments, complaints, everything) automatically, per the schema's own foreign key design. This is irreversible and has no undo - if a client ever requests genuine deletion, treat this as a deliberate, manual, dashboard-level action, not something to build a self-service button for without a lot more thought first.

## 16. Client data export

Two real, different things exist, worth not confusing with each other:

- **A convenience JSON export**, from the admin Settings page - downloads whatever's currently loaded in that browser's own session. Useful as a quick, local snapshot; not a complete, guaranteed export of every record the database actually holds for that society, since it only reflects what that specific session has fetched.
- **A genuine, complete export**, if a client ever needs one for real (a data-portability request, an actual offboarding): Supabase's own database export tools, scoped by `society_id` across the relevant tables. Not built as a one-click feature in this pass; a straightforward thing to script when it's actually needed, using the same table structure documented in `schema.sql`.

## 17. Incident procedure

Not previously written down anywhere in this repository. A minimum, honest starting point:

1. **If it's a data-correctness issue** (something looks wrong for a specific society): check `audit_logs` and, for anything payment-related, the specific payment/bill rows directly - every financial write in this app goes through one of three atomic database functions (`record_payment_atomic`, `confirm_pending_payment_atomic`, `cancel_receipt_atomic`), so a correctness issue is more likely to be a data-entry mistake than a systemic bug, but check the actual rows before assuming either way.
2. **If it's a suspected access-control issue** (someone saw data they shouldn't have): treat as serious immediately. Re-run the isolation suite (section 6) against the live schema's actual current definition as a first check, and review `audit_logs`/`impersonation_logs` for anything unexpected in the relevant window.
3. **If the app is down or the database is unreachable:** check the Supabase project's own status first (a paused free-tier project, from section 9, is the single most likely mundane cause), then Cloudflare Pages' own deployment status.
4. **There is no on-call rotation, alerting, or paging system of any kind right now** - see section 10. Whoever operates this finds out about an incident when someone tells them, not from any automated signal. Worth treating as a real gap, not a footnote.

## 18. Demo deployment separation

Lives on the same domain, under `/demo`, not a separate subdomain - a deliberate decision, not an oversight (see the third document in this project's own history). The route being hidden from normal navigation is explicitly not treated as the actual security boundary here; every real safeguard below holds regardless of whether the URL is discovered.

**Requires manual action, not verification:** `VITE_DEMO_MODE` must be explicitly set to `true` for the real production deployment if the demo should be reachable there at all. Confirm this in Cloudflare Pages' own environment variables, since it's easy to assume it's on without ever having actually checked.

## 19. Demo safety model

Every one of these is real and independently verified, not assumed correct because the design looked reasonable on paper - see the isolation and journey test suites for the actual proof, and `CLAUDE_CODE_NEXT_STEPS.md`'s entries on the fourth plan for the real reasoning behind each one.

- **Structural, not conventional, isolation from Supabase.** The demo's own data provider (`src/lib/demoStore.tsx`) never imports `realData.ts` or `lib/supabase.ts` anywhere in its own source - confirmed by a test that reads the actual file text directly, not just a runtime flag that happens to gate a shared code path.
- **Genuinely separate storage.** `sessionStorage`, under its own `prangan_demo_v1_*` key prefix, never the same key a real session's own cached data uses. Clears itself the moment the tab closes.
- **A real schema version on the seed itself.** A stale or mismatched version resets to the canonical seed automatically, rather than letting an old shape of demo data linger indefinitely.
- **Genuinely synthetic ids throughout**, both in the seed and for anything created during a session - `demo-flat-a101`, `demo-payment-<timestamp><n>`, never a shape a real or locally-cached record could ever produce or collide with.
- **Role-aware data scoping, matching this project's own real RLS policies exactly**, checked directly against `schema.sql` rather than guessed - a resident session in the demo cannot see another flat's bills, payments, or private complaints, the same restriction a real session gets from Postgres itself.
- **The owner console is never offered at all.** No owner role in the demo's own role picker, and every owner-only store action is a structural no-op in the demo provider.
- **A permanent, always-visible identification banner** ("Demo Society, fictional data, changes are temporary") on every single demo screen, plus a genuinely reachable "restart demo" action from both the committee and resident sides - not buried in an admin-only settings page the way an earlier iteration of this project's own reset function was.
- **Unsupported actions say so plainly, not silently.** File uploads, document links, and payment proof links a real session would fetch from Supabase Storage instead surface a real, visible "this is simulated" message in the demo, using the same toast mechanism a blocked real write already used.
- **No watermark.** Deliberately not added - the permanent banner above already states this plainly in words on every screen, which is a stronger, more reliable signal than a subtle visual mark someone could simply not notice.
