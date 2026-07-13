// Single source for crawlable per-page meta. If you change a public page's
// title/description, update it here too.
//
// These are the English SEO meta for the public marketing routes, seeded from
// each page's current metaTitle/metaDesc in its copy object so they match
// what's live today. Titles include the " | Prangan One" suffix that
// usePageMeta.ts adds at runtime, so the static crawler shells the build
// generates read exactly like what a real user sees once the SPA hydrates.
// Runtime usePageMeta still handles real users and the Gujarati toggle; this
// file is only for the static shells written into dist/ by
// scripts/generate-seo-html.mjs.

export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'The Society OS | Prangan One',
    description: 'Prangan One — Gujarati-first society management software for housing societies in Surat and Gujarat: billing, receipts, complaints, and notices.',
  },
  {
    path: '/features',
    title: 'Features | Prangan One',
    description: 'Core tools for housing society committees and residents, in one place.',
  },
  {
    path: '/pricing',
    title: 'Pricing | Prangan One',
    description: 'Society maintenance software pricing: 90 days free, no card needed. After that, ₹10 per flat per month, ₹499 minimum per society. No online payment gateway needed to start.',
  },
  {
    path: '/faq',
    title: 'FAQ | Prangan One',
    description: 'Real answers to the questions a committee actually has before switching.',
  },
  {
    path: '/contact',
    title: 'Contact | Prangan One',
    description: 'Request a society setup, or ask a question. We respond directly, no ticket queue.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Prangan One',
    description: 'What data Prangan One collects, how it is protected, and what control you have over it.',
  },
  {
    path: '/terms',
    title: 'Terms of Service | Prangan One',
    description: 'The plain-language terms for using Prangan One.',
  },
]
