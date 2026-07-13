# Prangan One User-Facing Copy Inventory

This inventory is repository-backed and scoped for reviewing public, auth, demo, legal, and public-facing support copy. It lists locations and categories rather than duplicating every repeated string.

| Location | Categories | Notes |
| --- | --- | --- |
| `index.html` | Browser title, meta description, Open Graph/Twitter metadata, image alt, robots | Default metadata for app and fallback public routes. |
| `public/manifest.webmanifest` | PWA app name, short name, Gujarati description, language, icon metadata | Public install metadata. |
| `public/robots.txt`, `public/sitemap.xml`, `public/_redirects` | Search/discovery and route handling | User-facing via crawlers and shared links. |
| `scripts/generate-seo-html.mjs`, `scripts/public-seo.mjs` | Generated public SEO titles/descriptions/canonicals | Must stay aligned with public page copy. |
| `src/App.tsx` | Navigation labels, route-level shell titles, loading fallback usage | Includes admin/resident/accountant labels that can surface publicly after auth. |
| `src/pages/public/PublicLayout.tsx` | Public header nav, mobile menu, language switch, login CTA, footer links, social aria-labels, legal navigation | Bilingual public navigation. |
| `src/pages/public/Home.tsx` | Hero, CTAs, product preview, modules, trust statements, demo availability, JSON-LD structured data | Avoid unverified security/pricing claims. |
| `src/pages/public/Features.tsx` | Feature page headings, module summaries, CTA copy | Bilingual public marketing. |
| `src/pages/public/Pricing.tsx` | Pricing, trial, minimum, feature list, setup note, examples, CTA | Pricing claims require facts-matrix coverage. |
| `src/pages/public/Faq.tsx` | FAQ headings and answers, CTA | Bilingual public policy/product explanations. |
| `src/pages/public/Contact.tsx` | Form labels, placeholders, validation, submit/loading/success/failure states, contact details | Must not expose raw Formspree/fetch errors. |
| `src/pages/public/Privacy.tsx` | Legal/privacy sections, contact email, updated date | Preserve legal structure and qualifications. |
| `src/pages/public/Terms.tsx` | Terms sections, pricing/trial/grace wording, contact email, updated date | Preserve legal structure and qualifications. |
| `src/pages/public/usePageMeta.ts` | Browser title/description update behavior | Receives page copy from public pages. |
| `src/pages/public/usePublicLang.ts` | Public language switching state | Language toggle affects public copy. |
| `src/pages/Demo.tsx` | Demo disabled state, role/journey choices, trust disclaimers, CTAs, loading and access copy | Demo content must remain clearly fictional and separate. |
| `src/lib/demoSeed.ts`, `sample-data/*` | Demo/sample resident names, bills, complaints, notices, documents, polls, events, vehicles, receipts | Appears in demo mode; do not treat as real claims. |
| `src/lib/demoGuide.ts`, `src/components/DemoGuideBanner.tsx`, `src/components/DemoRoleSwitcher.tsx`, `src/components/DemoIdentityBanner.tsx` | Demo guide labels, role switching, banner copy, buttons | Public-demo supporting copy. |
| `src/pages/Login.tsx` | Committee/resident login, Google/password/magic-link copy, errors, success states, aria labels | Must not expose raw auth errors. |
| `src/components/SetPasswordCard.tsx` | Password setup labels, requirements, success/error states, show/hide aria labels | Shared auth component. |
| `src/pages/ResetPassword.tsx` | Password reset page states, invalid session copy, buttons | Expired link copy should guide to request a new link. |
| `src/pages/AuthCallback.tsx` | Magic-link processing, membership matching, multiple-society selection, pending/unlinked/no-access states | High-risk auth/access copy. |
| `src/pages/Join.tsx` | Society-code joining, flat matching, validation, pending verification, submit/loading/errors | Must preserve auth logic and variables. |
| `src/pages/NoAccess.tsx`, `src/pages/Forbidden.tsx`, `src/pages/NotFound.tsx` | Access denied, permission mismatch, 404 copy, recovery links | Keep calm and actionable. |
| `src/pages/ShareLink.tsx` | Public society entry page, loading/not found states, branded login handoff | Public access flow copy. |
| `src/components/PageLoading.tsx`, `src/components/FetchErrorBanner.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ui.tsx` | Loading, retry, error boundaries, form control labels/titles | Shared user-facing system copy. |
| `src/lib/auth.ts`, `src/lib/store.tsx`, `src/lib/realData.ts`, `src/lib/formspree.ts` | Auth errors, RPC/database messages surfaced to UI, contact submission outcomes | Must sanitize raw technical messages before rendering. |
| `src/lib/receiptPdf.ts`, `src/components/ReceiptView.tsx` | Printable receipt/PDF wording, receipt labels, filenames | Preserve receipt numbers and amounts. |
| `src/lib/csv.ts` and page-level export handlers | CSV headers, downloaded filenames | Keep technical headers stable where tests/users rely on them. |
| `src/lib/whatsapp.ts` | WhatsApp/share templates | Keep concise and preserve dynamic values. |
| `src/pages/**/__tests__`, `src/lib/__tests__`, `e2e/browser-smoke.spec.ts` | Copy assertions and accessible-name expectations | Prefer roles, headings, links, and visible outcomes over full paragraphs. |
| `supabase/schema.sql`, `supabase/migrations/*` | Database/RPC exception messages that may surface to clients | Do not edit historical migrations for copy; sanitize in UI where possible. |

## Prompt 1 public/auth/legal scope status

