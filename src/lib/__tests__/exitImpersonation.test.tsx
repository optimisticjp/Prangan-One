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
 * out stuck in local-only mode, not restored to their own real session.
 *
 * A later build changed what "during" support mode itself means too:
 * isRealSession now correctly stays true for a genuinely real owner for
 * the whole session, not just after exiting it - that's what makes
 * support mode show the target society's real, live data instead of a
 * local, disconnected view. Write safety during that doesn't depend on
 * isRealSession being false anymore; it depends on canWriteNow, tested
 * directly in ownerSupportMode.test.tsx.
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
  it('a genuinely real owner stays real throughout support mode, and after exiting it', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
    })
    expect(result.current.session.isRealSession).toBe(true)

    act(() => {
      result.current.enterSociety('soc_rajhans', 'society_admin')
    })
    // the actual point of this feature now existing at all: a genuinely
    // real owner sees this society's real, live data during support
    // mode, not a local, disconnected view while appearing to show
    // something real
    expect(result.current.session.isRealSession).toBe(true)

    await waitFor(() => {
      expect(result.current.rawDb.impersonationLogs.length).toBeGreaterThan(0)
    })

    act(() => {
      result.current.exitImpersonation()
    })

    // still real afterward too - the original bug this test file exists for
    expect(result.current.session.isRealSession).toBe(true)
    expect(result.current.session.role).toBe('owner')
  })

  it('the local demo owner stays local throughout support mode and after exiting it - never was real to begin with', async () => {
    const { useData } = await import('../store')
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    act(() => {
      result.current.enterSociety('soc_rajhans', 'society_admin')
    })
    expect(result.current.session.isRealSession).toBe(false)

    act(() => {
      result.current.exitImpersonation()
    })

    expect(result.current.session.isRealSession).toBe(false)
    expect(result.current.session.role).toBe('owner')
  })
})
