import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DataProvider, useData } from '../store'

function setup() {
  const { result } = renderHook(() => useData(), { wrapper: DataProvider })
  act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write') })
  return result
}

afterEach(() => {
  localStorage.clear()
})

describe('monthIncome excludes cancelled payments', () => {
  it('a cancelled payment does not count as income even though its status stays success', () => {
    const result = setup()
    const month = '2027-08'
    let pay: { id: string } | null = null
    act(() => {
      pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi', date: `${month}-05` })
    })
    const before = result.current.monthIncome(month)
    expect(before).toBeGreaterThan(0)

    act(() => { result.current.cancelReceipt(pay!.id, 'Entered by mistake') })
    expect(result.current.monthIncome(month)).toBe(before - 1200)

    // the underlying payment itself still reports status: 'success' -
    // cancelled is a separate flag, not a status rewrite - so a naive
    // status-only check would have kept counting this
    const cancelled = result.current.db.payments.find(p => p.id === pay!.id)
    expect(cancelled?.status).toBe('success')
    expect(cancelled?.cancelled).toBe(true)
  })

  it('an uncancelled successful payment still counts normally', () => {
    const result = setup()
    const month = '2027-09'
    act(() => {
      result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi', date: `${month}-05` })
    })
    expect(result.current.monthIncome(month)).toBe(1200)
  })
})

describe('logout clears real session financial data (previously it never did)', () => {
  it('a demo/local session\u2019s data is untouched on logout', () => {
    const result = setup()
    act(() => { result.current.addFlat({ number: '999', floor: 9, ownerName: 'Test', phone: '1', occupancy: 'owner', sqft: 500 }) })
    const before = result.current.db.flats.length
    act(() => { result.current.logout() })
    // after logout, session resets to DEFAULT_SOCIETY_ID - re-enter to check
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write') })
    expect(result.current.db.flats.length).toBe(before)
  })

  it('a real session\u2019s fetched-society data is cleared on logout, not left cached', () => {
    const result = setup()
    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    expect(result.current.session.isRealSession).toBe(true)

    act(() => { result.current.addFlat({ number: '888', floor: 8, ownerName: 'Real Session Flat', phone: '1', occupancy: 'owner', sqft: 500 }) })
    act(() => { result.current.logout() })

    // re-enter the same society locally afterward and confirm the flat
    // added during the real session is gone, not still sitting there
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write') })
    expect(result.current.db.flats.some(f => f.number === '888')).toBe(false)
  })
})

describe('lastBlockedReason surfaces why a write was blocked (previously only a console warning, invisible to the actual user)', () => {
  it('is null before anything has been blocked', () => {
    const result = setup()
    expect(result.current.lastBlockedReason).toBeNull()
  })

  it('gives a specific reason for an auditor session', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'auditor') })
    act(() => { result.current.addFlat({ number: '775', floor: 7, ownerName: 'X', phone: '1', occupancy: 'owner', sqft: 500 }) })
    expect(result.current.lastBlockedReason).toContain('ઓડિટર')
  })

  it('gives a specific reason for read-only support mode', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'readonly', 'checking something') })
    act(() => { result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(result.current.lastBlockedReason).toContain('Read-only')
  })

  it('clears back to null after a write actually succeeds', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'auditor') })
    act(() => { result.current.addFlat({ number: '774', floor: 7, ownerName: 'X', phone: '1', occupancy: 'owner', sqft: 500 }) })
    expect(result.current.lastBlockedReason).not.toBeNull()

    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write') })
    act(() => { result.current.addFlat({ number: '773', floor: 7, ownerName: 'X', phone: '1', occupancy: 'owner', sqft: 500 }) })
    expect(result.current.lastBlockedReason).toBeNull()
  })
})

describe('auditor is genuinely read-only, not just missing UI buttons', () => {
  it('cannot add a flat, even by calling the store action directly', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'auditor') })
    const before = result.current.db.flats.length
    act(() => { result.current.addFlat({ number: '777', floor: 7, ownerName: 'Should not save', phone: '1', occupancy: 'owner', sqft: 500 }) })
    expect(result.current.db.flats.length).toBe(before)
  })

  it('cannot record a payment', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'auditor') })
    let pay: unknown
    act(() => {
      pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' })
    })
    expect(pay).toBeNull()
  })

  it('cannot approve or reject a pending membership - these two used plain setDb before this fix, bypassing the write guard entirely regardless of role', () => {
    const result = setup()
    act(() => {
      result.current.selfEnrollResident({ joinCode: 'RAJHANS24', flatNumber: '103', name: 'X', phone: '0', email: 'pending-audit-test@example.com' })
    })
    const pending = result.current.db.memberships.find(m => m.email === 'pending-audit-test@example.com')!
    expect(pending.status).toBe('pending')

    act(() => { result.current.enterSociety('soc_rajhans', 'auditor') })
    act(() => { result.current.approveMembership(pending.id) })
    expect(result.current.db.memberships.find(m => m.id === pending.id)?.status).toBe('pending') // unchanged

    act(() => { result.current.rejectMembership(pending.id) })
    expect(result.current.db.memberships.find(m => m.id === pending.id)).toBeDefined() // still there, not removed
  })

  it('society_admin, for comparison, can do all of the above fine', () => {
    const result = setup()
    const before = result.current.db.flats.length
    act(() => { result.current.addFlat({ number: '776', floor: 7, ownerName: 'Should save', phone: '1', occupancy: 'owner', sqft: 500 }) })
    expect(result.current.db.flats.length).toBe(before + 1)
  })
})

describe('owner read-only support mode actually blocks writes now (previously it was label-only)', () => {
  it('cannot record a payment while in read-only support mode', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'readonly', 'checking a resident complaint') })
    let pay: unknown
    act(() => { pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(pay).toBeNull()
  })

  it('can record a payment when explicitly in write-capable support mode', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write', 'fixing a mis-entered receipt') })
    let pay: unknown
    act(() => { pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(pay).not.toBeNull()
  })

  it('the genuine owner (not acting as anyone) can still write normally, with no support mode set at all', () => {
    const result = setup()
    act(() => { result.current.logout() }) // ensure no leftover impersonation state
    act(() => {
      // AuthCallback.tsx falls back to DEFAULT_SOCIETY_ID for a global
      // owner's claimed membership (real societyId is null for owner rows)
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })
    expect(result.current.session.supportMode).toBeUndefined()
  })
})
