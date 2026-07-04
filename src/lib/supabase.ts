/**
 * Real Supabase client. Exported as `supabase`, which is `null` until
 * VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are both set in
 * .env - see supabase/README.md for how to get those values from a real
 * project.
 *
 * "Publishable key" is Supabase's current name for what used to be
 * called the "anon key" (legacy anon/service_role keys are being phased
 * out through 2026, see supabase.com/docs/guides/getting-started/api-keys).
 * Same purpose either way: safe to ship in client code, protected by Row
 * Level Security rather than secrecy. VITE_SUPABASE_ANON_KEY is accepted
 * too, as a fallback, in case a project or a doc reference still uses the
 * older name. Never put a "secret" or "service_role" key here, those are
 * a different, backend-only credential and must not ship to the browser.
 *
 * This null-until-configured pattern is deliberate, not a demo shortcut:
 * it lets every other piece of this codebase (auth.ts, the data adapters
 * in src/lib/data/) import this file unconditionally and check `if
 * (supabase)` before using it, rather than crashing at import time in any
 * environment that doesn't have credentials yet, including this sandbox,
 * where there are genuinely no credentials to test against. The moment
 * real credentials exist, this starts returning a real, working client
 * with no code change needed anywhere that imports it.
 */
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!url && !!publishableKey

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, publishableKey)
  : null

if (!supabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('[Prangan One] Supabase not configured (VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY unset). Running on the local data layer. See supabase/README.md.')
}
