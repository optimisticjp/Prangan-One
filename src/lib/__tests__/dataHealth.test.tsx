import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * The connection-health model, proven at the store level with injected time,
 * not wall-clock time or arbitrary waits. Fake timers pin "now" to an exact
 * value, so a test can say "a refresh succeeded at exactly this instant, then
 * three hours later one failed" and assert the real, captured timestamps
 * without the test's own runtime affecting anything.
 *
 * The model is built from the same fetch tracking fetchError and
 * financialsLoading already use (see the one fetch effect in store.tsx), not
 * a second mechanism, which is exactly why these drive the real fetch rather
 * than poking at private state.
 */
vi.mock('../supabase', async () => {
  const actual = await vi.importActual<typeof import('../supabase')>('../supabase')
  return { ...actual, supabaseConfigured: true }
})
vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return { ...actual, fetchSocietyFinancials: vi.fn() }
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.useRealTimers()
})

// Flush the fetch effect's promise chain and the React state updates it
// schedules. Fake timers don't fake microtasks, so awaiting a few ticks
// inside act settles the Promise.all().then().finally() and its setState calls.
async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

const T0 = Date.UTC(2026, 6, 11, 10, 0, 0)
const THREE_HOURS = 3 * 60 * 60 * 1000

describe('dataHealth records real refresh timestamps at the exact injected times', () => {
  it('a successful refresh captures the exact instant it succeeded, and leaves failure null', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const realData = await import('../realData')
    ;(realData.fetchSocietyFinancials as ReturnType<typeof vi.fn>).mockResolvedValue({ flats: [], bills: [], payments: [], adjustments: [] })

    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    await act(async () => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })
    await settle()

    expect(result.current.dataHealth?.lastRefreshSuccessAt).toBe(T0)
    expect(result.current.dataHealth?.lastRefreshFailureAt).toBeNull()
    expect(result.current.dataHealth?.refreshState).toBe('idle')
  })

  it('a refresh that fails three hours later records the failure time and keeps the real last-success time', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const realData = await import('../realData')
    let shouldFail = false
    ;(realData.fetchSocietyFinancials as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      if (shouldFail) throw new Error('simulated network failure')
      return { flats: [], bills: [], payments: [], adjustments: [] }
    })

    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    await act(async () => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })
    await settle()
    expect(result.current.dataHealth?.lastRefreshSuccessAt).toBe(T0)

    // Exactly three hours pass, then a refresh genuinely fails.
    vi.setSystemTime(T0 + THREE_HOURS)
    shouldFail = true
    await act(async () => { result.current.retryFetch() })
    await settle()

    expect(result.current.dataHealth?.lastRefreshFailureAt).toBe(T0 + THREE_HOURS)
    // The last good data is still from T0, three hours ago - not overwritten.
    expect(result.current.dataHealth?.lastRefreshSuccessAt).toBe(T0)
  })
})

describe('dataHealth.offline is wired to the browser, not inferred from a failed fetch', () => {
  it('flips with the window online/offline events', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })

    expect(result.current.dataHealth?.offline).toBe(false)
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current.dataHealth?.offline).toBe(true)
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(result.current.dataHealth?.offline).toBe(false)
  })
})

describe('dataHealth.pendingWriteCount reuses the existing failed-write queue', () => {
  it('is exactly the length of failedWrites, the same pendingSync source, not a separate count', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })
    // Both read from db.pendingSync, so they agree by construction - this
    // guards against anyone later adding a second, separate counter.
    expect(result.current.dataHealth?.pendingWriteCount).toBe(result.current.failedWrites.length)
  })
})
