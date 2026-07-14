# Prangan One — Gujarati Copy Upgrade Tracker

Tracks the multi-batch Gujarati copy upgrade against the master audit
(*Prangan One Complete Gujarati Copy Audit* — 13 product areas, 102 audited
source files, 1,470 unique strings). Purpose: prove no audited area is
forgotten as work is split across batches.

**Source priority:** (1) latest owner decisions → (2) verified app behaviour +
`docs/COPY_FACTS.md` → (3) master upgrade PDF → (4) inspiration PDF (ideas only)
→ (5) existing copy. The inspiration PDF's banned wording, unsupported claims
and OCR artefacts are **not** used.

**Key context:** the codebase already received a substantial Gujarati pass
(commit history "Gujarati copy upgrade", the `codex/*gujarati*` branches) *after*
the audit was captured. Most of the audit's 37 handoff replacements are therefore
**already in the code**. Each area below records what is already satisfied, what
Batch 1 changed, and what is deferred.

Legend: ✅ done · 🔷 already satisfied · ⏳ deferred · ❓ needs owner confirmation. Batch 1 = low-risk interface copy (merged, PR #10). Batch 2 = brand + de-technicalisation + public messaging (this PR).

---

## Path changes vs the audit index (audit path → current path)

| Audit path | Current path | Note |
|---|---|---|
| `src/components/Layouts.tsx` | `src/layouts/Layouts.tsx` | moved |
| `src/lib/store.ts` | `src/lib/store.tsx` | ext change |
| `src/lib/demo/demoSeed.ts` | `src/lib/demoSeed.ts` | `demo/` folder flattened |
| `src/lib/demo/demoGuide.ts` | `src/lib/demoGuide.ts` | flattened |
| `src/lib/demo/demoStore.ts` | `src/lib/demoStore.tsx` | flattened + ext |
| `src/data/*.json` (16) | `sample-data/*.json` | moved to repo root |

**New user-facing files since the audit** (folded into scope): `src/components/SubscriptionBanner.tsx`,
`scripts/public-seo.mjs` + `scripts/generate-seo-html.mjs` (static SEO shells for 7 routes),
`src/lib/csv.ts` (export/import validation), `src/pages/owner/LegacyRedirect.tsx` (route only),
`src/components/PranganBrand.tsx` / `SocietyLogo.tsx` (brand render, alt text), and expanded
`__tests__` incl. `src/lib/__tests__/gujaratiCopyUpgrade.test.ts` and `e2e/browser-smoke.spec.ts`.

---

## 13-area coverage

| # | Area | Audited | Status (Batch 1 · Batch 2) |
|---|---|---|---|
| 1 | Public website (Home, Features, Pricing, FAQ, Contact, Privacy, Terms, PublicLayout) | 8 | ✅ B1 em dashes + `માત્ર`→`ફક્ત`; ✅ B2 `પ્રાંગણવન` in Gujarati Home/Contact copy, Home trust + FAQ×2 de-teched, Contact bilingual role titles; 🔷 Pricing accurate (figures locked, no change), PublicLayout wordmark + English legal footer; ⏳ Privacy/Terms → Batch 3 |
| 2 | Auth & system pages (Login, Join, AuthCallback, ResetPassword, NoAccess, Forbidden, NotFound, ShareLink, SetPasswordCard) | 9 | 🔷 all `ફરી પ્રયાસ કરો` / `કૃપા કરીને` / combined non-revealing auth errors already in place; no raw provider errors surfaced |
| 3 | Shared components (App shell, banners, ReceiptView, error boundary, layouts) | 14 | 🔷 read-only/support/auditor banners already `ફક્ત જોવા માટે … વ્યૂ`, middle dots; ErrorBoundary shows friendly Gujarati only (raw `error.message` kept for logging, never rendered) |
| 4 | Admin / committee (Payments, Billing, Members, Settings, Complaints, Notices, Documents, Events, Polls, Parking, Vendors, Reports, Dashboard, Expenses) | 14 | ✅ B1 `પ્રયત્ન`→`પ્રયાસ`; ✅ B2 Settings permissions note de-teched (no "Supabase RLS"), backup + plan notes de-teched, `પ્રાંગણવન` in Settings, admin Documents storage note de-teched; ⏳ Payments `ફેલ`→`નષ્ફળ` → Batch 3 |
| 5 | Accountant (Reports, Adjustments, Dashboard) | 3 | 🔷 bilingual ઉધાર/જમા intact; ⏳ failed-transaction `ફેલ`→`નષ્ફળ` (Reports) → Batch 3 |
| 6 | Resident (Bill, Receipts, ReceiptDetail, Complaints, ComplaintDetail, Notices, Documents, Contacts, Polls, Events, Parking, Profile, Dashboard, More) | 14 | 🔷 warm/plain copy already correct; ✅ B2 resident Documents storage note de-teched, Profile → `પ્રાંગણવન`; ⏳ self-report/credit/receipt financial lines (Bill) → Batch 3 |
| 7 | Owner & onboarding (SocietyDetail, Onboarding, Activity, Billing, Dashboard, Societies, Leads, Layout) | 8 | ✅ `પ્રયત્ન`→`પ્રયાસ` (Leads); 🔷 impersonation already surfaced as `કમિટી તરીકે જુઓ`; `legacy`/`memberships` exist only as JS identifiers (not copy — not renamed) |
| 8 | Demo library (demoSeed, demoGuide, demoStore) | 3 | 🔷 seed numerals already Western (enforced by `gujaratiCopyUpgrade.test.ts`); guidance copy natural |
| 9 | Runtime library (copy.ts, whatsapp.ts, format.ts, store.tsx, permissions.ts, subscription.ts, csv.ts, uploadValidation.ts, theme/presets.ts, auth.ts) | 10 | 🔷 `copy.ts` retry/please canonical already `પ્રયાસ`/`કૃપા કરીને`; `whatsapp.ts` uses correct `${societyName}` (audit's "$s{ocietyName}" was OCR damage, **no bug**); ⏳ whatsapp financial templates + `store.tsx` credit/cancel + `subscription.ts` → Batch 3 |
| 10 | Database-generated text (`supabase/schema.sql`) | 1 | ⏳ overpayment credit-reason literal (`schema.sql`, DB function) → Batch 3 (needs migration) |
| 11 | PWA & metadata (`index.html`, `public/manifest.webmanifest`) | 2 | ✅ B1 em dash; ✅ B2 manifest name/short_name → `પ્રાંગણવન`, `index.html` gu default title/og/twitter → `પ્રાંગણવન`. English marketing shells (`public-seo.mjs`) keep `Prangan One` for search; `og:site_name`/image-alt kept English |
| 12 | Sample data (`sample-data/*.json`) | 16 | 🔷 Western numerals, fictional records; not shipped to real societies; no change needed |
| 13 | Fake-data generator (`scripts/gen-data.mjs`) | 1 | 🔷 internal tooling, not user-facing (per audit) — left as-is |

---

## Batch 1 — changes applied (this PR)

Low-risk, non-financial, non-legal, non-brand only:

1. **Em dashes removed** from all user-facing copy → `src/pages/public/Home.tsx` (en+gu meta description and hero sub), `index.html` (`<title>`, `og:title`, `twitter:title`), `scripts/public-seo.mjs` (route description). Replaced with comma/colon/period; brand, region, module keywords and figures preserved.
2. **`માત્ર` → `ફક્ત`** (glossary "only") → `src/pages/public/Features.tsx` documents permission line.
3. **`પ્રયત્ન` → `પ્રયાસ`** (glossary standardises the effort/attempt word) for descriptive UI text → `src/pages/admin/Members.tsx`, `src/pages/owner/Leads.tsx` (×2). Not applied to legal (`Terms.tsx`) or internal tooling (`gen-data.mjs`).

Placeholders, `${…}`/JSX expressions, JSON keys, IDs, URLs, emails, receipt numbers, figures and routing were preserved exactly.

---

## Batch 2 — changes applied (this PR)

Brand + de-technicalisation + public messaging (no financial/legal/pricing meaning changed):

1. **Brand** — `પ્રાંગણવન` in Gujarati-facing copy (Home gu meta/sub, Contact "follow", NoAccess, NotFound, ShareLink, Login society line, Profile, ModuleGate, Settings notes, `index.html` gu default title/og/twitter, PWA manifest name/short_name). `Prangan One` kept in English copy, URLs, emails, code, JSON-LD, `og:site_name`, English SEO shells, wordmark alt, legal footer, and the platform-owner console. `docs/COPY_STYLE_GUIDE.md` §1 rewritten to lock this.
2. **De-technicalisation** — removed Supabase / Postgres / Row Level Security from public/resident/committee copy: Home trust card, FAQ ×2 (data isolation, committee change), resident + admin Documents storage notes, Settings backup notes, and the Settings permissions note (now "screen permissions only change the display; real security is enforced system-level, not by hiding controls"). Security meaning preserved. (RoleGate/SetPasswordCard had their only Supabase mentions in code comments — dev docs, left as-is.)
3. **Public contact roles** — bilingual `પ્રમુખ (ચેરમેન)` / `મંત્રી (સેક્રેટરી)` / `ખજાનચી (ટ્રેઝરર)` / `રહેવાસી` / `અન્ય`.
4. Reviewed, no change: Pricing (figures locked, copy accurate, no "cost of tea" added), PublicLayout (wordmark image + English legal footer), Features (already benefit-led).

Decisions taken (owner may veto): PWA app name localised to `પ્રાંગણવન`; platform-owner console identity + audit-actor role kept as `Prangan One` (operator identity, owner-console-only). Production SEO titles stay English via the static marketing shells; the Gujarati brand shows in the runtime Gujarati description and in-app copy.

Placeholders, `${…}`/JSX, JSON keys, IDs, URLs, emails, figures, routing and a11y preserved exactly. 4 intentionally-asserted test strings updated (Home trust, NoAccess/ShareLink brand, gu SEO description).

---

## Deferred to Batch 3 — high-risk financial & legal (double-review + owasp-security)
- Privacy, Terms, security-architecture claims, data retention, support access.
- Bills, balances, credits, adjustments, advances, self-reported vs confirmed vs failed payments (`ફેલ`→`નષ્ફળ`), receipts, receipt cancellation.
- WhatsApp financial templates, `store.tsx` credit/cancel text, `subscription.ts`, `supabase/schema.sql` credit-reason literal.

---

## Needs owner confirmation

- ✅ Public Contact role titles — applied as bilingual `પ્રમુખ (ચેરમેન)` … (Batch 2).
- ✅ Settings permissions note — de-teched (Batch 2).
- ❓ PWA app name `પ્રાંગણવન` (Batch 2 decision; one-line revert to `Prangan One` if the owner prefers the English app name).
- ❓ Pricing / trial / ₹10-per-flat / ₹499-minimum wording and any "cost of tea" comparison — figures kept exact and no new claim added; confirm before any pricing-copy change (`COPY_FACTS.md`).
- ❓ Privacy read-access ("read" → "રીડ-એક્સેસ (વાંચવાની એક્સેસ)") legal wording — Batch 3.

---

## Verification gates (must pass before each batch merges)

- `npm run build` (tsc + vite + SEO html) green · `npm test` green (update only intentionally-asserted strings).
- No em dash in user-facing copy · no raw provider/database error shown to users · no Gujarati digits in ordinary product dates/amounts.
- Placeholders / interpolation / JSON keys / IDs / routing / a11y behaviour unchanged.
- No deferred financial, legal, pricing or brand meaning changed.