| File | Surface | Reviewed | Changed or no change | Facts checked | Tests updated | Remaining business approval |
| --- | --- | --- | --- | --- | --- | --- |
| `index.html` | Default browser/share metadata | yes | Changed in prior pass; rechecked | Brand and fallback metadata | Build/SEO checks | None for copy values beyond brand positioning |
| `public/manifest.webmanifest` | PWA metadata | yes | Changed in prior pass; rechecked | Brand and Gujarati-first wording | Build check | None |
| `scripts/public-seo.mjs` | Static SEO metadata source | yes | Changed homepage/features descriptions to match runtime public copy | Runtime/static title-description parity | SEO generator test updated | None |
| `scripts/generate-seo-html.mjs` | Static SEO shell generation | yes | No change: generator already rewrites route head tags from `PUBLIC_ROUTES` | Route list and output behavior | Existing SEO test expanded | None |
| `src/App.tsx` | Route wiring and app nav labels | yes | No change: labels were already concise Gujarati and route behavior is out of scope | Navigation labels only | Existing route tests sufficient | None |
| `src/pages/public/PublicLayout.tsx` | Public header, mobile menu, language toggle, footer | yes | No change: labels and aria-labels already matched active language and style guide | Public nav/link labels | Public layout tests retained | None |
| `src/pages/public/Home.tsx` | Public homepage, trust cards, CTAs, JSON-LD | yes | Changed in prior pass; rechecked against facts matrix | Pricing, RLS, Supabase, demo separation | Home and Playwright tests updated | Pricing values need business-owner sign-off |
| `src/pages/public/Features.tsx` | Public feature claims | yes | Changed: neutralised unsupported parking/AMC/export/import claims and verified poll/receipt/document/notice claims | Poll votes, receipts, notices, documents, AMC, parking, exports, imports | Feature claim test added | Packaging/unlimited usage still needs approval |
| `src/pages/public/Pricing.tsx` | Pricing/trial/setup copy | yes | Changed in prior pass; facts matrix expanded | Pricing, card-free trial, setup charges, modules included | Build and public tests | Pricing, setup charges, module packaging |
| `src/pages/public/Faq.tsx` | FAQ public claims | yes | Changed in prior pass; rechecked | Gujarati-first and setup/pricing statements | Existing public tests | Pricing/setup policy sign-off |
| `src/pages/public/Contact.tsx` | Contact form labels/states | yes | Changed in prior pass; rechecked | Error text sanitisation | Contact failure test added | None |
| `src/pages/public/Privacy.tsx` | Privacy/legal copy | yes | Changed: conservative deletion/export and incident wording; Gujarati/English aligned | Deletion, retention, incident communication, exports | Legal tests updated | Retention/deletion and incident-response policy |
| `src/pages/public/Terms.tsx` | Terms/legal copy | yes | Changed: Gujarati sections expanded to match English; English softened for deletion/data-control claims | Trial, pricing, grace, read-only, data/export, limitations, notice | Legal parity tests added | Pricing and terms-change notification policy |
| `src/pages/Demo.tsx` | Public demo entry, disabled state, journey descriptions | yes | Changed direct-address browser-storage wording only | Demo separation | Existing demo tests retained | None |
| `src/pages/AuthCallback.tsx` | Magic-link callback and expired-link state | yes | Changed in prior pass; rechecked | Auth error sanitisation | Existing auth tests retained | None |
| `src/pages/Join.tsx` | Resident join/access flow | yes | Changed: respectful Gujarati labels, placeholders, success/error/sending CTA copy | Join outcomes and tenant access | Join tests updated | None |
| `src/pages/Login.tsx` | Login and password/magic-link states | yes | Changed in prior pass; rechecked | Auth error sanitisation | Login tests updated | None |
| `src/pages/ResetPassword.tsx` | Reset-password page | yes | Changed in prior pass; rechecked | Expired reset link wording | Existing tests/build | None |
| `src/pages/NoAccess.tsx` | No-access recovery state | yes | Changed in prior pass; rechecked | Unlinked-email recovery | NoAccess tests updated | None |
| `src/pages/Forbidden.tsx` | Forbidden state | yes | Changed direct-address wording | Access-denied copy | Build/typecheck | None |
| `src/pages/NotFound.tsx` | 404 state | yes | No change: concise recovery links already match guide | 404 recovery | Build/typecheck | None |
| `src/pages/ShareLink.tsx` | Society public entry link | yes | Changed direct-address not-found guidance | Public profile lookup copy | Build/typecheck | None |
| `src/components/SetPasswordCard.tsx` | Password setup card | yes | Changed in prior pass; rechecked | Password error copy | Existing tests/build | None |
| `src/components/DemoGuideBanner.tsx` | Demo guide banner | yes | Changed direct-address completion copy | Demo-only copy | Existing demo guide tests retained | None |
| `src/components/DemoIdentityBanner.tsx` | Demo identity/restart confirmation | yes | Changed destructive confirmation copy to use `આપ` | Demo reset consequence | Existing demo tests retained | None |
| `src/components/DemoRoleSwitcher.tsx` | Demo role switching | yes | No change: labels are role names, not direct-address policy claims | Demo role labels | Existing tests retained | None |
| `src/components/FetchErrorBanner.tsx` | Shared fetch/offline banner | yes | Changed direct-address offline copy | Error message style | Existing tests/build | None |
| `src/components/ModuleGate.tsx` | Disabled-module empty state | yes | Changed direct-address society wording | Module availability | Existing tests/build | None |
