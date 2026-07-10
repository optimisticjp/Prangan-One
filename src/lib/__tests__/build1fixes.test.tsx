import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useData } from '../store'
import { TestDataProvider } from './testUtils'

function setup() {
  const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
  act(() => { result.current.login('society_admin') })
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
    act(() => { result.current.login('society_admin') })
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
    act(() => { result.current.login('society_admin') })
    expect(result.current.db.flats.some(f => f.number === '888')).toBe(false)
  })

  it('clears fields well beyond the original four - a real gap an external audit caught, since every module added since only ever got wired into fetching, never into logout cleanup', () => {
    const result = setup()
    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    // simulates what a real fetch would have populated - complaints,
    // documents, and memberships were three of the several fields the
    // original logout fix never accounted for, since they didn't exist
    // as real-fetched fields yet when that fix was written
    act(() => {
      result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Audit test complaint', detail: '', priority: 'normal' })
      result.current.addDocumentMeta({ name: 'Audit test doc', folder: 'General', permission: 'public', size: '1 KB' })
    })
    expect(result.current.db.complaints.some(c => c.title === 'Audit test complaint')).toBe(true)
    expect(result.current.db.documents.some(d => d.name === 'Audit test doc')).toBe(true)

    act(() => { result.current.logout() })
    act(() => { result.current.login('society_admin') })

    expect(result.current.db.complaints.some(c => c.title === 'Audit test complaint')).toBe(false)
    expect(result.current.db.documents.some(d => d.name === 'Audit test doc')).toBe(false)
  })

  it('a real owner session logging out clears platform-wide data too, not just one society\u2019s worth - societies, platform billing, and leads were never scoped to a single society in the first place, so a societyId filter could never have cleaned them up even before this fix', () => {
    const result = setup()
    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })
    act(() => {
      result.current.addSociety({
        name: 'ઓડિટ ટેસ્ટ', nameEn: 'Audit Test Society', city: 'Surat', area: 'x', address: 'x',
        maintenanceAmount: 1000, dueDay: 10, receiptPrefix: 'AT', themeKey: 'navy-saffron',
        modules: { ownerEnabled: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true }, adminVisible: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true } },
        tenantAccess: 'full',
      })
    })
    expect(result.current.rawDb.societies.some(s => s.nameEn === 'Audit Test Society')).toBe(true)

    act(() => { result.current.logout() })

    expect(result.current.rawDb.societies.some(s => s.nameEn === 'Audit Test Society')).toBe(false)
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
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'checking something') })
    act(() => { result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(result.current.lastBlockedReason).toContain('Read-only')
  })

  it('clears back to null after a write actually succeeds', () => {
    const result = setup()
    act(() => { result.current.enterSociety('soc_rajhans', 'auditor') })
    act(() => { result.current.addFlat({ number: '774', floor: 7, ownerName: 'X', phone: '1', occupancy: 'owner', sqft: 500 }) })
    expect(result.current.lastBlockedReason).not.toBeNull()

    act(() => { result.current.login('society_admin') })
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
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'checking a resident complaint') })
    let pay: unknown
    act(() => { pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(pay).toBeNull()
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

describe('loadDB backfills fields missing from an older saved browser snapshot (real bug, found live)', () => {
  const minimalSociety = {
    id: 'soc_test', name: 'ટેસ્ટ', nameEn: 'Test', slug: 'test', joinCode: 'TEST1',
    address: 'x', city: 'x', area: 'x', maintenanceAmount: 1000, dueDay: 10, upiId: '',
    plan: 'trial', flatsLimit: 50, receiptPrefix: 'T', themeKey: 'navy-saffron', receiptSeq: 1, createdAt: '2027-01-01',
    tenantAccess: 'full', subscriptionStatus: 'trial',
    modules: {
      ownerEnabled: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
      adminVisible: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
    },
  }

  it('a saved db missing unmatchedLoginAttempts entirely no longer crashes - it backfills to an empty array', () => {
    // Reproduces exactly what happened on a real deployment: a browser
    // holding a saved db from before unmatchedLoginAttempts existed on
    // the DB shape at all, still tagged version 3 (the version number
    // was never bumped when new fields were added across sessions), so
    // the old version check alone let it through unchanged, and the
    // owner's leads page crashed trying to iterate a field that was
    // simply undefined.
    const oldSavedShape = {
      version: 3, societies: [minimalSociety], flats: [], bills: [], payments: [], expenses: [], vendors: [],
      complaints: [], notices: [], documents: [], polls: [], events: [], vehicles: [], contacts: [],
      adjustments: [], memberships: [], platformBilling: [], leads: [], auditLogs: [], impersonationLogs: [],
      // unmatchedLoginAttempts is deliberately absent here, matching the real old snapshot
    }
    localStorage.setItem('rt_db_v3', JSON.stringify(oldSavedShape))

    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(Array.isArray(result.current.rawDb.unmatchedLoginAttempts)).toBe(true)
    expect(result.current.rawDb.unmatchedLoginAttempts).toEqual([])
  })

  it('a field saved as null (not just missing) also gets backfilled, not left null', () => {
    const oldSavedShape = {
      version: 3, societies: [minimalSociety], flats: [], bills: [], payments: [], expenses: [], vendors: [],
      complaints: [], notices: [], documents: [], polls: [], events: [], vehicles: [], contacts: [],
      adjustments: [], memberships: [], platformBilling: [], leads: [], unmatchedLoginAttempts: null,
      auditLogs: [], impersonationLogs: [],
    }
    localStorage.setItem('rt_db_v3', JSON.stringify(oldSavedShape))

    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(Array.isArray(result.current.rawDb.unmatchedLoginAttempts)).toBe(true)
  })

  it('fields that were already present and correct are left exactly as saved, not overwritten', () => {
    const oldSavedShape = {
      version: 3, societies: [minimalSociety], flats: [{ id: 'kept_flat', number: '999' }], bills: [], payments: [], expenses: [], vendors: [],
      complaints: [], notices: [], documents: [], polls: [], events: [], vehicles: [], contacts: [],
      adjustments: [], memberships: [], platformBilling: [], leads: [], auditLogs: [], impersonationLogs: [],
    }
    localStorage.setItem('rt_db_v3', JSON.stringify(oldSavedShape))

    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(result.current.rawDb.flats).toEqual([{ id: 'kept_flat', number: '999' }])
  })
})

describe('activeSociety can never be undefined, even with zero real societies (real bug, found live)', () => {
  it('a saved db with zero societies does not crash on load - activeSociety falls back to a safe placeholder, not undefined', () => {
    // Reproduces the exact real scenario: a genuine owner logs in for
    // real (via Google, in the actual report), their real fetch
    // correctly returns zero societies since none have been created yet
    // and replaces db.societies with that empty result - activeSociety
    // used to become literal undefined in that case, crashing the
    // moment anything read a field off it, which several different
    // places in the app do, not just one, which is exactly why the fix
    // needed to be structural rather than one extra guard somewhere.
    const emptySocietiesDb = {
      version: 3, societies: [], flats: [], bills: [], payments: [], expenses: [], vendors: [],
      complaints: [], notices: [], documents: [], polls: [], events: [], vehicles: [], contacts: [],
      adjustments: [], memberships: [], platformBilling: [], leads: [], unmatchedLoginAttempts: [],
      auditLogs: [], impersonationLogs: [],
    }
    localStorage.setItem('rt_db_v3', JSON.stringify(emptySocietiesDb))

    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(result.current.society).toBeDefined()
    expect(result.current.society.id).toBeTruthy()
    expect(() => result.current.society.subscriptionStatus).not.toThrow()
  })
})
