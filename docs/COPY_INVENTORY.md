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
