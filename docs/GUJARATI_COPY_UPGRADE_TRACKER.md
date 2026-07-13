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

Legend: ✅ done · 🔷 already satisfied (pre-Batch-1) · ⏳ deferred · ❓ needs owner confirmation

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

| # | Area | Audited | Batch 1 status |
|---|---|---|---|
| 1 | Public website (Home, Features, Pricing, FAQ, Contact, Privacy, Terms, PublicLayout) | 8 | ✅ em dashes removed (Home, index.html, public-seo.mjs); ✅ `માત્ર`→`ફક્ત` (Features); 🔷 Contact tone/`કૃપા કરીને` already applied; ⏳ SEO/brand/marketing rewrite + role titles → Batch 2; ⏳ Privacy/Terms → Batch 3 |
| 2 | Auth & system pages (Login, Join, AuthCallback, ResetPassword, NoAccess, Forbidden, NotFound, ShareLink, SetPasswordCard) | 9 | 🔷 all `ફરી પ્રયાસ કરો` / `કૃપા કરીને` / combined non-revealing auth errors already in place; no raw provider errors surfaced |
| 3 | Shared components (App shell, banners, ReceiptView, error boundary, layouts) | 14 | 🔷 read-only/support/auditor banners already `ફક્ત જોવા માટે … વ્યૂ`, middle dots; ErrorBoundary shows friendly Gujarati only (raw `error.message` kept for logging, never rendered) |
| 4 | Admin / committee (Payments, Billing, Members, Settings, Complaints, Notices, Documents, Events, Polls, Parking, Vendors, Reports, Dashboard, Expenses) | 14 | ✅ `પ્રયત્ન`→`પ્રયાસ` (Members pending-list); 🔷 `કૃપા કરીને` (Parking) already applied; ❓ Settings 043 permissions/RLS note → Batch 2 (security-architecture wording); ⏳ Payments failed-payment `ફેલ`→`નષ્ફળ` → Batch 3 |
| 5 | Accountant (Reports, Adjustments, Dashboard) | 3 | 🔷 bilingual ઉધાર/જમા intact; ⏳ failed-transaction `ફેલ`→`નષ્ફળ` (Reports) → Batch 3 |
| 6 | Resident (Bill, Receipts, ReceiptDetail, Complaints, ComplaintDetail, Notices, Documents, Contacts, Polls, Events, Parking, Profile, Dashboard, More) | 14 | 🔷 warm/plain copy already correct; ⏳ self-report/credit/receipt financial lines (Bill) → Batch 3 |
| 7 | Owner & onboarding (SocietyDetail, Onboarding, Activity, Billing, Dashboard, Societies, Leads, Layout) | 8 | ✅ `પ્રયત્ન`→`પ્રયાસ` (Leads); 🔷 impersonation already surfaced as `કમિટી તરીકે જુઓ`; `legacy`/`memberships` exist only as JS identifiers (not copy — not renamed) |
| 8 | Demo library (demoSeed, demoGuide, demoStore) | 3 | 🔷 seed numerals already Western (enforced by `gujaratiCopyUpgrade.test.ts`); guidance copy natural |
| 9 | Runtime library (copy.ts, whatsapp.ts, format.ts, store.tsx, permissions.ts, subscription.ts, csv.ts, uploadValidation.ts, theme/presets.ts, auth.ts) | 10 | 🔷 `copy.ts` retry/please canonical already `પ્રયાસ`/`કૃપા કરીને`; `whatsapp.ts` uses correct `${societyName}` (audit's "$s{ocietyName}" was OCR damage, **no bug**); ⏳ whatsapp financial templates + `store.tsx` credit/cancel + `subscription.ts` → Batch 3 |
| 10 | Database-generated text (`supabase/schema.sql`) | 1 | ⏳ overpayment credit-reason literal (`schema.sql`, DB function) → Batch 3 (needs migration) |
| 11 | PWA & metadata (`index.html`, `public/manifest.webmanifest`) | 2 | ✅ em dash removed from `index.html` title/og/twitter; ⏳ brand/SEO title finalisation → Batch 2 |
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

## Deferred (not in Batch 1)

**Batch 2 — brand + de-technicalisation + SEO/marketing**
- Full `પ્રાંગણવન` Gujarati brand pass (keep `Prangan One` in alt text, URLs, emails, legal IDs, code); update `docs/COPY_STYLE_GUIDE.md` §1.
- Remove technical implementation wording (Supabase / Row Level Security / Postgres / impersonation) from public/resident/committee copy — Home trust line, Documents, SetPasswordCard, `SubscriptionBanner`.
- SEO titles/descriptions + JSON-LD (Home, Faq), `index.html` + `public-seo.mjs` (keep en/gu shells in sync).
- ❓ Settings 043 "cosmetic permissions / RLS" note (security-architecture wording, PDF-flagged for confirmation).

**Batch 3 — high-risk financial & legal (double-review + owasp-security)**
- Privacy, Terms, security-architecture claims, data retention, support access.
- Bills, balances, credits, adjustments, advances, self-reported vs confirmed vs failed payments (`ફેલ`→`નષ્ફળ`), receipts, receipt cancellation.
- WhatsApp financial templates, `store.tsx` credit/cancel text, `subscription.ts`, `supabase/schema.sql` credit-reason literal.

---

## Needs owner confirmation (do not apply until signed off)

- ❓ Public Contact role titles: `ચેરમેન`/`સેક્રેટરી`/`ટ્રેઝરર` vs native `પ્રમુખ`/`મંત્રી`/`ખજાનચી` (recommend bilingual `પ્રમુખ (ચેરમેન)` …).
- ❓ Pricing / trial / ₹10-per-flat / ₹499-minimum wording and any "cost of tea" comparison — keep exact verified figures; add no new claim without sign-off (`COPY_FACTS.md`).
- ❓ Settings 043 permissions/RLS note audience + softening.
- ❓ Privacy read-access ("read" → "રીડ-એક્સેસ (વાંચવાની એક્સેસ)") legal wording.

---

## Verification gates (must pass before each batch merges)

- `npm run build` (tsc + vite + SEO html) green · `npm test` green (update only intentionally-asserted strings).
- No em dash in user-facing copy · no raw provider/database error shown to users · no Gujarati digits in ordinary product dates/amounts.
- Placeholders / interpolation / JSON keys / IDs / routing / a11y behaviour unchanged.
- No deferred financial, legal, pricing or brand meaning changed.
