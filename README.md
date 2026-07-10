# Prangan One

*The Society OS. One platform for every society workflow. Built for committees. Simple for residents.*

A Gujarati-first, multi-tenant society management platform. Rajhans Tower in Surat is the first society on it, created from the owner console like any other, not hardcoded as the only one.

## 1. What this is

Most society management apps translate English screens into Gujarati as an afterthought and lead with gate security and visitor logs. This one starts from what a Surat society committee actually spends their time on: chasing maintenance dues, tracking complaints, keeping the hisab (accounts) visible to everyone, and getting notices out without a WhatsApp group turning into chaos. The language is spoken Surat Gujarati, not the formal, bureaucratic kind. There's no visitor/gate module, on purpose; that's a different problem with different solutions per society, and bolting on a half-built version felt worse than leaving it out.

The core stance behind every screen: the committee is the customer and the hero, residents are upside. A society has to get full value from the committee side alone, with zero residents ever logging in, resident self-service is a second wave, never something the society depends on to run. Every society gets its own branding (a curated color theme plus optional logo), its own setup (maintenance amount, due date, receipt numbering), and its own choice of which feature areas it actually wants turned on. None of that is a free-for-all though: product structure, page layout, and the core Gujarati copy stay fixed platform-wide on purpose, so this stays one product configured per society, not a different app rebuilt for each one.

This runs on a real backend now, not a browser-only demo: real Supabase authentication (email magic link, Google, or a password once someone sets one), real Postgres with Row Level Security enforcing every tenant boundary at the database itself, real file storage for photos and documents, and every core module - flats, bills, payments, complaints, notices, documents, memberships, vendors, vehicles, polls, events, expenses, adjustments - reading and writing for real. A separate, clearly-marked local demo mode still exists at `/demo` for exploring the UI without connecting anything, seeded from sample data in the browser only, but it's no longer the primary way this app runs. See section 5 for exactly what's real versus local, and `supabase/README.md` for the actual setup.

## 2. Features

**Resident**: home dashboard, bill and payment history, receipts (printable, WhatsApp-shareable), complaints with photo attachment and status timeline, notices, documents (permission-filtered), emergency and service contacts, polls, events with contribution tracking and volunteer sign-up, parking, profile.

**Committee (admin)**: everything residents see, plus member/flat management, bill generation, payment recording with instant receipts, expense tracking, vendor and AMC management with renewal warnings, complaint assignment and resolution workflow, notice publishing, document upload (metadata), poll creation, event and contribution management, parking oversight with duplicate-slot detection, financial reports, and settings.

**Accountant**: a narrower lens on the same data: income/expense dashboard, audit-ready CSV exports, and manual adjustments (round-offs, corrections).

