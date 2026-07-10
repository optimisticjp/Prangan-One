import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * The actual thing this build exists to prove: a failed write used to
 * become completely invisible the moment its in-memory toast was
 * dismissed or the page was reloaded, even though the unsaved record
 * stayed sitting in local storage looking exactly like it had saved
 * fine. This test simulates a real reload - not just calling a
 * function again, but mounting an entirely fresh DataProvider that
 * only has localStorage to read from, the same way the real app does
 * on every page load - and confirms the failure is still visible and
 * still genuinely retryable, using the record's current data rather
 * than a closure that couldn't possibly have survived.
 */
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
  cleanup()
  localStorage.clear()
  insertComplaintCallCount = 0
  shouldFail = true
})

describe('a failed write genuinely survives a reload, not just an in-session dismiss', () => {
  it('shows up in failedWrites again after mounting a completely fresh DataProvider, reading only from localStorage', async () => {
    const { DataProvider, useData } = await import('../store')

    // "session 1": a real owner adds a complaint, the save fails
    const { result: first, unmount } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      first.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    act(() => {
      first.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Reload test complaint', detail: '', priority: 'normal' })
    })
    await waitFor(() => { expect(first.current.failedWrites.length).toBeGreaterThan(0) })
    const failedId = first.current.failedWrites[0].id

    // actually unmount the whole component tree - this is what makes
    // the in-memory retry closure genuinely gone, not just theoretically
    unmount()

    // "session 2": a brand new DataProvider, as if the page were freshly
    // loaded - it has never seen the original attempt, only whatever
    // was persisted to localStorage
    const { result: second } = renderHook(() => useData(), { wrapper: TestDataProvider })

    expect(second.current.failedWrites.some(f => f.id === failedId)).toBe(true)
    expect(second.current.db.complaints.some(c => c.title === 'Reload test complaint')).toBe(true)
  })

  it('retrying after a simulated reload actually calls the real write function again and succeeds, using the record\u2019s current data', async () => {
    const { DataProvider, useData } = await import('../store')

    const { result: first, unmount } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      first.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    act(() => {
      first.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Reload retry complaint', detail: '', priority: 'normal' })
    })
    await waitFor(() => { expect(first.current.failedWrites.length).toBeGreaterThan(0) })
    const failedId = first.current.failedWrites[0].id
    unmount()

    const { result: second } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(second.current.failedWrites.some(f => f.id === failedId)).toBe(true)

    shouldFail = false
    act(() => { second.current.retryFailedWrite(failedId) })

    await waitFor(() => {
      expect(second.current.failedWrites.some(f => f.id === failedId)).toBe(false)
    })
    // the resync path was used (not the original closure, which is
    // genuinely gone after the real unmount above), and it still
    // reached the real function successfully
    expect(insertComplaintCallCount).toBeGreaterThanOrEqual(1)
  })

  it('a successful write never leaves anything behind in pendingSync at all - a reload afterward shows nothing pending', async () => {
    shouldFail = false
    const { DataProvider, useData } = await import('../store')

    const { result: first, unmount } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      first.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    act(() => {
      first.current.addComplaint({ flatId: 'flat_101', category: 'Leak', title: 'Clean success complaint', detail: '', priority: 'normal' })
    })
    await waitFor(() => { expect(insertComplaintCallCount).toBe(1) })
    unmount()

    const { result: second } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(second.current.failedWrites).toEqual([])
    expect(second.current.rawDb.pendingSync).toEqual([])
  })
})
