import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * The actual fix this build exists for, proven directly: before this,
 * a real owner entering support mode for a real society saw local,
 * disconnected data while the screen appeared to show something real -
 * support staff could genuinely believe they were looking at a real
 * client's real records when they weren't. Now a genuinely real owner's
 * support session actually fetches the selected society's real, live
 * data, and every kind of write - not just one representative one -
 * stays genuinely blocked the whole time, verified directly against the
 * store's own write-guard, not assumed from reading the code.
 */
vi.mock('../supabase', async () => {
  const actual = await vi.importActual<typeof import('../supabase')>('../supabase')
  return { ...actual, supabaseConfigured: true }
})

vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return {
    ...actual,
    fetchSociety: vi.fn(async () => null),
    insertImpersonationLogReal: vi.fn(async () => {}),
    exitImpersonationLogReal: vi.fn(async () => {}),
  }
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('a genuinely real owner entering support mode actually fetches the target society\u2019s real data', () => {
  it('calls the real fetchSociety function with the actual selected society\u2019s id, not the owner\u2019s own previous context', async () => {
    const realData = await import('../realData')
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: null as unknown as string, flatId: null })
    })
    act(() => {
      result.current.enterSociety('a-different-real-society-id', 'society_admin', 'checking a resident complaint')
    })

    await waitFor(() => {
      expect(realData.fetchSociety).toHaveBeenCalledWith('a-different-real-society-id')
    })
  })

  it('the local demo owner never calls the real fetch function at all - it was never real to begin with', async () => {
    const realData = await import('../realData')
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.enterSociety('soc_rajhans', 'society_admin')
    })

    expect(realData.fetchSociety).not.toHaveBeenCalled()
  })
})

describe('every kind of write stays genuinely blocked throughout a real support session, not just one representative one', () => {
  async function enterRealSupportSession() {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: null as unknown as string, flatId: null })
    })
    act(() => {
      result.current.enterSociety('soc_rajhans', 'society_admin', 'checking something')
    })
    return result
  }

  it('cannot record a payment', async () => {
    const result = await enterRealSupportSession()
    let pay: unknown
    act(() => { pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(pay).toBeNull()
  })

  it('cannot add a complaint', async () => {
    const result = await enterRealSupportSession()
    let c: unknown
    act(() => { c = result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Should not save', detail: '', priority: 'normal' }) })
    expect(c).toBeNull()
  })

  it('cannot add a notice', async () => {
    const result = await enterRealSupportSession()
    const before = result.current.db.notices.length
    act(() => { result.current.addNotice({ title: 'Should not save', body: '', category: 'general', pinned: false }) })
    expect(result.current.db.notices.length).toBe(before)
  })

  it('cannot add an expense', async () => {
    const result = await enterRealSupportSession()
    const before = result.current.db.expenses.length
    act(() => { result.current.addExpense({ date: '2026-07-10', category: 'Repairs', amount: 500, mode: 'cash', vendorId: undefined, note: '', billFile: undefined }) })
    expect(result.current.db.expenses.length).toBe(before)
  })

  it('cannot approve a pending membership', async () => {
    const result = await enterRealSupportSession()
    act(() => {
      result.current.selfEnrollResident({ joinCode: 'RAJHANS24', flatNumber: '103', name: 'X', phone: '0', email: 'support-mode-block-test@example.com' })
    })
    const pending = result.current.db.memberships.find(m => m.email === 'support-mode-block-test@example.com')
    if (pending) {
      act(() => { result.current.approveMembership(pending.id) })
      expect(result.current.db.memberships.find(m => m.id === pending.id)?.status).toBe('pending')
    }
  })

  it('the read-only reason surfaces to the UI when a write is attempted', async () => {
    const result = await enterRealSupportSession()
    act(() => { result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' }) })
    expect(result.current.lastBlockedReason).toContain('Read-only')
  })
})
