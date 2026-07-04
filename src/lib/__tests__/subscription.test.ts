import { describe, it, expect } from 'vitest'
import { canWrite, effectiveStatus, graceDaysRemaining, isGraceExpired, statusBanner } from '../subscription'

const base = { subscriptionStatus: 'active' as const, graceStartedAt: undefined as string | undefined }

describe('canWrite', () => {
  it('allows writes for trial, active, and grace', () => {
    expect(canWrite({ ...base, subscriptionStatus: 'trial' })).toBe(true)
    expect(canWrite({ ...base, subscriptionStatus: 'active' })).toBe(true)
    expect(canWrite({ ...base, subscriptionStatus: 'grace', graceStartedAt: new Date().toISOString() })).toBe(true)
  })

  it('blocks writes for paused and archived', () => {
    expect(canWrite({ ...base, subscriptionStatus: 'paused' })).toBe(false)
    expect(canWrite({ ...base, subscriptionStatus: 'archived' })).toBe(false)
  })

  it('blocks writes once grace has run past 14 days, even though the stored status still says grace', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    expect(canWrite({ subscriptionStatus: 'grace', graceStartedAt: fifteenDaysAgo })).toBe(false)
  })

  it('still allows writes at exactly day 13 of grace', () => {
    const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
    expect(canWrite({ subscriptionStatus: 'grace', graceStartedAt: thirteenDaysAgo })).toBe(true)
  })
})

describe('isGraceExpired', () => {
  it('is false right when grace starts', () => {
    expect(isGraceExpired(new Date().toISOString())).toBe(false)
  })
  it('is true after 14 days and 1 second', () => {
    const past = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000 + 1000)).toISOString()
    expect(isGraceExpired(past)).toBe(true)
  })
})

describe('effectiveStatus', () => {
  it('reads expired grace as paused', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    expect(effectiveStatus({ subscriptionStatus: 'grace', graceStartedAt: fifteenDaysAgo })).toBe('paused')
  })
  it('passes through any non-grace status unchanged', () => {
    expect(effectiveStatus({ subscriptionStatus: 'active', graceStartedAt: undefined })).toBe('active')
    expect(effectiveStatus({ subscriptionStatus: 'archived', graceStartedAt: undefined })).toBe('archived')
  })
})

describe('graceDaysRemaining', () => {
  it('counts down from 14', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(graceDaysRemaining({ subscriptionStatus: 'grace', graceStartedAt: twoDaysAgo })).toBe(12)
  })
  it('floors at 0, never negative', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(graceDaysRemaining({ subscriptionStatus: 'grace', graceStartedAt: thirtyDaysAgo })).toBe(0)
  })
  it('is 0 for a society that is not in grace at all', () => {
    expect(graceDaysRemaining({ subscriptionStatus: 'active', graceStartedAt: undefined })).toBe(0)
  })
})

describe('statusBanner', () => {
  it('shows admins a grace warning but shows residents nothing during grace', () => {
    const soc = { subscriptionStatus: 'grace' as const, graceStartedAt: new Date().toISOString() }
    expect(statusBanner(soc, 'admin')).toContain('care@pranganone.com')
    expect(statusBanner(soc, 'resident')).toBeNull()
  })
  it('shows both admins and residents a message when paused, but with different tone', () => {
    const soc = { subscriptionStatus: 'paused' as const, graceStartedAt: undefined }
    const adminMsg = statusBanner(soc, 'admin')
    const residentMsg = statusBanner(soc, 'resident')
    expect(adminMsg).not.toBeNull()
    expect(residentMsg).not.toBeNull()
    expect(adminMsg).not.toBe(residentMsg)
  })
  it('shows nothing during active or trial', () => {
    expect(statusBanner({ subscriptionStatus: 'active', graceStartedAt: undefined }, 'admin')).toBeNull()
    expect(statusBanner({ subscriptionStatus: 'trial', graceStartedAt: undefined }, 'resident')).toBeNull()
  })
})
