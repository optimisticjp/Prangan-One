/**
 * Real email magic-link auth against Supabase. Every function here does
 * the real thing when `supabase` is configured (see supabase.ts) and
 * throws a clear error otherwise - callers (Login.tsx) check
 * `supabaseConfigured` first and fall back to the local demo flow, so
 * this module itself never needs to know about the fallback.
 *
 * The membership-claim step (matching a freshly authenticated email to a
 * pending Membership row and attaching the real user id) is modeled here
 * as `claimMembership`, written against the schema in supabase/schema.sql.
 * It's real, callable code - it just has nothing to call against until a
 * live project exists.
 */
import { supabase } from './supabase'

export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/auth/callback' },
  })
  if (error) throw error
}

export async function getCurrentAuthUser() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export interface ClaimedMembership {
  membershipId: string; societyId: string; societyName: string; role: string; flatId: string | null
}

/**
 * Matches the given authenticated user's email against pending
 * memberships (rows with user_id still null) and attaches the real user
 * id to each match, then returns every membership now associated with
 * this user (could be more than one, if the same email is on the
 * committee for two societies - the login flow shows a picker in that case).
 */
export async function claimMemberships(userId: string, email: string): Promise<ClaimedMembership[]> {
  if (!supabase) throw new Error('Supabase not configured')

  await supabase
    .from('memberships')
    .update({ user_id: userId })
    .is('user_id', null)
    .eq('email', email.toLowerCase())
    .eq('status', 'active') // a pending self-enrollment isn't claimable until a committee member approves it

  const { data, error } = await supabase
    .from('memberships')
    .select('id, society_id, role, flat_id, societies:society_id (name_en)')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw error
  return (data ?? []).map(m => ({
    membershipId: m.id, societyId: m.society_id, role: m.role, flatId: m.flat_id,
    societyName: (m.societies as unknown as { name_en: string } | null)?.name_en ?? m.society_id,
  }))
}
