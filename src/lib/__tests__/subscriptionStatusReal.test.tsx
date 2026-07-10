import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * setSubscriptionStatus used to only ever change this app's own local
 * state - the exact same bug shape as the onboarding wizard earlier in
 * this plan, a real owner action that looks like it worked and never
 * reaches the real database. Confirmed directly by reading the code
 * before fixing it, not assumed from the review that flagged it.
 */
vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return {
    ...actual,
    updateSocietyStatusReal: vi.fn(async () => {}),
  }
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('a real owner changing a society\u2019s subscription status actually reaches the real database now', () => {
  it('calls updateSocietyStatusReal with the new status', async () => {
    const realData = await import('../realData')
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })
    act(() => {
      result.current.setSubscriptionStatus('soc_rajhans', 'paused')
    })

    await waitFor(() => {
      expect(realData.updateSocietyStatusReal).toHaveBeenCalledTimes(1)
    })
    const [calledId, patch] = (realData.updateSocietyStatusReal as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(calledId).toBe('soc_rajhans')
    expect(patch.subscriptionStatus).toBe('paused')
  })

  it('moving to grace sets a real grace-start date, moving to active clears it for real', async () => {
    const realData = await import('../realData')
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })

    act(() => { result.current.setSubscriptionStatus('soc_rajhans', 'grace') })
    await waitFor(() => { expect(realData.updateSocietyStatusReal).toHaveBeenCalledTimes(1) })
    const gracePatch = (realData.updateSocietyStatusReal as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(typeof gracePatch.graceStartedAt).toBe('string')

    act(() => { result.current.setSubscriptionStatus('soc_rajhans', 'active') })
    await waitFor(() => { expect(realData.updateSocietyStatusReal).toHaveBeenCalledTimes(2) })
    const activePatch = (realData.updateSocietyStatusReal as ReturnType<typeof vi.fn>).mock.calls[1][1]
    expect(activePatch.graceStartedAt).toBeNull()
  })

  it('the local demo never touches the real function at all', async () => {
    const realData = await import('../realData')
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => { result.current.login('society_admin') })
    act(() => { result.current.setSubscriptionStatus('soc_rajhans', 'paused') })

    expect(realData.updateSocietyStatusReal).not.toHaveBeenCalled()
  })
})
