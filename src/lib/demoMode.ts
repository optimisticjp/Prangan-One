/**
 * Whether the /demo page's role shortcuts (resident/admin/accountant
 * buttons that log in with no password) are reachable at all. The owner role
 * was removed from the public demo, so it is deliberately not in that list.
 * Split into
 * its own module, separate from Demo.tsx, specifically so tests can mock
 * just this one function (see src/pages/__tests__/Demo.test.tsx) instead
 * of needing to reset and re-import the entire app's module graph to make
 * a module-level env-derived constant re-evaluate.
 *
 * Defaults on in local dev (import.meta.env.DEV, set automatically by
 * `vite`/`vite build --mode development`) so `npm run dev` still works
 * with no setup, and off in a real production build unless
 * VITE_DEMO_MODE=true is explicitly set, e.g. for a sales-demo Cloudflare
 * Pages branch deploy kept separate from the real production deployment
 * for an actual paying society. The real /login screen never shows these
 * shortcuts regardless of this flag, they only ever live on /demo.
 */
export function isDemoModeEnabled(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.DEV
}
