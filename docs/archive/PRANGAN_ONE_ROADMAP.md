> **Archived, historical document, not current.** This was the planning document for converting an earlier, local-only demo into the real production product - that conversion has long since happened. Kept here for history, not as a current reference. For the current, accurate state of the product, see `PRODUCTION-RUNBOOK.md` at the repository root and `CLAUDE_CODE_NEXT_STEPS.md` for the detailed build history.

# Prangan One — Build-Ready Roadmap and Locked Spec

*The Society OS. One platform for every society workflow. Built for committees. Simple for residents.*

This is the authoritative plan for converting the current Rajhans Tower demo into the complete Prangan One production product. It merges the three code reviews, the strategic decisions already made, and the three final decisions locked on this call. It is written to be handed, section by section, to a build session. No online payment gateway, no WhatsApp Business API, no native app, and no AI in this build.

---

## 1. What Prangan One is

A Gujarati-first, multi-tenant, cloud society management platform. You (the platform owner) create each society from an owner backend, enable the modules they want, and control their subscription status manually. Each society gets its own working app: a committee/admin backend, an accountant panel, and a resident app, all scoped to that society. Rajhans Tower is the first society, created from the owner backend like any other, with all modules available.

The core stance that should shape every screen: **the committee is the customer and the hero, and residents are upside.** A society must get full value from the committee side alone, with zero residents logged in. Resident self-service is a second adoption wave, never a dependency for the society to run.

---

## 2. Locked decisions

| Area | Decision |
|---|---|
| Product name | Prangan One |
| Category line | The Society OS |
| Tagline | One platform for every society workflow. Built for committees. Simple for residents. |
| Domain / support | pranganone.com / care@pranganone.com |
| Login | Email magic link (Supabase Auth) |
| Identity | Phone and WhatsApp number collected on every membership so committees can tell who each email belongs to |
| Tenants | Can log in; access governed by a per-society tenant-access setting (disabled / limited / full) |
| Payments (society to resident) | Manual only. UPI/bank/cash/cheque recorded by committee. No gateway. |
| Payments (society to platform) | Manual, tracked in the owner backend. No gateway. |
| Modules | All modules available to every society, toggleable by owner and (where sensible) by admin |
| Society creation | Owner-created only. No public self-signup. |
| Hosting | Cloudflare Pages (frontend) + Supabase (DB, auth, RLS, storage) |
| **Public website language** | **Bilingual (English + Gujarati), toggle in public layout, English default. App stays fully Gujarati.** |
| **Pricing** | **Flat ₹10 per flat per month. Owner billing tracker records expected = flats × 10, amount field editable per society.** |
| **Subscription wind-down** | **Two-stage: admin-only `grace` (writes still work), then resident-visible `paused` (read-only).** |

Deferred, by agreement: online payment gateway (Razorpay), WhatsApp Business API automation, native app, AI features, complex accounting automation beyond practical reports and exports.

---

## 3. The strategic spine (what actually sells and retains)

Build the whole product around four things, because these are what make a Gujarati committee say yes and keep paying.

- **The monthly collection cockpit.** The admin home is not a generic dashboard of equal cards. It is: this month, who paid, who hasn't, one tap to remind defaulters, one tap to generate bills, one tap to record a payment. The treasurer lives here.
- **Receipts as the trust anchor.** The pakki-raseed-style receipt, WhatsApp-shareable, with a clean running number, is the single feature that closes committees. Keep it central. Receipt numbers are generated in the database atomically, never on the client.
- **Radical transparency (the wedge).** The reason committees adopt is to end the "paisa kya gaya" WhatsApp fights. Every resident sees total collected, total spent, category-wise, anytime, including festival collections. This is the differentiator against both Excel and gate-security apps that hide hisab behind admin-only reports.
- **The handover story.** Committees change every year or two, and the new lot's first fear is losing everything. "Transfer admin in one click, export everything anytime, nothing lost across committee changes" must be an explicit, headlined capability.

Depth guidance: 80% of daily use is billing, payments, receipts, complaints, and notices. Build those five to real production polish. Build polls, events, vendors, parking, and expenses to "clean and correct," not gold-plated. Festival funds (Navratri, Ganesh, Diwali milan, Uttarayan) run through events + contributions + a per-event expense ledger, and that ledger must be as transparent as maintenance, because festival money is where trust disputes happen.

---

## 4. Roles and access model

Roles: `owner`, `society_admin`, `committee_member`, `accountant`, `resident_owner`, `resident_tenant`, and optionally `viewer` (read-only).

- `owner`: full access to all societies and the platform backend. Every impersonation/"view as" session is logged; read-only by default with an explicit "act as admin" toggle that is also logged.
- `society_admin`: full control of their own society only.
- `committee_member`: manages enabled modules, not billing unless allowed.
- `accountant`: finance and reports only (bills, payments, receipts, expenses, adjustments, exports). No complaints/events noise unless the society enables it.
- `resident_owner` / `resident_tenant`: their own society and flat only. Tenant scope governed by the society's tenant-access setting.

All authorization is enforced by Supabase RLS. `RoleGate` and `ModuleGate` in the frontend are UX only and provide zero security.

