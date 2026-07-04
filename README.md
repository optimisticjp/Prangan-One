# Prangan One

*The Society OS. One platform for every society workflow. Built for committees. Simple for residents.*

A Gujarati-first, multi-tenant society management platform. Rajhans Tower in Surat is the first society on it, created from the owner console like any other, not hardcoded as the only one.

## 1. What this is

Most society management apps translate English screens into Gujarati as an afterthought and lead with gate security and visitor logs. This one starts from what a Surat society committee actually spends their time on: chasing maintenance dues, tracking complaints, keeping the hisab (accounts) visible to everyone, and getting notices out without a WhatsApp group turning into chaos. The language is spoken Surat Gujarati, not the formal, bureaucratic kind. There's no visitor/gate module, on purpose; that's a different problem with different solutions per society, and bolting on a half-built version felt worse than leaving it out.

The core stance behind every screen: the committee is the customer and the hero, residents are upside. A society has to get full value from the committee side alone, with zero residents ever logging in, resident self-service is a second wave, never something the society depends on to run. Every society gets its own branding (a curated color theme plus optional logo), its own setup (maintenance amount, due date, receipt numbering), and its own choice of which feature areas it actually wants turned on. None of that is a free-for-all though: product structure, page layout, and the core Gujarati copy stay fixed platform-wide on purpose, so this stays one product configured per society, not a different app rebuilt for each one.

Right now this is a working demo: every screen is real and functional, including the multi-society configuration layer, but the data lives in your browser, not a server yet. It's built to be shown to an actual committee for feedback, and to get the whole platform right, before the cloud backend goes live.

## 2. Features

**Resident**: home dashboard, bill and payment history, receipts (printable, WhatsApp-shareable), complaints with photo attachment and status timeline, notices, documents (permission-filtered), emergency and service contacts, polls, events with contribution tracking and volunteer sign-up, parking, profile.

**Committee (admin)**: everything residents see, plus member/flat management, bill generation, payment recording with instant receipts, expense tracking, vendor and AMC management with renewal warnings, complaint assignment and resolution workflow, notice publishing, document upload (metadata), poll creation, event and contribution management, parking oversight with duplicate-slot detection, financial reports, and settings.

**Accountant**: a narrower lens on the same data: income/expense dashboard, audit-ready CSV exports, and manual adjustments (round-offs, corrections).

