/**
 * Real Supabase client. Exported as `supabase`, which is `null` until
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are both set in .env - see
 * supabase/README.md for how to get those values from a real project.
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
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!url && !!anonKey

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey)
  : null

if (!supabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('[Prangan One] Supabase not configured (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY unset). Running on the local data layer. See supabase/README.md.')
}
