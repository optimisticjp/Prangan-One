> **Archived, historical document, not current.** This describes a pre-Supabase, local-only version of this app, from before the real backend existed. It's kept here for history, not as a reference for anything about the app as it actually works today. For the current, accurate state of production security, privacy, and operations, see `PRODUCTION-RUNBOOK.md` at the repository root.

# Security and privacy notes

This document is honest about what this demo does and does not protect. Read it before showing the app to a real society or putting any real resident data into it.

## The most important line in this whole file

**Nothing in this demo is real security.** Login has no password. Roles are picked from a menu. Anyone with the URL can open the admin panel by clicking "હું કમિટી મેમ્બર છું". This is fine for a demo running on your own laptop or in a private Codespace. It is not fine for anything with real names, real phone numbers, or real money.

## What's simulated vs what's real

| Area | In this demo | In production |
|---|---|---|
| Login | Email input, ends at a "check your email" screen; a demo role-picker still sits underneath | Real email magic link via Supabase Auth |
| Data storage | Browser localStorage | Supabase Postgres |
| Access control | UI hides buttons and routes (`src/lib/permissions.ts`, `ModuleGate`) | Postgres Row Level Security |
| Payments | Manual entry by admin/accountant | Razorpay, UPI intent, webhook-verified |
| File uploads / logos | Filename + size only, or a data-URL for logos, no real file storage | Supabase Storage, real files |
| WhatsApp | Opens `wa.me` share link | WhatsApp Cloud API, sent from the society's number |

## Cloud infrastructure: what's actually free, and where the real costs are

Checked this directly rather than assumed, since "free tools" only holds up if the terms actually allow real commercial use, not just personal projects.

**Hosting: Cloudflare Pages, not Vercel.** Vercel's free Hobby plan is restricted by its own terms to non-commercial, personal use, and the moment this is set up for a paying client like Rajhans Tower, it's commercial. Cloudflare Pages' free tier explicitly allows commercial use, with unlimited bandwidth and no credit card required. Same git-connected deploy workflow either way, so there's no real tradeoff, just a better fit for this specific use.

**Backend: Supabase's free tier is genuinely usable for a real launch**, with one operational catch. It explicitly permits commercial use with no credit card required, and covers a 500MB database, 1GB of file storage, and up to 50,000 monthly active users, which is far more than one society (or several) will need for a long time. The catch: a project with no traffic for seven straight days gets automatically paused until someone manually resumes it from the dashboard. For a real committee's app, that's not acceptable as-is, a quiet week over a holiday and the app would just look broken. Fix: a free scheduled ping (a GitHub Actions cron job or an UptimeRobot check hitting the project every few days) keeps it awake. This needs to be set up before go-live, not treated as optional, see `supabase/README.md` for the exact setup.

**Login: email magic link, not phone OTP, and this was a real cost decision, not just a preference.** Real SMS OTP in India requires registering as a DLT sender with a telecom operator, which runs about ₹5,900 plus GST as a one-time fee and takes three to seven working days to clear, on top of a per-message cost of roughly ₹0.10 to ₹0.45 depending on the provider. None of that is free by any reasonable reading. Supabase's built-in email magic link needs no separate SMS provider and costs nothing on the free tier. The real tradeoff, and it's a genuine one: not every resident has or checks an email regularly, especially older members. The Members page now collects an optional email per flat for this reason, and the committee retains full access to act on any resident's behalf (recording a payment, filing a complaint) if that resident never gets a working login of their own.

## Data currently in the app

All names, phone numbers, flat numbers, and amounts are invented for demo purposes (see `scripts/gen-data.mjs`). Phone numbers follow the fake pattern `90000 000XX`, which is not a real Indian mobile prefix, on purpose, so nobody dials a stranger by accident.

If you plan to load a real society's member list in for a pilot: don't do it in this localStorage version. Wait for the Supabase hookup (see `CLAUDE_CODE_NEXT_STEPS.md`) so the data has real access control and a real backup story, not a browser tab that can be cleared by accident.

## DPDP Act, in plain terms

India's Digital Personal Data Protection Act (DPDP) applies once you're handling real residents' personal data (name, phone, flat, payment history). A few things that matter for a society app specifically:

- **Consent and purpose**: residents should know their data (phone, payment history, vehicle numbers) is stored in this system and roughly why (billing, complaints, notices).
- **Data minimisation**: don't collect more than the society actually needs. This schema doesn't ask for Aadhaar, PAN, or ID proof anywhere, and it shouldn't.
- **Access control**: only the roles that need to see something should see it (this is what `permissions.ts` models in the UI, and what RLS will enforce for real once Supabase is connected).
- **Grievance/correction**: residents should have a way to ask for a correction if their name, flat details, or payment record is wrong. In practice this means "the committee can edit it," which every admin page here already supports.
- **Data retention**: decide how long old bills, complaints, and documents stay before archiving. Nothing in this demo enforces a retention policy; that's a real-society decision, not a code decision.

This is not legal advice. Talk to someone who actually knows DPDP compliance before onboarding a real society, especially around consent language and any data-sharing with vendors (like a payment gateway).

## Row Level Security plan (for the Supabase phase)

Every table in `supabase/schema.sql` carries a `society_id` column from day one, specifically so RLS can scope every query to "rows belonging to societies I'm a member of." The rough shape, once Supabase auth is wired up:

- A `memberships` table maps `auth.uid()` → `society_id` + `role` (resident/accountant/admin).
- Every table's SELECT policy checks `society_id IN (SELECT society_id FROM memberships WHERE user_id = auth.uid())`.
- Residents can INSERT into `complaints` and `poll_votes` for their own `flat_id` only, never anyone else's.
- Only `admin` role can INSERT into `notices`, `bills`, or change `documents.permission`.
- Only `admin` and `accountant` can INSERT into `payments` and `expenses`.
- `documents` additionally filters by the `permission` column (public/committee/accountant/admin) inside the policy, not just by society.

Example policies are sketched in `supabase/schema.sql` as comments next to each table, ready to uncomment and adapt once auth is in place.

## Practical checklist before a real pilot

- [ ] Supabase connected, RLS policies written and tested (not just "enabled")
- [ ] Real email magic-link login in place, demo role-picker removed or hidden behind a dev flag
- [ ] A plan for residents without a working email (committee can act on their behalf; consider collecting a family member's email as a fallback for older residents)
- [ ] File uploads (documents, complaint photos, logos) go to Supabase Storage with permission-scoped buckets, not just filename metadata or a data-URL
- [ ] A privacy note shown to residents at first login (what's collected, why, who sees it)
- [ ] A designated person (usually the secretary or treasurer) who can act on data-correction requests
- [ ] Backups tested: not just "Supabase backs up automatically," but someone has actually restored a backup once
- [ ] A free keep-alive ping set up (GitHub Actions cron or UptimeRobot) so the Supabase free tier's 7-day inactivity pause never takes the live app offline
- [ ] Hosting confirmed as Cloudflare Pages (or another plan explicitly allowing commercial use), not a free tier whose terms restrict it to personal projects
