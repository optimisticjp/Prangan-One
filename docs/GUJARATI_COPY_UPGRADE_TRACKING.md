# Gujarati Copy Upgrade — Implementation Tracking

Source: *Prangan One — Gujarati Copy Upgrade* (40-page audit, 13 July 2026).
This tracks every actionable item from PDF Sections 4–8 against the current code.

**Status legend**

- **Implemented** — changed in this task.
- **Already present** — a prior commit (notably #7 "Polish Gujarati public and
  authentication copy") already satisfied the intent; verified, no change.
- **Verified, no change** — reviewed against the audit and correct as-is.
- **Not applicable** — the audited string moved/changed and no longer exists in a
  form the row applies to.

A key theme: several rows targeted strings that a recent commit already reworded
(often *better* than the audit's suggestion). Where that removed the thing the row
was fixing (e.g. a `પ્રયત્ન` retry that no longer exists), the row is "Already
present". Where a residual normalization still applied (e.g. `પ્રયત્ન` still present
elsewhere), it was implemented against the **current** source, not the audit's old
line.

---

## Section 6 — 37 Implementation Handoff rows

| # | File · Ref | Change | Status |
|---|---|---|---|
| 1 | Contact.tsx 002 | Meta desc: add `આપને`, forward tense → `…અમે આપને સીધો જવાબ આપીશું.` | **Implemented** |
| 2 | Contact.tsx 015 | Role option `ચેરમેન` → `પ્રમુખ` (gu only; EN option unchanged) | **Implemented** |
| 3 | Contact.tsx 018 | Role option `સેક્રેટરી` → `મંત્રી` | **Implemented** |
| 4 | Contact.tsx 016 | Role option `ટ્રેઝરર` → `ખજાનચી` | **Implemented** |
| 5 | Contact.tsx 028 | Error retry `પ્રયત્ન` → `પ્રયાસ` (full stop + `કૃપા કરીને` already present) | **Implemented** |
| 6 | Features.tsx 005 | Button → short `સેટઅપ વિનંતી કરો`; full line added as supporting text | **Implemented** |
| 7 | Home.tsx 001 | Meta desc → brand + Surat/Gujarat + `બિલિંગ, રસીદ, ફરિયાદ, નોટિસ` | **Implemented** |
| 8 | Privacy.tsx 010 | `સ્ટેન્ડિંગ read એક્સેસ` → `સ્ટેન્ડિંગ રીડ-એક્સેસ (વાંચવાની એક્સેસ)` (both occurrences; meaning preserved) | **Implemented** |
| 9 | AuthCallback.tsx 004 | Retry `પ્રયત્ન` → `પ્રયાસ` | **Already present** — error was reworded to `કૃપા કરીને લોગિન પેજ પરથી નવી લિંક મંગાવો.`; no `પ્રયત્ન` remains |
| 10 | Join.tsx 005 | Error retry `પ્રયત્ન` → `પ્રયાસ` (unknown + flat_not_found) | **Implemented** |
| 11 | Login.tsx 002 | Auth error: keep generic, `પ્રયત્ન` → `પ્રયાસ` | **Implemented** (current generic wording kept; normalized) |
| 12 | Login.tsx 001 | Link error: comma → full stop, `પ્રયત્ન` → `પ્રયાસ` | **Implemented** |
| 13 | ResetPassword.tsx 003 | Retry `પ્રયત્ન` → `પ્રયાસ` | **Already present** — reworded to `…કૃપા કરીને નવી રીસેટ લિંક મંગાવો.`; no `પ્રયત્ન` remains |
| 14 | ErrorBoundary.tsx 002 | Retry `પ્રયત્ન` → `પ્રયાસ` | **Implemented** |
| 15 | SetPasswordCard.tsx 003 | Retry `પ્રયત્ન` → `પ્રયાસ` | **Implemented** |
| 16 | Layouts.tsx 012 | Banner: `Read-only` → `ફક્ત જોવા માટે`, `વ્યુ` → `વ્યૂ`, hyphen → middle dot | **Implemented** (at `src/layouts/Layouts.tsx`) |
| 17 | Layouts.tsx 018 | Auditor banner: middle dot, `બદલાય નહીં` → `બદલી શકાશે નહીં` | **Implemented** |
| 18 | FetchErrorBanner.tsx 007 | `ડેટા લોડ ના થયો,` → `…થયો.` (comma → full stop); retry button `પ્રયત્ન`→`પ્રયાસ` | **Implemented** |
| 19 | Payments.tsx 002 | `ફેલ થયેલી ચુકવણી` → `નિષ્ફળ ગયેલી ચુકવણી` (bill-unaffected/no-receipt meaning kept) | **Implemented** |
| 20 | Payments.tsx 003 | Status badge + CSV label `ફેલ` → `નિષ્ફળ` | **Implemented** |
| 21 | Payments.tsx 031 | `ફેલ થયેલી ચુકવણી તરીકે નોંધો` → `નિષ્ફળ ચુકવણી તરીકે નોંધો` (+ demo hint) | **Implemented** |
| 22 | Parking.tsx 012 | `કૃપા કરી ચકાસો.` → `કૃપા કરીને ચકાસો.` | **Implemented** |
| 23 | Settings.tsx 043 | Permissions/RLS note; soften raw "cosmetic" if present | **Verified, no change** — already natural Gujarati `આ પરવાનગી ફક્ત UI પૂરતી છે. અસલી સુરક્ષા Supabase RLS થી લાગુ થશે…`; no raw "cosmetic"; RLS explanation intact |
| 24 | accountant/Reports.tsx 009 | CSV status `ફેલ` → `નિષ્ફળ` | **Implemented** |
| 25 | owner/SocietyDetail.tsx view-as | `Read-only સપોર્ટ વ્યુ` control → `કમિટી તરીકે જુઓ` | **Implemented** |
| 26 | owner/SocietyDetail.tsx legacy | Translate "legacy" tag → `જૂની` | **Implemented** (in owner/Activity.tsx, where the legacy tag actually renders) |
| 27 | owner/SocietyDetail.tsx memberships | Drop `(memberships)` → `સભ્યો` | **Implemented** (SocietyDetail heading + owner/Dashboard stat card) |
| 28 | owner/Onboarding.tsx btn-long | Shorten `સોસાયટી સેટઅપની વિનંતી કરો` | **Not applicable** — the wizard has no such long CTA; its buttons are already short verbs (`આગળ`, `સોસાયટી સક્રિય કરો`, `કમિટી પેનલમાં જાઓ`, `N બિલ બનાવો`) |
| 29 | demoSeed.ts 086 | `તા. ૧૦` → `તા. 10` (+ `કૃપા કરી`→`કૃપા કરીને`) | **Implemented** |
| 30 | demoSeed.ts 089 | `સવારે ૧૦ થી ૧૨` → `સવારે 10 થી 12` | **Implemented** |
| 31 | demoSeed.ts 094 | `૧૫ ઓગસ્ટે` → `15 ઓગસ્ટે` | **Implemented** |
| 32 | copy.ts retry | Canonical retry `પ્રયત્ન` → `પ્રયાસ` | **Not applicable (as central row) / Implemented at call sites** — current `copy.ts` no longer holds this fragment; normalization applied at each inline usage (Login, Join, Contact, ErrorBoundary, SetPasswordCard, FetchErrorBanner, SyncFailureBanner) |
| 33 | copy.ts please | Canonical `કૃપા કરી` → `કૃપા કરીને` | **Not applicable (as central row) / Implemented at call sites** — fixed at the two live bare occurrences (Parking, demoSeed); all other copy already uses `કૃપા કરીને` |
| 34 | copy.ts only | `માત્ર` → `ફક્ત` (context-aware) | **Implemented** — `permissions.ts` auditor label `માત્ર જોવા` → `ફક્ત જોવા`. Deliberate `માત્ર` (e.g. `કમિટી-માત્ર` access levels in Features) intentionally kept |
| 35 | whatsapp.ts 003 | `$s{ocietyName}` → `${societyName}` | **Verified, no change** — source already reads `${societyName}` (line 24–25); the audit's malformed form was a PDF extraction artefact only |
| 36 | format.ts numerals | Western numerals app-wide | **Already present / Verified** — `inr` uses `toLocaleString('en-IN')`; `fmtDate`/`fmtMonth` interpolate numeric day/year. Only the 3 hardcoded demoSeed notices had Gujarati digits (fixed above) |
| 37 | index.html title | `<title>` → `Prangan One — ગુજરાતી-પ્રથમ સોસાયટી મેનેજમેન્ટ` | **Implemented** (title + og:title + twitter:title) |

## Section 4 — non-find-and-replace work

| Item | Status |
|---|---|
| FAQ FAQPage JSON-LD (reuse page data, valid, no visible duplication) | **Already present** — `Faq.tsx` injects `FAQPage` JSON-LD from `t.items` in a `useEffect` (same pattern as Home's SoftwareApplication/Organization schema). New test locks it |
| Home pricing line as non-interactive element (not tappable content) | **Implemented** — the `₹10/₹499` sentence is a plain `<p>` caption inside a non-interactive `<article>`; only the separate `કિંમત જુઓ →` CTA is a `<Link to="/pricing">`. No nested interactive elements; figures preserved. Tests assert the sentence has no link/button ancestor and the CTA links to `/pricing` |
| Short CTA + supporting context (Features + owner onboarding) | **Implemented for Features** (short `સેટઅપ વિનંતી કરો` + supporting text). Onboarding N/A — no such CTA there. **Pricing is NOT shortened** — the audit's short-CTA rows target Features + onboarding only, and the Pricing section says its copy needs no wording change |
| SEO: Home description (brand/region/terms) | **Implemented** — `Home.tsx` (gu+en) and `scripts/public-seo.mjs` `/` |
| SEO: Pricing metadata (society-maintenance-software pricing keywords) | **Implemented** — `Pricing.tsx` (gu+en) and `scripts/public-seo.mjs` `/pricing`. The visible Pricing CTA keeps its full audit wording `સોસાયટી સેટઅપની વિનંતી કરો` |
| SEO: true source of generated metadata updated | **Implemented** — updated `scripts/public-seo.mjs` (build-time shells) alongside the runtime `usePageMeta` copy; SEO alignment test updated |
| Public title/description concise (`Prangan One — ગુજરાતી-પ્રથમ સોસાયટી મેનેજમેન્ટ`) | **Implemented** (index.html) |
| PWA manifest name/short_name/icons | **Verified, no change** — `name`/`short_name` = "Prangan One", Gujarati description present, all icons exist (`icon-192/512/maskable-512`, favicons, apple-touch, og-image) |
| Demo dynamic real-login banner resolves to a natural sentence | **Verified, no change** — renders `વાસ્તવિક લોગિન અહીં છે.` with `અહીં` as the link; a complete sentence |

## Section 5 — high-risk strings (kept unless explicitly changed)

| Item | Status |
|---|---|
| Receipt cancellation (cancelled not deleted, reason visible, amount → dues) | **Preserved** (no change) |
| Failed payment recorded (bill unaffected, no receipt) | **Preserved meaning**; only `ફેલ`→`નિષ્ફળ` term |
| Self-reported vs official payment; credit → next bill | **Preserved** (no change) |
| Bulk bill generation rules | **Preserved** (no change) |
| store.ts credit-reason / cancel-audit / subscription amounts | **Preserved** (no change) |
| schema.sql DB-generated credit reason | **Preserved** (no change; no migration) |
| Privacy database-level isolation; Terms grace period & liability | **Preserved** (only the approved read-access clarification applied) |
| Generic login failure (never reveal which field / if email exists) | **Preserved & tested** |
| lib/permissions labels aligned to enforcement | **Preserved** (no change) |
| lib/store read-only / write-lock banner wording | **Standardised** to `ફક્ત જોવા માટે` (blocked-reason string; tests updated) |
| Destructive confirmations (cancel receipt, restart/reset demo, give-up sync) | **Preserved**; sync give-up retry text normalized `પ્રયત્ન`→`પ્રયાસ` |
| WhatsApp / receipt / CSV / resident payment-request output | **Verified** placeholders intact (`${societyName}` etc.); rendered output correct |
| "Last updated" dates (Privacy + Terms) | **Verified** — `જુલાઈ 2026` / `July 2026` matches the current release month (2026-07); no mismatch |

## Extra user-facing cleanups found by the required searches

- `owner/Activity.tsx`: `impersonation` (heading + empty state) → `'કમિટી તરીકે જુઓ'`;
  `read-only` → `ફક્ત જોવા માટે`; `(legacy)` dropped; the raw displayed `write` is gone —
  the historical badge/description reads `જૂની લખવાની એક્સેસ` / `લખવાની એક્સેસવાળી એન્ટ્રી`, and
  the view-only badge reads `ફક્ત જોવા`. The internal `l.mode === 'write'` comparison is
  unchanged. **Implemented** (Activity screen test added).
- `owner/Dashboard.tsx`: stat label `કુલ સભ્ય (memberships)` → `કુલ સભ્ય`. **Implemented.**

## Intentional non-changes / exceptions

- Internal identifiers, DB table names, RLS references, type fields, and CSV column
  keys named `memberships`, `impersonation*`, `societyName`, etc. — **untouched**
  (not user-facing).
- Code comments referencing the old `"ફેલ"` label (e.g. `Payments.tsx`) — left as
  historical documentation.
- `scripts/gen-data.mjs` fake `note: 'UPI ટાઈમઆઉટ, ફરી પ્રયત્ન કરવો'` — internal
  generator/seed tooling, per the audit "not user-facing copy. No change needed."
- `Features.tsx` `કમિટી-માત્ર / એકાઉન્ટન્ટ-માત્ર / એડમિન-માત્ર` access-level compounds —
  deliberate idiom; kept (Features marked no-change beyond the CTA).
- Privacy/Terms `(read-only)`-style bracketed English in the owner console — allowed
  by the glossary for that technical audience.

## Deployment status

- **Nothing was merged into `main`.** All work lives on
  `claude/gujarati-copy-upgrade-4xn7ef`.
- **Nothing was deployed to production.**
- Cloudflare Pages **automatically generated a non-production branch/PR preview
  deployment** for PR #8 (its normal per-PR behaviour). That preview is not
  production and was not disabled or altered.

## Post-review corrections (PR #8 follow-up)

- Home pricing line is now a plain non-interactive caption; only the `કિંમત જુઓ`
  CTA is a link (was previously the headline of a fully-clickable card).
- Pricing CTA restored to the full audit wording `સોસાયટી સેટઅપની વિનંતી કરો`
  (the short CTA applies to Features + onboarding only); Pricing SEO metadata kept.
- Owner Activity: removed the last raw displayed `write`; historical write
  sessions now read `જૂની લખવાની એક્સેસ`.

## Blockers

- **None** for the code. The Playwright e2e run required pointing at the
  pre-installed Chromium (build 1194) because `@playwright/test@1.61.1` expects
  browser build 1228 (`test:e2e:install` isn't run in this sandbox). Tests pass;
  see the PR/summary for the exact command.
