# Connecting Supabase and going live

This is the real, current setup this app runs on in production - not a future guide. Written as a step-by-step walkthrough so it's still useful for setting up a second project or redoing this from scratch, but everything described here is already true of the live app, not something still pending.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com), create a new project (pick a region close to your users: Mumbai/`ap-south-1` if Supabase offers it in your account, otherwise Singapore is the next closest).
2. Note down the **Project URL** and the **anon public key** from Project Settings → API. You'll need these for `.env`.

Supabase's free tier explicitly allows commercial use, no credit card needed, and covers a 500MB database, 1GB of file storage, and up to 50,000 monthly active users, more than enough for one society or several. There's one operational catch, covered in step 4 below: don't skip it.

## 2. Apply the schema

Easiest path, using the Supabase dashboard:

1. Open your project → **SQL Editor**.
2. Paste the entire contents of `supabase/schema.sql`.
3. Run it. It creates every table, index, helper function, and RLS policy in one go.

Or with the Supabase CLI, if you prefer scripting this:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --file supabase/schema.sql
```

## 3. Environment variables

Copy `.env.example` to `.env` and fill in the two Supabase values:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The `VITE_` prefix matters. Vite only exposes env vars to client code if they're prefixed that way, `NEXT_PUBLIC_...` (a different framework's convention) won't work here. "Publishable key" is Supabase's current name for the client-safe key (it replaces the older "anon key" name, same purpose, safe to ship in the browser, protected by RLS not secrecy). Never put a `secret` or `service_role` key in a `VITE_`-prefixed variable, that key bypasses RLS entirely and must only ever be used server-side.

## 4. Keep the free project from pausing itself

A Supabase free-tier project that receives no traffic for seven straight days gets automatically paused until someone manually resumes it from the dashboard. For a real, live app this is not a cosmetic issue: a quiet week (a holiday, slow early adoption) and the app just looks broken to anyone who opens it.

Pick one, both take a few minutes and both are free:

- **GitHub Actions cron** (works even without a live frontend yet): add a workflow that hits your Supabase project's REST URL on a schedule.
  ```yaml
  # .github/workflows/keep-supabase-awake.yml
  on:
    schedule:
      - cron: '0 6 */3 * *'  # every 3 days
  jobs:
    ping:
      runs-on: ubuntu-latest
      steps:
        - run: curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_PUBLISHABLE_KEY"
          env:
            SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
            SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
  ```
- **UptimeRobot** (uptimerobot.com, free tier): add an HTTP monitor pointed at the deployed app's URL, checking every few hours. Doubles as basic uptime monitoring for free.

Set this up before go-live, not after the first time someone finds the app offline.

## 5. Auth: email magic link

Real, live email magic-link login is what's actually running today - `src/pages/Login.tsx` calls `supabase.auth.signInWithOtp({ email })` for real, not a simulated "sent" state. A few things worth knowing about how it's wired:

1. In Supabase Dashboard → Authentication → Providers, **Email** is enabled by default with magic-link (passwordless) sign-in, no separate provider or extra setup needed, unlike phone.
2. `src/pages/Login.tsx` sends the real magic link; `src/pages/AuthCallback.tsx` handles the redirect back once the emailed link is clicked.
3. Because a resident's `memberships` row is created by the committee first (via the Members page, using the email captured there), not by the resident signing up cold, the first successful login needs a claim step: `claimMemberships` (`src/lib/auth.ts`), called from `AuthCallback.tsx`, matches the newly authenticated `auth.users.email` against any pending `memberships` rows for that email and attaches the real `user_id` - done client-side, on that first callback, not via a separate Edge Function.

This was a deliberate choice over phone OTP: real SMS OTP in India needs TRAI DLT sender registration (about ₹5,900 + GST, 3 to 7 working days to clear) plus a per-message cost, none of which is free. Email magic link costs nothing extra. The real tradeoff is that not every resident has or checks an email regularly; the Members page collects an optional email per flat for exactly this reason, and the committee can always act on a resident's behalf if that resident never gets a working login of their own.

## 6. Storage buckets

All four buckets are live now, created and secured directly by `schema.sql` - nothing extra to run for any of them:

- **`complaint-photos`**: photos attached to complaints. Private, visible under the same rule as the complaint itself (personal complaints stay private to that flat and management, community ones are visible society-wide).
- **`payment-proof`**: screenshots residents attach when marking a bill paid. Private, visible only to the paying flat and management - a UPI screenshot isn't something even a neighbor in the same society should be able to browse to.
- **`society-logos`**: branding logos. Public (a logo isn't sensitive), so it can be served directly without a signed URL - end users reading a logo never touch RLS at all, Supabase serves public bucket objects directly. It still has a `select` policy of its own, for a genuinely easy-to-miss reason: without one, an `insert ... returning` (which the upload client relies on to confirm what it just wrote) fails outright, since Postgres checks `returning` output against select-level RLS the same way it would a real `select`. Confirmed this directly while building it - worth remembering if another bucket ever needs the same public-write, public-read shape.
- **`documents`**: society documents (audit reports, AGM minutes, AMC contracts). Follows the exact same four-tier permission the `documents` table's own RLS already encodes (public/committee/accountant/admin), joined through from the storage side the same way complaint photos and payment proof join back to their own tables. Its `select` policy was written from the start this time, not added after hitting the same `returning` issue society-logos did.

## 7. Deploying: Cloudflare Pages, not Vercel

Worth being specific about this: Vercel's free Hobby plan is restricted by its own terms to non-commercial, personal use, and the moment this is set up for a paying client, it's commercial use. Cloudflare Pages' free tier explicitly allows commercial use, with unlimited bandwidth and no credit card required, same git-connected deploy workflow.

1. Push this repo to a Git provider (GitHub, GitLab) if it isn't already.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings: framework preset **Vite**, build command `npm run build`, output directory `dist`.
4. Under **Settings → Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the same values from your `.env`, entered directly in the Cloudflare dashboard, not committed to the repo).
5. Deploy. Cloudflare gives a `*.pages.dev` URL immediately; a custom domain can be attached afterward under **Custom domains**.

## 8. What changed in the code

`src/lib/store.tsx` was the only file that needed to change when this migration actually happened - every page calls `useData()` and gets back the same shaped object (`db`, `session`, `recordPayment`, `addComplaint`, `addSociety`, etc.) whether it's backed by Supabase or the local demo layer. See `CLAUDE_CODE_NEXT_STEPS.md` for the real, detailed history of how this migration was actually done, table by table, including real bugs found along the way.

## 9. Sanity-check after connecting

- [ ] Log in as two different residents (different `memberships` rows) and confirm each only sees their own society's data
- [ ] Log in as the SaaS owner and confirm the societies list still shows every tenant, not just one
- [ ] Try to vote twice on the same poll from the same flat: should fail on the second attempt (the `UNIQUE(poll_id, flat_id)` constraint, not just the UI)
- [ ] Try to read a `committee`-only document as a resident role: should return zero rows, not an error, not the document
- [ ] Turn a module off for a society in Settings and confirm its routes redirect away even when typed directly into the address bar, not just hidden from navigation
- [ ] Confirm the `service_role` key never appears in any client-side bundle (`grep -r "service_role" dist/` after a build should return nothing)
- [ ] Confirm the keep-alive ping (step 4) is actually running, not just configured

## 10. Automated isolation tests

The checklist above is worth doing by hand once, after first connecting. For every change after that, `supabase/tests/run-isolation-tests.sh` runs the same kind of verification automatically - two societies, every role, checked against a completely fresh, throwaway database, not the real project.

```bash
cd supabase/tests
./run-isolation-tests.sh
```

Needs a local Postgres reachable as the `postgres` superuser (the same one everything else in this file already assumes). Creates a temporary database, applies the real schema to it, runs about 20 checks, and drops the database again - nothing here ever touches the real Supabase project.

What it actually checks: cross-tenant isolation across flats, complaints, and expenses; that a personal complaint stays private to its own flat while a community one is visible society-wide; all four document permission tiers individually, not just "some are hidden"; that poll results aggregate correctly without ever exposing whose vote is whose; that an auditor can read but genuinely cannot write (blocked by RLS itself, not just missing from the UI); that the owner sees every society at once; and that only actual management can approve a pending membership, not the resident it belongs to.

Run this after any schema change, not just once. A regression genuinely gets caught, not just a hypothetical one - confirmed directly by deliberately weakening a real policy (removing a flat's own-flat-only restriction) and watching the suite fail with an exact, specific message pointing at what broke, then restoring it and confirming a clean pass again.
