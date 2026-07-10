import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TestDataProvider } from './testUtils'

/**
 * Found by systematically checking every place session.isRealSession
 * gets set, specifically looking for the same shape as the onboarding
 * bug - a real session silently ending up local-only with nothing
 * telling anyone. exitImpersonation used to hardcode isRealSession:
 * false unconditionally on exit, so a genuinely real owner using the
 * actual "view as support" feature and then exiting it would come back
 * out stuck in local-only mode, not restored to their own real session -
 * every write after that point would have silently gone local-only too.
 */
vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  return {
    ...actual,
    insertImpersonationLogReal: vi.fn(async () => {}),
    exitImpersonationLogReal: vi.fn(async () => {}),
  }
})

afterEach(() => {
  localStorage.clear()
})

describe('exitImpersonation correctly restores whatever the owner genuinely was before entering support mode', () => {
  it('a genuinely real owner is still real after entering and then exiting support mode - the actual bug this fixes', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })
    expect(result.current.session.isRealSession).toBe(true)

    act(() => {
      result.current.enterSociety('soc_rajhans', 'society_admin', 'readonly')
    })
    // correctly local while actively viewing as the society, unchanged
    // by this fix
    expect(result.current.session.isRealSession).toBe(false)

    await waitFor(() => {
      expect(result.current.rawDb.impersonationLogs.length).toBeGreaterThan(0)
    })

    act(() => {
      result.current.exitImpersonation()
    })

    // the actual fix: back to their own real session, not stuck local
    expect(result.current.session.isRealSession).toBe(true)
    expect(result.current.session.role).toBe('owner')
  })

  it('the local demo owner stays local after entering and exiting support mode - this fix does not change that', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.enterSociety('soc_rajhans', 'society_admin', 'readonly')
    })
    expect(result.current.session.isRealSession).toBe(false)

    act(() => {
      result.current.exitImpersonation()
    })

    expect(result.current.session.isRealSession).toBe(false)
    expect(result.current.session.role).toBe('owner')
  })
})