---

## 5. Subscription lifecycle and the two-stage pause

States: `trial`, `active`, `grace`, `paused`, `archived`.

The write-guard rule that makes this cheap to build: **`trial`, `active`, and `grace` allow writes. `paused` and `archived` block writes.** Grace differs from active only in the banner it shows.

| State | Writes | Banner |
|---|---|---|
| `trial` | Allowed | Optional small trial note (admin only) |
| `active` | Allowed | None |
| `grace` | Allowed | Admin-only: "Subscription due. Contact Prangan One at care@pranganone.com to avoid interruption." Residents see nothing. |
| `paused` | Blocked | Resident-visible sticky banner across the app: "Service is paused. Please contact Prangan One to resume editing and new activity." Face-saving copy. All history stays viewable and exportable. |
| `archived` | Blocked | Read-only historical, hidden from active lists. |

Paused means read-only for non-owner users: no new bills, payments, complaints, notices, documents, polls/votes, events/RSVPs, or parking changes. Reports and exports still work. Owner can resume instantly from the backend. The banner should be prominent for admins and softer for residents so a pause never embarrasses the committee in front of the people who elected them.

---

## 6. Module system

Two layers of control.

- **Owner layer:** which modules a society has, set by you. This is what they've paid for or asked for.
- **Admin layer:** within what you enabled, the committee can show/hide resident-facing modules (some committees want to start with billing and complaints only).

Modules: Dashboard, Members, Billing, Payments, Receipts, Complaints, Notices, Documents, Contacts, Parking, Polls, Events, Vendors, Expenses, Reports, Adjustments, Settings.

Each module needs: an owner enabled/disabled setting, navigation visibility, direct-route protection (disabled route shows a clear "this feature is not active for your society" message, never a broken screen), backend/RLS protection, and paused-mode read-only behavior.

For Rajhans Tower: full society, all modules available, created by you from the owner backend.

---

## 7. Public website

Bilingual (English + Gujarati) with a toggle in the public layout, English default on first load, copy in a per-language content object. The app itself gets no toggle and stays Gujarati.

Routes: `/`, `/features`, `/pricing`, `/faq`, `/contact`, `/login`. App routes (`/app`, `/admin`, `/accounts`, `/owner`) live behind auth and are `noindex`. Public and app surfaces must not feel mixed.

Home hero: the tagline, a primary CTA "Request Society Setup," a secondary "See How It Works," product screenshots, committee benefits, resident benefits, a modules overview, the transparency and handover angles, pricing, FAQ, and a contact path. Give the CTA a WhatsApp/phone option alongside the form, because in this market committees convert through WhatsApp before email.

Lead form fields: name, phone, email, society name, city/locality, number of flats, role (chairman/secretary/treasurer/resident/other), main need (billing/complaints/notices/full app), message. It writes to a Supabase `public_leads` table, viewable in the owner backend. No fake forms. Add lightweight rate limiting if easy.

FAQ must answer the real objections: do residents need to be tech-savvy, can tenants use it, can we start without an online payment gateway, can we export reports, can we disable modules, who controls member access, what happens if we're late paying you, is our data private from other societies, can we use Gujarati, can older members use it, what happens when the committee changes.

SEO basics: per-route titles and descriptions in both languages, OpenGraph tags, FAQ content, `SoftwareApplication` schema. Treat SEO as a slow secondary channel; the site's main job is credibility for a committee member who arrives from a WhatsApp forward.

---

## 8. Pricing

Public pricing page: flat ₹10 per flat per month, framed as "less than one chai per flat, per month." Setup handled manually, no online gateway needed, custom onboarding per society.

Owner billing tracker (manual): per society, record expected amount (flats × 10 by default, editable), amount received, payment date, mode, internal note, and status (unpaid / partial / paid / waived). The editable amount field is what lets you offer a founding rate to Rajhans or a discount to anyone without any code change. You can layer a monthly floor or annual prepay option in later purely as page copy plus this number field.

---

## 9. The build order

One continuous build with a single hard checkpoint after the foundation. This is not slow phasing; it is dependency order, because each layer sits on the one under it.

**Foundation (must be first, verified before anything leans on it)**
1. Rebrand to Prangan One. Strip demo, Essancia, and hardcoded-Rajhans wording from reusable logic. Keep seed data behind a dev-only environment flag. Add "Powered by Prangan One" to app footer/receipts, "© Prangan One. The Society OS." to the public footer, and "Welcome to [Society Name] on Prangan One" on login.
2. Supabase client and env. Apply `supabase/schema.sql` and extend it: subscription status, per-society module settings, tenant-access setting, `audit_logs`, `public_leads`, owner-impersonation logs. Move `email` onto the membership, not the flat.
3. Email magic-link auth, the membership claim/link-by-email step, and multi-membership selection after login. If an email matches no membership, show "Your email is not linked to any society. Please contact your committee."
4. Replace the localStorage store internals with the Supabase data layer behind the same `useData()` seam, scoped by society.
5. Enable RLS and write every policy.
6. **Checkpoint:** create a real second test society and try to break isolation. Confirm cross-tenant read and write are blocked, tenant access is blocked, and a paused society is truly read-only. Pass this before building anything on top.

