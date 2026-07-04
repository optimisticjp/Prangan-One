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
import type { Society, SubscriptionStatus } from './types'

export const GRACE_PERIOD_DAYS = 14

/** Whether `graceStartedAt` (an ISO date string) is more than 14 days in the past, as of `now`. */
export function isGraceExpired(graceStartedAt: string, now: Date = new Date()): boolean {
  const started = new Date(graceStartedAt)
  const elapsedMs = now.getTime() - started.getTime()
  return elapsedMs > GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
}

/**
 * The status to actually use for write-guard and banner decisions. Usually
 * the same as society.subscriptionStatus, except grace that's run past 14
 * days reads as paused, computed on the fly, nothing to keep in sync.
 */
export function effectiveStatus(society: Pick<Society, 'subscriptionStatus' | 'graceStartedAt'>, now: Date = new Date()): SubscriptionStatus {
  if (society.subscriptionStatus === 'grace' && society.graceStartedAt && isGraceExpired(society.graceStartedAt, now)) {
    return 'paused'
  }
  return society.subscriptionStatus
}

/** Can this society accept a normal write (record a payment, file a complaint, etc) right now? */
export function canWrite(society: Pick<Society, 'subscriptionStatus' | 'graceStartedAt'>, now: Date = new Date()): boolean {
  const status = effectiveStatus(society, now)
  return status === 'trial' || status === 'active' || status === 'grace'
}

/** Days remaining in the grace window, 0 if already expired or not in grace. Used for admin banner copy. */
export function graceDaysRemaining(society: Pick<Society, 'subscriptionStatus' | 'graceStartedAt'>, now: Date = new Date()): number {
  if (society.subscriptionStatus !== 'grace' || !society.graceStartedAt) return 0
  const started = new Date(society.graceStartedAt)
  const elapsedDays = (now.getTime() - started.getTime()) / (24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil(GRACE_PERIOD_DAYS - elapsedDays))
}

/** Banner copy for a given status, shown to admins (grace + paused) vs residents (paused only). */
export function statusBanner(society: Pick<Society, 'subscriptionStatus' | 'graceStartedAt'>, audience: 'admin' | 'resident', now: Date = new Date()): string | null {
  const status = effectiveStatus(society, now)
  if (status === 'grace' && audience === 'admin') {
    const days = graceDaysRemaining(society, now)
    return `સબ્સ્ક્રિપ્શન બાકી છે. ${days} દિવસમાં સેવા બંધ થઈ શકે. care@pranganone.com પર સંપર્ક કરો.`
  }
  if (status === 'paused') {
    return audience === 'admin'
      ? 'સેવા થોભાવેલી છે. ફરી શરૂ કરવા care@pranganone.com પર સંપર્ક કરો.'
      : 'સેવા હાલમાં થોભાવેલી છે. નવી પ્રવૃત્તિ માટે Prangan One નો સંપર્ક કરો.'
  }
  return null
}
