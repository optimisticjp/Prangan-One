// Subscription lifecycle write-guard. Pure functions on purpose: this is
// exactly the kind of logic that should be unit-tested directly, no
// database needed. See src/lib/subscription.test.ts.
//
// The write-guard rule (from the Prangan One roadmap, section 5):
// trial, active, and grace all allow writes. paused and archived don't.
// Grace differs from active only in the banner it shows admins.
//
// The 14-day grace window is NOT a scheduled job. There is no cron here
// and none is needed: grace expiry is computed at read/write-check time
// from graceStartedAt, the same pattern billStatus() already uses to
// compute "overdue" from a due date rather than storing a redundant flag.
// This is simpler, needs no infrastructure, and can't silently fail to
// run the way a missed cron tick could.
//
// The 90-day trial follows the exact same principle, computed from
// trialStartedAt rather than a scheduled job. trialStartedAt is set once,
// when a society is actually activated and ready to use - never at lead
// submission, never at the moment an empty society record is created, see
// the roadmap's explicit requirement on this. When a trial's 90 days run
// out, the society doesn't drop straight to paused - it gets the same
// 14-day grace window as a lapsed paying subscription, computed the same
// way, just anchored to when the TRIAL ended instead of an explicit
// graceStartedAt write.
import type { Society, SubscriptionStatus } from './types'

export const GRACE_PERIOD_DAYS = 14
export const TRIAL_PERIOD_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

/** Whether `graceStartedAt` (an ISO date string) is more than 14 days in the past, as of `now`. */
export function isGraceExpired(graceStartedAt: string, now: Date = new Date()): boolean {
  const started = new Date(graceStartedAt)
  const elapsedMs = now.getTime() - started.getTime()
  return elapsedMs > GRACE_PERIOD_DAYS * DAY_MS
}

/** Whether `trialStartedAt` is more than 90 days in the past, as of `now`. */
export function isTrialExpired(trialStartedAt: string, now: Date = new Date()): boolean {
  const started = new Date(trialStartedAt)
  return now.getTime() - started.getTime() > TRIAL_PERIOD_DAYS * DAY_MS
}

type SocietyLifecycle = Pick<Society, 'subscriptionStatus' | 'graceStartedAt' | 'trialStartedAt'>

/**
 * The status to actually use for write-guard and banner decisions. Usually
 * the same as society.subscriptionStatus, with two computed exceptions:
 *   - grace that's run past 14 days reads as paused
 *   - trial that's run past 90 days reads as grace (or paused, if even
 *     the resulting 14-day grace window has also since elapsed) - a
 *     lapsed trial gets exactly the same soft landing as a lapsed paid
 *     subscription, not an immediate cutoff
 * All computed on the fly from stored start dates, nothing to keep in sync.
 */
export function effectiveStatus(society: SocietyLifecycle, now: Date = new Date()): SubscriptionStatus {
  if (society.subscriptionStatus === 'trial' && society.trialStartedAt && isTrialExpired(society.trialStartedAt, now)) {
    const trialEndedAt = new Date(society.trialStartedAt).getTime() + TRIAL_PERIOD_DAYS * DAY_MS
    const daysSinceTrialEnded = (now.getTime() - trialEndedAt) / DAY_MS
    return daysSinceTrialEnded > GRACE_PERIOD_DAYS ? 'paused' : 'grace'
  }
  if (society.subscriptionStatus === 'grace' && society.graceStartedAt && isGraceExpired(society.graceStartedAt, now)) {
    return 'paused'
  }
  return society.subscriptionStatus
}

/** Can this society accept a normal write (record a payment, file a complaint, etc) right now? */
export function canWrite(society: SocietyLifecycle, now: Date = new Date()): boolean {
  const status = effectiveStatus(society, now)
  return status === 'trial' || status === 'active' || status === 'grace'
}

/** Days remaining in the free trial, 0 if not in trial or already expired. Used for the owner's trial-health view and admin banner copy. */
export function trialDaysRemaining(society: SocietyLifecycle, now: Date = new Date()): number {
  if (society.subscriptionStatus !== 'trial' || !society.trialStartedAt) return 0
  const started = new Date(society.trialStartedAt)
  const elapsedDays = (now.getTime() - started.getTime()) / DAY_MS
  return Math.max(0, Math.ceil(TRIAL_PERIOD_DAYS - elapsedDays))
}

/** Days remaining in the grace window, 0 if already expired or not in grace. Used for admin banner copy. */
export function graceDaysRemaining(society: SocietyLifecycle, now: Date = new Date()): number {
  if (society.subscriptionStatus !== 'grace' || !society.graceStartedAt) return 0
  const started = new Date(society.graceStartedAt)
  const elapsedDays = (now.getTime() - started.getTime()) / DAY_MS
  return Math.max(0, Math.ceil(GRACE_PERIOD_DAYS - elapsedDays))
}

/** Banner copy for a given status, shown to admins (trial + grace + paused) vs residents (paused only). */
export function statusBanner(society: SocietyLifecycle, audience: 'admin' | 'resident', now: Date = new Date()): string | null {
  const status = effectiveStatus(society, now)
  if (status === 'trial' && audience === 'admin' && society.trialStartedAt) {
    const days = trialDaysRemaining(society, now)
    if (days <= 10) {
      return `તમારો ફ્રી ટ્રાયલ ${days} દિવસમાં પૂરો થાય છે. ચાલુ રાખવા care@pranganone.com પર સંપર્ક કરો.`
    }
  }
  if (status === 'grace' && audience === 'admin') {
    const days = society.subscriptionStatus === 'trial' ? 0 : graceDaysRemaining(society, now)
    return society.subscriptionStatus === 'trial'
      ? 'તમારો ફ્રી ટ્રાયલ પૂરો થયો છે. સેવા ચાલુ રાખવા care@pranganone.com પર સંપર્ક કરો.'
      : `સબ્સ્ક્રિપ્શન બાકી છે. ${days} દિવસમાં સેવા બંધ થઈ શકે. care@pranganone.com પર સંપર્ક કરો.`
  }
  if (status === 'paused') {
    return audience === 'admin'
      ? 'સેવા થોભાવેલી છે. ફરી શરૂ કરવા care@pranganone.com પર સંપર્ક કરો.'
      : 'સેવા હાલમાં થોભાવેલી છે. નવી પ્રવૃત્તિ માટે પ્રાંગણવનનો સંપર્ક કરો.'
  }
  return null
}
