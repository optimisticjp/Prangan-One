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

/**
 * Google sign-in, added after email magic-link login had already been
 * proven working end to end against a real, live project - deliberately
 * not built alongside it, since stacking a second unverified external
 * integration on top of the first would have made it harder to tell
 * which one broke if something didn't work. Lands on the exact same
 * /auth/callback resolution as the email path (see AuthCallback.tsx) -
 * how someone authenticated never changes what happens next, only that
 * they're now a real, verified Supabase user with an email Prangan One
 * can match against real memberships the same way either path works.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' },
  })
  if (error) throw error
}

/**
 * Password sign-in, added alongside magic link and Google as a genuine
 * third option, not a replacement for either - some people specifically
 * want a password rather than waiting on an email or having a Google
 * account. Unlike magic link and Google, this returns an authenticated
 * session immediately, no redirect involved - so Login.tsx sends the
 * person to /auth/callback itself right after this succeeds, reusing
 * the exact same membership-claiming resolution every other login path
 * already goes through, rather than duplicating that logic here.
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Sets or changes a password for whoever is currently authenticated -
 * only meaningful for someone already logged in via magic link or
 * Google, since a brand-new person has no Supabase account yet to set a
 * password on. This is deliberately the only way a password gets
 * created in this app: nobody signs up with a password cold, they
 * verify who they are the usual way at least once, then can opt into a
 * password for faster login next time. Supabase's own minimum length
 * (6 characters by default) is enforced server-side regardless of what
 * the UI asks for.
 */
export async function setPasswordForCurrentUser(password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/**
 * Forgot-password flow: sends a reset link to the given email, landing
 * on /auth/reset-password (a dedicated page, not /auth/callback -
 * Supabase's recovery link authenticates the person temporarily
 * specifically to set a new password, which is a different intent than
 * a normal login even though both start with clicking a link in an
 * email).
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/auth/reset-password',
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

export interface PublicSocietyProfile {
  societyId: string; name: string; nameEn: string; address: string; city: string; area: string; themeKey: string; logoUrl: string | null
}

/**
 * The real, Supabase-backed version of ShareLink.tsx's society lookup by
 * slug (the local demo layer's findSocietyBySlug in store.tsx does the
 * same thing against localStorage). Calls find_society_public_profile,
 * the narrow database function built specifically for this - societies
 * isn't a table a visitor who isn't a member yet can read directly, see
 * that function's own comment in supabase/schema.sql for exactly why.
 * Returns null for an unknown slug, same as the local version, so
 * ShareLink.tsx's "link not found" state works identically either way.
 */
export async function findSocietyPublicProfile(slug: string): Promise<PublicSocietyProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('find_society_public_profile', { target_slug: slug.trim() }).maybeSingle()
  if (error || !data) return null
  const row = data as { society_id: string; name: string; name_en: string; address: string; city: string; area: string; theme_key: string; logo_url: string | null }
  return {
    societyId: row.society_id, name: row.name, nameEn: row.name_en,
    address: row.address, city: row.city, area: row.area, themeKey: row.theme_key, logoUrl: row.logo_url,
  }
}

export interface ClaimedMembership {
  // null specifically for a platform owner - see the memberships_society_id_owner_check
  // constraint in supabase/schema.sql, an owner isn't scoped to one society.
  membershipId: string; societyId: string | null; societyName: string; role: string; flatId: string | null
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

  const { error: claimError } = await supabase
    .from('memberships')
    .update({ user_id: userId })
    .is('user_id', null)
    .eq('email', email.toLowerCase())
    .eq('status', 'active') // a pending self-enrollment isn't claimable until a committee member approves it

  // Not checking this before was a real bug: a genuine failure here (as
  // opposed to a legitimate "nothing to claim") silently fell through to
  // the exact same "no membership found" result below, with no way to
  // tell the two apart from the outside.
  if (claimError) throw claimError

  const { data, error } = await supabase
    .from('memberships')
    .select('id, society_id, role, flat_id, societies:society_id (name_en)')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw error
  return (data ?? []).map(m => ({
    membershipId: m.id, societyId: m.society_id, role: m.role, flatId: m.flat_id,
    societyName: m.society_id
      ? ((m.societies as unknown as { name_en: string } | null)?.name_en ?? m.society_id)
      : 'Prangan One ઓનર કન્સોલ', // a global owner row has no society to join against
  }))
}

export interface JoinRequestInput { joinCode: string; flatNumber: string; name: string; phone: string; email: string }
export type JoinRequestResult =
  | { ok: true; status: 'active' | 'pending' }
  | { ok: false; error: 'society_not_found' | 'flat_not_found' | 'already_enrolled' | 'unknown' }

/**
 * The real, Supabase-backed version of resident self-enrollment (the
 * local demo layer's selfEnrollResident in store.tsx has the same
 * matching logic, but that one only ever touches localStorage). Calls
 * submit_join_request, a single consolidated database function -
 * doing this as separate lookup + insert + read-back calls from the
 * client hits a real wall: an anonymous self-enrollment can never read
 * memberships back afterward (memberships_select requires already being
 * a society member), so the database function does the whole thing with
 * its own elevated internal privileges and just returns the resulting
 * status string. See submit_join_request in supabase/schema.sql for the
 * actual logic - this function's job is just to call it and translate
 * whatever comes back into the error codes Join.tsx already knows how
 * to show. Note this does NOT decide active-vs-pending, or even pick
 * which resident role to use - the database's enforce_membership_insert
 * trigger derives both from the flat's actual on-file record, since the
 * client has no way to know a flat's real occupancy and should not be
 * trusted to decide its own access level regardless.
 */
export async function submitJoinRequest(input: JoinRequestInput): Promise<JoinRequestResult> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase.rpc('submit_join_request', {
    target_join_code: input.joinCode.trim(),
    target_flat_number: input.flatNumber.trim(),
    given_name: input.name.trim(),
    given_phone: input.phone.trim(),
    given_email: input.email.trim().toLowerCase(),
  })

  if (error) {
    if (error.message?.includes('society_not_found')) return { ok: false, error: 'society_not_found' }
    if (error.message?.includes('flat_not_found')) return { ok: false, error: 'flat_not_found' }
    if (error.code === '23505') return { ok: false, error: 'already_enrolled' } // unique(society_id, email)
    return { ok: false, error: 'unknown' } // covers e.g. the trigger's own "tenant access is disabled" exception
  }
  return { ok: true, status: data as 'active' | 'pending' }
}
