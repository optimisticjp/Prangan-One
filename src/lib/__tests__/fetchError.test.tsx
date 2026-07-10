import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * Found by systematically checking for anything shaped like the previous
 * build's findings, not just the ones already named - the initial
 * real-session data fetch had a silent catch, confirmed real by reading
 * the code (its own comment already admitted this: "a real error-surface
 * for this is worth adding later"). Before this, a failed fetch left
 * someone looking at stale or completely empty data with absolutely
 * nothing telling them anything had gone wrong.
 */
vi.mock('../supabase', async () => {
  const actual = await vi.importActual<typeof import('../supabase')>('../supabase')
  return { ...actual, supabaseConfigured: true }
})

vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return {
    ...actual,
    fetchSocietyFinancials: vi.fn(),
  }
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('a failed initial data fetch is now genuinely visible, not silently swallowed', () => {
  it('sets fetchError to true when the real fetch actually fails', async () => {
    const realData = await import('../realData')
    ;(realData.fetchSocietyFinancials as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('simulated network failure'))

    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })

    await waitFor(() => {
      expect(result.current.fetchError).toBe(true)
    })
  })

  it('retryFetch actually triggers the fetch again, and a genuine success clears the error', async () => {
    const realData = await import('../realData')
    let shouldFail = true
    ;(realData.fetchSocietyFinancials as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      if (shouldFail) throw new Error('simulated network failure')
      return { flats: [], bills: [], payments: [], adjustments: [] }
    })

    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })
    await waitFor(() => { expect(result.current.fetchError).toBe(true) })

    shouldFail = false
    act(() => { result.current.retryFetch() })

    await waitFor(() => {
      expect(result.current.fetchError).toBe(false)
    })
  })

  it('a genuinely successful fetch never sets fetchError at all - the local demo, which never fetches anything real, is unaffected too', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => { result.current.enterSociety('soc_rajhans', 'society_admin', 'write') })

    expect(result.current.fetchError).toBe(false)
  })
})
