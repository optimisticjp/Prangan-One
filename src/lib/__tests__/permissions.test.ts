import { describe, it, expect } from 'vitest'
import { canAccessArea, canCancelReceipt, canManageBilling, canSeeDoc, roleHomeRoute, roleLabel } from '../permissions'

describe('accountant capabilities (absorbed the old treasurer role)', () => {
  it('can manage billing, same as society_admin', () => {
    expect(canManageBilling('accountant')).toBe(true)
  })

  it('can cancel receipts, same as society_admin', () => {
    expect(canCancelReceipt('accountant')).toBe(true)
    expect(canCancelReceipt('society_admin')).toBe(true)
    expect(canCancelReceipt('committee_member')).toBe(false)
  })

  it('can access the accounts panel', () => {
    expect(canAccessArea('accountant', 'accountsPanel')).toBe(true)
  })

  it('cannot access the owner console', () => {
    expect(canAccessArea('accountant', 'ownerConsole')).toBe(false)
  })

  it('lands on /accounts on real login', () => {
    expect(roleHomeRoute.accountant).toBe('/accounts')
  })

  it('sees accountant-level documents', () => {
    expect(canSeeDoc('accountant', 'accountant')).toBe(true)
  })
})

describe('the auditor rename (previously "viewer")', () => {
  it('has a real label, not a leftover generic one', () => {
    expect(roleLabel.auditor).toContain('ઓડિટર')
  })

  it('can access the admin panel to read permitted records', () => {
    expect(canAccessArea('auditor', 'adminPanel')).toBe(true)
  })

  it('cannot manage billing or cancel receipts - read-only means read-only', () => {
    expect(canManageBilling('auditor')).toBe(false)
    expect(canCancelReceipt('auditor')).toBe(false)
  })
})