**Prangan One owner console** (Essancia's own tool, not committee-facing): create a new society through a 5-step onboarding wizard, edit any society's branding/setup/modules afterward, log in as any society's committee for support, and a live case study built from Rajhans Tower's actual demo numbers.

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

The login screen leads with a real email input (it ends at a "check your email" state for now, since there's no live backend to send from yet). A clearly-labeled demo shortcut sits underneath, still no password:

- **હું રહેવાસી છું** (I'm a resident): pick a flat, see that flat's bill, complaints, and history.
- **હું કમિટી મેમ્બર છું** (I'm a committee member): the full admin panel.
- **હું એકાઉન્ટન્ટ છું** (I'm an accountant): the accounts-focused panel.
- **Prangan One ઓનર કન્સોલ**: the real owner console. Try **+ નવી સોસાયટી** to walk through creating a second society with its own theme and modules.

See `QUICK_START.md` for a specific guided path through the app if you want a tour rather than clicking around.

## 5. Data persistence

Everything lives in the browser's `localStorage`, seeded from the JSON files in `sample-data/` the first time the app loads. That means:

- Refreshing the page keeps your changes (record a payment, it's still there after reload).
- Clearing your browser's site data, or opening the app in a different browser or incognito window, resets you back to the original sample data.
- **સેટિંગ્સ → ડેમો ડેટા રીસેટ** in the committee panel does this on purpose, wiping everything back to a clean starting point for a fresh demo.
- Nothing is sent to any server. This is entirely client-side.

This is the right amount of persistence for a demo and the wrong amount for a real society; see the Limitations section below.

## 6. Supabase hookup and going live

The data layer is one file, `src/lib/store.tsx`, exposing one hook, `useData()`, that every page calls, including the SaaS owner actions (`addSociety`, `updateSocietyById`). That's deliberate: swapping localStorage for a real backend should mean changing that one file's internals, not rewriting every page.

`supabase/schema.sql` has the complete target schema already written: every table, indexes, and Row Level Security policies, including the multi-tenant fields (theme, modules, receipt prefix) and the email-based membership model, ready to run in a Supabase project's SQL editor. `supabase/README.md` covers project setup, environment variables, storage buckets, the Supabase free tier's 7-day inactivity pause (and the free fix for it), and deploying to Cloudflare Pages, chosen specifically because its free tier allows commercial use, unlike Vercel's. `CLAUDE_CODE_NEXT_STEPS.md` has the specific migration plan, table by table, plus ready-to-paste prompts for continuing this build in Claude Code.

Nothing here is connected yet. This is the "here's exactly how to do it next" documentation, not a partially-wired integration.

## 7. Limitations

Worth knowing before showing this to anyone as more than a prototype:

- **No real login yet.** The email step ends at a "check your email" screen; nothing is actually sent. The demo role/flat picker underneath has no password and no verification, anyone with the URL can open the admin panel.
- **No real access control.** `src/lib/permissions.ts` and `ModuleGate` shape what the UI shows and which routes render, but nothing stops a browser console from reading data outside that scope. Real enforcement needs the Supabase RLS policies in `supabase/schema.sql`, not yet connected.
- **File uploads are metadata-only**, and logos are a data-URL living in localStorage, not a real file. Adding a document or a complaint photo saves the filename and size, not the actual file, and an uploaded logo won't survive the eventual move to a real backend as-is.
- **WhatsApp buttons open a share picker**, they don't send automatically. That needs the WhatsApp Cloud API.
- **The payment button on the resident bill screen is a placeholder.** No real transaction happens; recording a payment is something the committee/accountant does manually today.
- **All data is invented.** Names, phone numbers (using the clearly-fake `90000 000XX` pattern), and amounts in `sample-data/` are for demonstration only.

Full detail on all of this, the free-tool cost research behind the hosting and auth choices, plus a DPDP-context privacy checklist for when real resident data does get involved: `docs/SECURITY_PRIVACY.md`.

## 8. Next steps

Roughly in order: connect Supabase for real (auth, database, RLS, the membership-claim flow), deploy to Cloudflare Pages, wire the email magic-link login for real, migrate uploaded logos to Supabase Storage, then Razorpay for actual UPI payment collection and the WhatsApp Cloud API once there's real usage to justify them, neither is a launch blocker since manual payment recording and WhatsApp share links already work today.

The detailed plan, including the reasoning behind decisions already made and exact prompts for continuing this in Claude Code, lives in `CLAUDE_CODE_NEXT_STEPS.md`. The testing plan for the flows that matter most (payments, complaints, voting, exports) is in `docs/TESTING_PLAN.md`.

---

**Project structure**, briefly:

```
src/lib/          data layer, formatting, copy, permissions, WhatsApp templates
src/lib/theme/     per-society color theme presets + runtime CSS-variable application
src/components/   shared UI kit, ModuleGate, SocietyLogo (branding/logo display)
src/layouts/      resident bottom-nav shell, admin/accountant sidebar shell
src/pages/        resident/, admin/, accountant/, saas/ (preview, onboarding wizard, society detail), plus Login.tsx
sample-data/      the demo data, JSON, editable directly
supabase/         target schema + setup guide, including the Cloudflare Pages deploy steps
docs/             security/privacy notes, testing plan, design system reference
scripts/          the script that generated sample-data/ (deterministic, re-runnable)
```

Built by Essancia (Infinite Weblinks) for Rajhans Tower, Surat.
