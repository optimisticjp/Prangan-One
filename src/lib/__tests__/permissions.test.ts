import { describe, it, expect } from 'vitest'
import { canAccessArea, canCancelReceipt, canManageBilling, canSeeDoc, roleHomeRoute, roleLabel } from '../permissions'

describe('treasurer capabilities', () => {
  it('can manage billing, same as society_admin, unlike plain accountant', () => {
    expect(canManageBilling('treasurer')).toBe(true)
    expect(canManageBilling('accountant')).toBe(false)
  })

  it('can cancel receipts, same as society_admin, unlike plain accountant', () => {
    expect(canCancelReceipt('treasurer')).toBe(true)
    expect(canCancelReceipt('society_admin')).toBe(true)
    expect(canCancelReceipt('accountant')).toBe(false)
    expect(canCancelReceipt('committee_member')).toBe(false)
  })

  it('can access the accounts panel, alongside accountant', () => {
    expect(canAccessArea('treasurer', 'accountsPanel')).toBe(true)
    expect(canAccessArea('accountant', 'accountsPanel')).toBe(true)
  })

  it('cannot access the owner console', () => {
    expect(canAccessArea('treasurer', 'ownerConsole')).toBe(false)
  })

  it('lands on /accounts on real login, same as accountant', () => {
    expect(roleHomeRoute.treasurer).toBe('/accounts')
    expect(roleHomeRoute.accountant).toBe('/accounts')
  })

  it('sees accountant-level documents, same as a real accountant would', () => {
    expect(canSeeDoc('treasurer', 'accountant')).toBe(true)
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
