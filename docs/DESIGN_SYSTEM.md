# Design system

Quick reference for the visual language, so it stays consistent as the app grows.

## Why these choices

Rajhans means "royal swan," and the swan mark (navy square, cream swan silhouette, saffron beak) is the one distinctive visual anchor, used small and consistently rather than decorated everywhere. The rest of the system stays deliberately restrained: this is a tool a 60-year-old committee treasurer and a 25-year-old resident both need to trust and use daily, not a startup landing page. Minimalism plus a light bento grid (StatCards, feature tiles) over heavy dashboards; native controls over exotic ones; system fonts plus Noto Sans Gujarati rather than a decorative typeface, because Gujarati has to render perfectly, not just look nice in English.

## Theme presets (per-society branding)

The 60/30/10 system above describes Rajhans Tower's own look. Since other societies can pick their own theme, the actual color values behind `navy` and `saffron` are not hardcoded, they resolve from CSS custom properties at runtime (`src/lib/theme/apply.ts`), which Tailwind reads through the `rgb(var(--color-navy-800) / <alpha-value>)` pattern in `tailwind.config.js`. Every existing `bg-navy-800`, `text-saffron-600`, `border-saffron-500/30` class across all 32+ pages keeps working unchanged; only what those tokens resolve to changes per society.

`cream` (the background) and the semantic status colors (`paid`/`pend`/`over`) never change per theme, on purpose: a neutral warm background works with any brand color, and green-means-paid has to mean the same thing regardless of which society you're looking at.

Six presets exist (`src/lib/theme/presets.ts`), each a full color scale, not just two swatches. The first preset uses Rajhans Tower's exact original hex values, not a regenerated approximation, so the default look has zero drift from what was already built and shown to the client. The other five were generated from the same lightness-step pattern as the original scale (extracted once via a one-off script) applied to a different hue, so every preset has matching contrast quality without needing each one hand-tuned. This is deliberate: a treasurer picking a theme can't judge color contrast on sight, so the choice is a curated set of good options, not a free hex-code picker. If a seventh preset is ever needed, follow the same script-based approach rather than hand-picking hex values, to keep the contrast consistent.

## Module toggles

Every society can turn off any of 9 feature areas (billing, complaints, notices, documents, vendors, polls, events, parking, reports) from Settings, modeled as `SocietyModules` in `src/lib/types.ts`. This is enforced in two places, not just one: nav arrays filter out disabled modules (so the link never appears), and `src/components/ModuleGate.tsx` redirects away from a disabled module's routes even on direct URL access, the same pattern as `RoleGate` for role-based access. There is deliberately no visitor/gatekeeper toggle anywhere in this list, in code or copy, that module stays fully out of scope.

## SaaS owner console vs. committee-facing UI

These are two different audiences and the UI treats them differently on purpose. The committee-facing app (resident bottom nav, admin/accountant sidebar) is designed for someone who has likely never used a SaaS admin panel: a treasurer or secretary comfortable with WhatsApp and a UPI app, not with software jargon. Concretely, that means: internal vocabulary like "module," "tenant," or "theme key" never appears in any committee-facing copy, only in code comments and the docs; the onboarding wizard defaults everything to a sensible value rather than starting from a blank slate; branding is tap-to-choose preset cards, never a raw color input; every module toggle carries a one-line plain-language reason, not just a technical name.

The SaaS owner console (`/saas/*`) is the deliberate exception. It's Essancia's own operating tool, not something a committee member ever sees, so it can stay more information-dense and closer to a typical admin panel: a real data table, inline edit forms, status badges using their English names. Don't backport the owner console's density into committee-facing pages, and don't over-simplify the owner console at the cost of Essancia's own efficiency using it daily.

## Color: 60/30/10

- **60% cream** (`cream-50` `#FDFBF7` / `cream-100` `#FAF6EF`): page backgrounds, the dominant surface.
- **30% navy** (`navy-800` `#1B2740` / `navy-900` `#141D30`): headers, sidebars, primary buttons, body text (`navy-800` on cream).
- **10% saffron** (`saffron-500` `#E68F1B`): accents only: active nav state, primary CTAs, highlights. Never a background fill for large areas.

Semantic colors are separate from the palette and never reused for anything else:
- `paid` `#16A34A` (green): paid, done, success
- `pend` `#D97706` (amber): pending, in progress
- `over` `#DC2626` (red): overdue, urgent, failed

The SaaS preview page (`src/pages/saas/Preview.tsx`) is the one deliberate exception: full `navy-950` dark background with saffron accents, because it's simulating a different, more "product marketing" surface, not the day-to-day resident/admin tool.

## Typography

`Noto Sans Gujarati` paired with `Inter` as the fallback for Latin characters (numbers, English words like "UPI"), both self-hosted via `@fontsource`, so there is no external font CDN dependency at runtime. Base body size is 16.5px with 1.6 line height, deliberately generous for readability across ages. Numbers (`inr()` output, phone numbers, receipt numbers) always get the `.num` class (`font-variant-numeric: tabular-nums`) so columns of figures align.

## Components (`src/components/ui.tsx`)

Hand-built, no Radix/shadcn dependency, kept simple enough that swapping or restyling later doesn't mean fighting a headless-UI abstraction.

- **Button**: 5 variants (`primary` navy, `accent` saffron, `soft` light navy, `ghost` transparent, `danger` red). Minimum 44px tap height everywhere, `active:scale-[0.98]` for tactile feedback.
- **Card**: white, `rounded-2xl`, soft shadow, cream border. The base surface for nearly everything.
- **StatCard**: label + big tabular number + optional icon, used for dashboard metrics. Tone maps to the semantic colors above.
- **Badge**: pill-shaped status indicator, 6 tones (green/amber/red/blue/gray/saffron).
- **Modal**: bottom-sheet on mobile (`items-end`), centered dialog on desktop (`sm:items-center`), backdrop click to close.
- **Progress**: simple animated fill bar, used for collection rate and plan-limit displays.

## Layout patterns

- **Resident** (`ResidentLayout`): mobile-first, `max-w-2xl` centered column, glass sticky header, 5-tab bottom nav (thumb-reachable).
- **Admin/Accountant** (`Shell`): sidebar on desktop (`md:` breakpoint), slide-out drawer on mobile, shared between both roles with a different `NavItem[]` and title.
- **Glass header** (`.glass` in `index.css`): translucent cream with blur, used only for sticky headers, never for large content areas ("light glass, not everywhere" was the brief).

## Motion

One keyframe, `fadeUp` (opacity + 10px translateY, 450ms, staggered via inline `animationDelay` on lists). `prefers-reduced-motion: reduce` collapses all animation/transition durations to near-zero globally. No motion library needed; plain CSS is enough for this scope and keeps the bundle small.

## Data visualization

No charting library. `src/components/charts.tsx` has two hand-built components:
- **PairBars**: grouped vertical bars (income vs. expense per month), done with CSS height percentages, no SVG.
- **HBars**: horizontal bars with label + amount (category/vendor breakdowns).

Chosen deliberately over Chart.js/Recharts: these charts need to render instantly on low-end Android phones on patchy connections, and the data here is simple enough (a handful of bars) that a charting library would be pure overhead.

## Iconography

`lucide-react` throughout, no mixing icon sets. Icons are always paired with a Gujarati text label, never icon-only for anything except secondary/tertiary actions (like the modal close button).

## Extending this system

New pages should reuse `Card`, `Button`, `Badge`, `PageHeader`, `Field`/`Input`/`Select`/`Textarea` from `ui.tsx` before reaching for custom markup. If a new pattern shows up three times, it belongs in `ui.tsx`, not copy-pasted.
