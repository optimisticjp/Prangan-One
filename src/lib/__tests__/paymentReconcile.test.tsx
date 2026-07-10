import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * The reconciliation logic specifically - the optimistic receipt number
 * shown immediately for instant feedback gets overwritten with whatever
 * the database actually, atomically allocated, once the real call
 * returns. This is what makes the instant-feedback UX safe to keep even
 * though the real number can no longer be computed client-side: shown
 * fast, corrected to the real, authoritative value the moment it's
 * known, not trusted as final before that.
 */
vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return {
    ...actual,
    recordPaymentReal: vi.fn(async () => ({ receiptNo: 'RJH-2026-9999', overpayAmount: 0, adjustmentId: null })),
    confirmPendingPaymentReal: vi.fn(async () => ({ receiptNo: 'RJH-2026-8888' })),
  }
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('the optimistic receipt number gets reconciled with the real, server-allocated one', () => {
  it('recordPayment shows an optimistic number immediately, then corrects it to the real one once the atomic call returns', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })

    let optimisticReceiptNo: string | undefined
    act(() => {
      const pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi' })
      optimisticReceiptNo = pay?.receiptNo
    })

    // shown immediately, before the real call has even resolved
    expect(optimisticReceiptNo).toBeDefined()

    await waitFor(() => {
      const stored = result.current.rawDb.payments.find(p => p.receiptNo === 'RJH-2026-9999')
      expect(stored).toBeDefined()
    })
    // the optimistic guess is genuinely gone, replaced by the real one -
    // not sitting alongside it as a second, stale record
    expect(result.current.rawDb.payments.some(p => p.receiptNo === optimisticReceiptNo && p.receiptNo !== 'RJH-2026-9999')).toBe(false)
  })

  it('confirming a pending payment reconciles the same way', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })
    let pendingId = ''
    act(() => {
      const pay = result.current.recordPayment({ flatId: 'flat_101', amount: 1200, mode: 'upi', pending: true })
      pendingId = pay!.id
    })
    await waitFor(() => { expect(result.current.rawDb.payments.some(p => p.id === pendingId)).toBe(true) })

    act(() => { result.current.confirmPendingPayment(pendingId) })

    await waitFor(() => {
      const confirmed = result.current.rawDb.payments.find(p => p.id === pendingId)
      expect(confirmed?.receiptNo).toBe('RJH-2026-8888')
    })
  })
})
