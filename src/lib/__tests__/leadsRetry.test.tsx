import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * The leads page used to manage its own entirely separate real-write
 * path, outside the attemptRealWrite system every other real write in
 * the app goes through - found directly by reading the code, not
 * assumed. This confirms updateLeadStatus (the one, now-shared action
 * both the leads page and the local demo both call) is actually wired
 * into the same failed-write visibility everything else has, the same
 * way syncRetry.test.tsx already confirms for complaints.
 *
 * Hoisted mock, same reasoning as syncRetry.test.tsx: store.tsx imports
 * leads.ts statically, so this has to be set up before either module is
 * imported for the mock to actually intercept the call.
 */
let updateLeadCallCount = 0
let shouldFail = true

vi.mock('../leads', async () => {
  const actual = await vi.importActual<typeof import('../leads')>('../leads')
  return {
    ...actual,
    updateLeadInSupabase: vi.fn(async () => {
      updateLeadCallCount++
      if (shouldFail) throw new Error('simulated network failure')
    }),
  }
})

afterEach(() => {
  localStorage.clear()
  updateLeadCallCount = 0
  shouldFail = true
})

describe('updateLeadStatus is genuinely wired into the same real-write and retry system as everything else now', () => {
  it('a failed lead status update shows up in failedWrites, exactly like any other real write', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })

    act(() => {
      result.current.updateLeadStatus('lead_test_1', 'contacted')
    })

    await waitFor(() => {
      expect(result.current.failedWrites.some(f => f.label === 'લીડ')).toBe(true)
    })
    expect(updateLeadCallCount).toBe(1)
  })

  it('retrying a failed lead update calls the real function again, and success clears it', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })

    act(() => {
      result.current.updateLeadStatus('lead_test_2', 'converted')
    })
    await waitFor(() => { expect(result.current.failedWrites.length).toBeGreaterThan(0) })

    const failedId = result.current.failedWrites[0].id
    shouldFail = false
    act(() => { result.current.retryFailedWrite(failedId) })

    await waitFor(() => {
      expect(result.current.failedWrites.some(f => f.id === failedId)).toBe(false)
    })
    expect(updateLeadCallCount).toBe(2)
  })

  it('the local demo session never touches the real function at all', async () => {
    const { DataProvider, useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write') })

    act(() => {
      result.current.updateLeadStatus('lead_test_3', 'closed')
    })

    expect(result.current.failedWrites).toEqual([])
    expect(updateLeadCallCount).toBe(0)
  })
})