**Continuous (no artificial pauses after the checkpoint)**
7. Owner backend: create/edit society, logo and theme, CSV member import with row-level preview and error correction, invite users, module toggles, subscription status controls, pause/resume, archive, view-as with audit logging, leads inbox, and the manual subscription payment tracker. Owner dashboard: totals for societies (active/trial/paused/archived), flats, residents, expected monthly revenue, pending platform payments, recent activity, quick create.
8. Society admin backend, spine first (collection-cockpit dashboard, members, billing, payments, receipts), then complaints, notices, documents, polls, events, parking, vendors, expenses, reports, settings.
9. Resident app with tenant support: simple home (pending amount, due date, payment instructions, last receipt, latest notice, complaint status, quick actions), bottom nav (Home, Bill, Complaints, Notices, More), and the rest under More. Manual payment flow: show amount, UPI ID, QR, and a deep link; an optional soft "mark as paid, pending committee confirmation" that never looks like an official payment; receipt appears after the committee records it. Honest wording throughout ("Payment will be confirmed by committee"), never "online payment successful."
10. Accountant panel: finance, reports, exports only.
11. File storage (Supabase Storage) for logos, documents, complaint photos, and payment screenshots, with permission-scoped buckets.
12. Global paused read-only enforcement, plus loading, empty, and error states, an error boundary, and real 404 and 403 pages.
13. Accessibility fixes to the shared UI: modal focus trap, escape to close, focus restore, proper labels, inline validation, contrast on secondary text, `aria-live` for important errors. Keep the existing reduced-motion support.
14. Route-based code splitting so residents never download admin/accountant/owner code, and self-hosted fonts (subset Noto Sans Gujarati plus Inter, preload, `font-display: swap`).
15. Public website: the six routes, bilingual with the toggle, real Supabase-backed lead form, per-route meta and OG, `noindex` on app routes.
16. Tests: cross-tenant isolation, tenant access, paused read-only, module gating, bill dedupe, payment-to-receipt, safe receipt numbers, and lead capture.
17. Cloudflare Pages deployment readiness plus a Supabase keep-alive ping (GitHub Actions cron or UptimeRobot) so the free tier's 7-day pause never takes a live society offline.

**Deferred:** Razorpay, WhatsApp Business API automation, native app, AI, complex accounting automation. Manual UPI plus wa.me share links carry the launch.

---

## 10. Non-negotiables

- **Security is the whole game.** Every society-owned table carries `society_id`, every policy is written, and cross-tenant isolation is tested with a real second society before go-live. RLS is the only real security; frontend gates are UX. A silent RLS bug leaks one society's financials to another.
- **No client-side receipt numbers.** Generate them in the database atomically, inside the same transaction as the payment insert, scoped per society.
- **No silent financial deletes.** Corrections require a reason and leave an audit trail. Receipts are cancelled with a reason, never deleted.
- **Self-host fonts.** Remove the Google Fonts CDN link from `index.html`; it leaks resident IPs to Google and contradicts the "data in India" positioning.
- **Kill the multi-tenant leaks.** The hardcoded "Rajhans Tower" in `src/lib/whatsapp.ts` and the resident Profile must use `society.name`. Nothing Rajhans-specific stays in reusable logic.
- **No demo login in production.** Remove the public role picker and fake magic-link behavior; keep seed/demo behind a dev-only flag.
- **No public promise that isn't technically true.** Don't claim "data in India" until the Supabase region is set to Mumbai.

---

## 11. Before the build can start

Two things must exist first, because they can't be created from a chat session:
1. A Supabase project (free tier is fine to start), with its URL and anon key ready for `.env`, and the region set to Mumbai.
2. The pranganone.com domain and a Cloudflare Pages project, with env vars set there (not committed).

The codebase is unusually well prepared for this: the data layer is already one clean seam (`useData()`), so the Supabase swap changes that file's internals rather than every page. That is why the reviews rate the foundation highly. The build is large but the hardest architectural decision is already made correctly.

---

## 12. What "done" looks like

The product is complete when you can:
1. Deploy Prangan One and open pranganone.com.
2. Receive real lead submissions in the owner backend.
3. Log in as platform owner.
4. Create Rajhans Tower as a society, add flats, owners, tenants, phone numbers, and emails.
5. Enable all modules and set manual payment instructions.
6. Invite admins, accountant, residents, and tenants.
7. Have the committee generate bills, record manual payments, and issue receipts residents can see and share.
8. Have residents view dues and payment instructions, and see receipts after the committee records payment.
9. Manage complaints, notices, documents, parking, polls, events, vendors, expenses, and reports.
10. Have the accountant view and export finance reports.
11. Move Rajhans through `grace` (admin-only banner, writes still work) and `paused` (resident-visible read-only) and back to `active`, all from the owner backend.
12. Confirm, with a real second society, that no society can see another's data.
13. See "Powered by Prangan One" where appropriate, with no demo, fake, or Rajhans-hardcoded logic left in reusable code.
