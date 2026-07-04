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
  it('auto-confirms when the phone matches what is on file for that flat', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'rajhans24', // lowercase on purpose, should still match
        flatNumber: '101',
        name: 'Test Resident',
        phone: '+91 90000 00010', // matches flat_101 exactly
        email: 'newresident@example.com',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
    const mem = result.current.db.memberships.find(m => m.email === 'newresident@example.com')
    expect(mem?.status).toBe('active')
    expect(mem?.role).toBe('resident_owner')
    expect(mem?.flatId).toBe('flat_101')
  })

  it('matches the phone regardless of spacing/formatting differences', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '102', name: 'Test', phone: '9000000011', // no +91, no spaces
        email: 'differentformat@example.com',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
  })

  it('creates a pending membership when the phone does not match', () => {
    const result = setup()
    let outcome
    act(() => {
      outcome = result.current.selfEnrollResident({
        joinCode: 'RAJHANS24', flatNumber: '103', name: 'Someone New', phone: '9999999999',
        email: 'mismatch@example.com',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'pending' })
    const mem = result.current.db.memberships.find(m => m.email === 'mismatch@example.com')
    expect(mem?.status).toBe('pending')
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
        joinCode: 'RAJHANS24', flatNumber: '201', name: 'X', phone: '9000000014', email: 'tenant@example.com',
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
        joinCode: 'RAJHANS24', flatNumber: '101', name: 'X', phone: '9000000010', email: 'owner-ok@example.com',
      })
    })
    expect(outcome).toEqual({ ok: true, status: 'active' })
  })
})

describe('approveMembership / rejectMembership', () => {
  it('approve flips a pending membership to active', () => {
    const result = setup()
    let outcome: any
    act(() => {
      outcome = result.current.selfEnrollResident({
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
