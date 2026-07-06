import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DataProvider, useData } from '../store'

function setup() {
  const { result } = renderHook(() => useData(), { wrapper: DataProvider })
  return result
}

afterEach(() => {
  localStorage.clear()
})

describe('selfEnrollResident', () => {
  it('auto-confirms when the email matches what is on file for that flat', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'rajhans24', // lowercase on purpose, should still match
        flatNumber: '101',
        name: 'Test Resident',
        phone: '9000000000', // deliberately does NOT match the flat's phone - shouldn't matter anymore
        email: 'alpeshbhai@example.com', // matches flat_101's seeded email exactly
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
    const mem = result.current.db.memberships.find(m => m.email === 'alpeshbhai@example.com')
    expect(mem?.status).toBe('active')
    expect(mem?.role).toBe('resident_owner')
    expect(mem?.flatId).toBe('flat_101')
  })

  it('matches the email regardless of case', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '101', name: 'Test', phone: '0000000000',
        email: 'ALPESHBHAI@EXAMPLE.COM',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
  })

  it('security: knowing the resident\'s real phone number is NOT enough for instant access - matching must be on email', () => {
    // This is the exact attack the phone-only version of this check was
    // vulnerable to: a phone number isn't a secret (a neighbour, a
    // former tenant, anyone who's seen a WhatsApp group could know it).
    // If phone alone granted access, an attacker could enter their OWN
    // email alongside a real resident's known phone number and get an
    // active membership, with the real login link going to the
    // attacker's inbox instead of the actual resident's.
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '101', name: 'Attacker',
        phone: '+91 90000 00010', // flat_101's real phone number, correctly known
        email: 'attacker@evil.com', // NOT the email on file for flat_101
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'pending' })
    const mem = result.current.db.memberships.find(m => m.email === 'attacker@evil.com')
    expect(mem?.status).toBe('pending') // never active just because the phone matched
  })

  it('creates a pending membership when there is no email on file to match against at all', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '103', name: 'Someone New', phone: '9999999999',
        email: 'mismatch@example.com', // flat_103 has no email on file in the seed data
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'pending' })
    const mem = result.current.db.memberships.find(m => m.email === 'mismatch@example.com')
    expect(mem?.status).toBe('pending')
  })

  it('matches a tenant against tenantEmail specifically, not the owner\'s email', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        // flat_201 is tenant-occupied with a seeded tenantEmail
        joinCode: 'RAJHANS24', flatNumber: '201', name: 'Tenant', phone: '0000000000',
        email: 'vipulbhai@example.com',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
    const mem = result.current.db.memberships.find(m => m.email === 'vipulbhai@example.com')
    expect(mem?.role).toBe('resident_tenant')
  })

  it('rejects an unknown join code', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'NOTAREALCODE', flatNumber: '101', name: 'X', phone: '9000000010', email: 'x@example.com',
      })
    })
    expect(outcome).toEqual({ ok: false, error: 'society_not_found' })
  })

  it('rejects an unknown flat number within a real society', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '9999', name: 'X', phone: '9000000010', email: 'x@example.com',
      })
    })
    expect(outcome).toEqual({ ok: false, error: 'flat_not_found' })
  })

  it('rejects a duplicate enrollment for the same email in the same society', () => {
    const result = setup()
    act(() => {
      result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '101', name: 'X', phone: '9000000010', email: 'dup@example.com',
      })
    })
    let second
    act(() => {
      second = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '102', name: 'X', phone: '9000000011', email: 'dup@example.com',
      })
    })
    expect(second).toEqual({ ok: false, error: 'already_enrolled' })
  })

  it('blocks a tenant from self-enrolling when the society has tenant access disabled', () => {
    const result = setup()
    act(() => {
      result.current.enterSociety('soc_rajhans', 'owner')
      result.current.updateSociety({ tenantAccess: 'disabled' })
    })
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        // flat_201 is tenant-occupied in the seed data
        joinCode: 'RAJHANS24', flatNumber: '201', name: 'X', phone: '9000000014', email: 'vipulbhai@example.com',
      })
    })
    expect(outcome).toEqual({ ok: false, error: 'tenant_access_disabled' })
  })

  it('still allows an owner-occupied flat in the same society even when tenant access is disabled', () => {
    const result = setup()
    act(() => {
      result.current.enterSociety('soc_rajhans', 'owner')
      result.current.updateSociety({ tenantAccess: 'disabled' })
    })
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '101', name: 'X', phone: '9000000010', email: 'alpeshbhai@example.com',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
  })
})

describe('approveMembership / rejectMembership', () => {
  it('approve flips a pending membership to active', () => {
    const result = setup()
    act(() => {
      result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '103', name: 'X', phone: '0000000000', email: 'pending1@example.com',
      })
    })
    const mem = result.current.db.memberships.find(m => m.email === 'pending1@example.com')!
    expect(mem.status).toBe('pending')
    act(() => { result.current.approveMembership(mem.id) })
    const updated = result.current.db.memberships.find(m => m.id === mem.id)
    expect(updated?.status).toBe('active')
  })

  it('reject removes the pending membership outright', () => {
    const result = setup()
    act(() => {
      result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '103', name: 'X', phone: '0000000000', email: 'pending2@example.com',
      })
    })
    const mem = result.current.db.memberships.find(m => m.email === 'pending2@example.com')!
    act(() => { result.current.rejectMembership(mem.id) })
    expect(result.current.db.memberships.find(m => m.id === mem.id)).toBeUndefined()
  })
})

describe('logUnmatchedLoginAttempt', () => {
  it('records the email and timestamp, most recent first', () => {
    const result = setup()
    act(() => {
      result.current.logUnmatchedLoginAttempt('first@example.com')
      result.current.logUnmatchedLoginAttempt('SECOND@Example.com') // mixed case on purpose
    })
    expect(result.current.db.unmatchedLoginAttempts[0].email).toBe('second@example.com')
    expect(result.current.db.unmatchedLoginAttempts[1].email).toBe('first@example.com')
  })
})

describe('findSocietyByJoinCode', () => {
  it('finds a society case-insensitively', () => {
    const result = setup()
    expect(result.current.findSocietyByJoinCode('rajhans24')?.id).toBe('soc_rajhans')
    expect(result.current.findSocietyByJoinCode('RAJHANS24')?.id).toBe('soc_rajhans')
    expect(result.current.findSocietyByJoinCode('nope')).toBeUndefined()
  })
})
