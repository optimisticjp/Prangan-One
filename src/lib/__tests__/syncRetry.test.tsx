import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

// Hoisted, module-level mock - store.tsx imports realData.ts statically,
// so this has to be set up before either module is ever imported for the
// mock to actually intercept the calls store.tsx makes internally. This
// is why this lives in its own file rather than alongside the other
// store tests: mocking realData here would otherwise affect every other
// test that imports store.tsx in the same file.
let insertComplaintCallCount = 0
let shouldFail = true

vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return {
    ...actual,
    insertComplaintReal: vi.fn(async () => {
      insertComplaintCallCount++
      if (shouldFail) throw new Error('simulated network failure')
    }),
  }
})

afterEach(() => {
  localStorage.clear()
  insertComplaintCallCount = 0
  shouldFail = true
})

describe('attemptRealWrite: the core mechanism behind failedWrites, retryFailedWrite, and dismissFailedWrite', () => {
  it('a write that fails shows up in failedWrites - this is the exact thing an external audit caught as invisible before this build', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })

    act(() => {
      result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Retry test complaint', detail: '', priority: 'normal' })
    })

    // the local, optimistic state already shows the complaint immediately
    expect(result.current.db.complaints.some(c => c.title === 'Retry test complaint')).toBe(true)

    // but the real write failed, so it should now be visibly tracked as failed
    await waitFor(() => {
      expect(result.current.failedWrites.some(f => f.label === 'ફરિયાદ')).toBe(true)
    })
  })

  it('tapping retry re-attempts the exact same write, and success removes it from failedWrites', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })

    act(() => {
      result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Retry success test', detail: '', priority: 'normal' })
    })
    await waitFor(() => { expect(result.current.failedWrites.length).toBeGreaterThan(0) })

    const failedId = result.current.failedWrites[0].id
    shouldFail = false // the retry will now succeed
    act(() => { result.current.retryFailedWrite(failedId) })

    await waitFor(() => {
      expect(result.current.failedWrites.some(f => f.id === failedId)).toBe(false)
    })
    expect(insertComplaintCallCount).toBe(2) // the original attempt, plus exactly one retry
  })

  it('a write that succeeds on the first try never appears in failedWrites at all', async () => {
    shouldFail = false
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })

    act(() => {
      result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'First try success', detail: '', priority: 'normal' })
    })

    await waitFor(() => { expect(insertComplaintCallCount).toBe(1) })
    expect(result.current.failedWrites).toEqual([])
  })

  it('dismissFailedWrite removes the entry without retrying - the person chose not to retry, not a hidden automatic retry', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })

    act(() => {
      result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Dismiss test', detail: '', priority: 'normal' })
    })
    await waitFor(() => { expect(result.current.failedWrites.length).toBeGreaterThan(0) })

    const callCountBeforeDismiss = insertComplaintCallCount
    const failedId = result.current.failedWrites[0].id
    act(() => { result.current.dismissFailedWrite(failedId) })

    expect(result.current.failedWrites.some(f => f.id === failedId)).toBe(false)
    expect(insertComplaintCallCount).toBe(callCountBeforeDismiss) // dismissing did not trigger another attempt
  })

  it('the local demo (not a real session) never touches failedWrites at all - this mechanism is exclusively for real writes', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => { result.current.login('society_admin') }) // local demo, not real

    act(() => {
      result.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Demo mode complaint', detail: '', priority: 'normal' })
    })

    expect(result.current.db.complaints.some(c => c.title === 'Demo mode complaint')).toBe(true)
    expect(result.current.failedWrites).toEqual([])
    expect(insertComplaintCallCount).toBe(0) // the real function was never even called
  })
})