**Prangan One owner console** (the platform owner's own tool, not committee-facing): create a new society through a 5-step onboarding wizard, edit any society's branding/setup/modules afterward, log in as any society's committee for support, and a live case study built from Rajhans Tower's actual demo numbers.

**Per-society configuration**: 6 curated color themes (not a raw color picker, each one pre-checked for contrast), optional logo upload with a generated-initials fallback, and 9 toggleable feature areas (billing, complaints, notices, documents, vendors, polls, events, parking, reports), enforced at the router level so a disabled module redirects away even on direct URL access, not just hidden from the menu.

Every currency figure formats as Indian Rupees with lakh/crore grouping, every date shows in Gujarati month names, and every list that matters exports to CSV with a UTF-8 byte-order mark so Gujarati text opens correctly in Excel instead of turning into garbled symbols.

## 3. Running in Codespaces (or locally)

```bash
npm install
npm run dev
```

Then open the forwarded port (Codespaces will prompt you) or `http://localhost:5173` if running locally. No environment variables, no database setup, no signup screen. It just runs.

To build for production: `npm run build` (runs the TypeScript checker, then bundles). To preview that production build locally: `npm run preview`.

## 4. Preview / demo walkthrough

`/` is the public marketing homepage now. Login lives at `/login`, real email only, no demo shortcuts there at all. Demo shortcuts live on their own page, `/demo`, gated the same way (on by default in local dev, off in a real production build unless `VITE_DEMO_MODE=true` is set explicitly):

- **હું રહેવાસી છું** (I'm a resident): pick a flat, see that flat's bill, complaints, and history.
- **હું કમિટી મેમ્બર છું** (I'm a committee member): the full admin panel.
- **હું એકાઉન્ટન્ટ છું** (I'm an accountant): the accounts-focused panel.
- **Prangan One ઓનર કન્સોલ**: the real owner console. Try **+ નવી સોસાયટી** to walk through creating a second society with its own theme and modules.

Every society also has a shareable link, `pranganone.com/s/{slug}` (Rajhans Tower's is `/s/rajhans-tower`), that shows that society's own branding before handing off to login.

Real login (see `supabase/README.md` for setup, `CLAUDE_CODE_NEXT_STEPS.md` for the current build history): `/login` sends a real magic link, offers Google, or a password for anyone who's set one from their own profile; `/auth/callback` resolves who you are and lands you in the right dashboard; `/join` lets a resident self-enroll with their society's join code (shown in the owner console's society page) plus their flat number; and `/no-access` is what a verified-but-unmatched email sees instead of a dead end.

See `QUICK_START.md` for a specific guided path through the app if you want a tour rather than clicking around.

## 5. Data persistence

**Real sessions** (anyone who actually logs in via magic link, Google, or a password) read and write for real: Supabase Postgres, enforced by Row Level Security so a resident's own queries can only ever return their own society's data regardless of what the client-side code does, not just because the UI happens to hide the rest. File uploads (complaint photos, payment proof screenshots, society logos, documents) go to real, private Supabase Storage buckets with signed URLs, not just a filename saved to a database row. Logging out clears everything a real session touched from this browser, not just some of it - see `CLAUDE_CODE_NEXT_STEPS.md`'s first build entry for the specific gap that used to exist here and how it was closed.

**The local demo mode** (`/demo`, gated behind `VITE_DEMO_MODE`, on by default in local dev and off in a real production build unless explicitly enabled) is a separate, deliberate thing: no login, no backend, everything in the browser's own `localStorage`, seeded from the JSON files in `sample-data/`. Useful for exploring the UI, showing someone the product without setting anything up, or local development without a Supabase project connected. Refreshing keeps demo changes, clearing site data or opening a different browser resets to the sample data, and **સેટિંગ્સ → ડેમો ડેટા રીસેટ** does this on purpose from inside the committee panel. Nothing in demo mode is ever sent anywhere, and nothing from a demo session can end up in a real one or vice versa - they're entirely separate data layers, not one falling back to the other.

## 6. Supabase, and what's actually connected

The data layer is one file, `src/lib/store.tsx`, exposing one hook, `useData()`, that every page calls, including the SaaS owner actions (`addSociety`, `updateSocietyById`). That's what made connecting a real backend a matter of changing that one file's internals rather than rewriting every page, and it's why the same hook still works identically for both the real backend and the local demo mode - the pages calling it never need to know which one they're getting.

`supabase/schema.sql` is the real, currently-applied schema: every table, indexes, Row Level Security policies covering every real tenant boundary this app actually needs, storage bucket policies, and the database functions RLS depends on - not a target written in advance, the schema that's actually live. `supabase/README.md` covers project setup, environment variables, the free tier's inactivity pause and the fix for it, and deploying to Cloudflare Pages. `supabase/tests/run-isolation-tests.sh` is a repeatable, automated check of the actual tenant isolation this schema provides - two societies, every role, run against a fresh throwaway database - not something that has to be re-verified by hand after every change.

`CLAUDE_CODE_NEXT_STEPS.md` has the full build history and the current, active remediation plan responding to an external production-readiness audit - what's been fixed, what's still open, and why each decision was made.

## 7. Limitations

Worth knowing, genuinely current as of this writing, not carried over from an earlier stage of the build:

- **A real support-session gap, not a data-layer one.** When the platform owner logs into a society to help its committee, that action itself is now genuinely logged for real (who, when, why), but the society's data during that session still comes from the local layer rather than the real one. Narrower than it sounds, and on the list to close, but real and worth knowing.
- **Contacts (emergency and service numbers) are read-only from the real backend for now** - no add or edit UI exists yet for a committee to manage them for real, even though the underlying table and access rules already do.
- **WhatsApp buttons open a share picker**, they don't send automatically. That needs the WhatsApp Cloud API, deferred, see below.
- **Resident payment is fully manual, by design, not a placeholder waiting to be finished.** A resident sees UPI/bank instructions, can mark "I have paid" (which creates a pending record, not an official payment), and the committee verifies and records it before a receipt is generated. That's the real, intended flow for this build, not a stand-in for something automated.
- **The local demo mode specifically** (not real sessions) still saves file uploads as metadata only - a complaint photo or an uploaded logo in `/demo` saves a filename, not the actual bytes. Real sessions upload real files to real storage; this limitation is scoped to the demo layer only.
- **All data in the local demo is invented.** Names, phone numbers (using the clearly-fake `90000 000XX` pattern), and amounts in `sample-data/` are for demonstration only, and never appear in a real session.

Full detail on all of this, the free-tool cost research behind the hosting and auth choices, plus the current backup/restore and operations checklist: `PRODUCTION-RUNBOOK.md`.

## 8. Next steps

**Active, in order:** responding to a production-readiness audit, tracked build by build in `CLAUDE_CODE_NEXT_STEPS.md` - real writes now surface a genuine failure and retry instead of failing silently, every core module reads and writes for real, tenant isolation has a repeatable automated check instead of only ever being verified by hand, and the remaining owner support-session gap noted above is next.

**Deferred, not part of the active build:** an online payment gateway (Razorpay or similar) and the WhatsApp Cloud API for automated messages. Neither is a launch blocker, manual payment recording and `wa.me` share links already cover the real workflow today. Native app and AI features are deferred too, further out.

The detailed history, including the reasoning behind decisions already made and what's still genuinely open, lives in `CLAUDE_CODE_NEXT_STEPS.md`. The testing plan for the flows that matter most (payments, complaints, voting, exports) is in `docs/TESTING_PLAN.md`.

---

**Project structure**, briefly:

```
src/lib/          data layer, formatting, copy, permissions, WhatsApp templates
src/lib/theme/     per-society color theme presets + runtime CSS-variable application
src/components/   shared UI kit, ModuleGate, SocietyLogo (branding/logo display)
src/layouts/      resident bottom-nav shell, admin/accountant sidebar shell
src/pages/        resident/, admin/, accountant/, owner/ (dashboard, onboarding wizard, society detail, billing, leads, activity), public/ (marketing site), plus Login.tsx and Demo.tsx
sample-data/      the demo data, JSON, editable directly
supabase/         target schema + setup guide, including the Cloudflare Pages deploy steps
docs/             security/privacy notes, testing plan, design system reference
scripts/          the script that generated sample-data/ (deterministic, re-runnable)
```

## Official links

- Website: [pranganone.com](https://pranganone.com)
- Support: [care@pranganone.com](mailto:care@pranganone.com)
- Facebook: [facebook.com/pranganone](https://www.facebook.com/pranganone/)
- Instagram: [instagram.com/pranganone](https://www.instagram.com/pranganone/)
- YouTube: [youtube.com/@PranganOne](https://www.youtube.com/@PranganOne)
