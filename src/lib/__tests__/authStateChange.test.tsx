import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * Real Supabase itself is what fires SIGNED_OUT when a session dies for
 * any reason, not just an explicit logout click - a refresh token it
 * rejects, or a person's access being removed while they still have the
 * app open. This can't be exercised against the actual Supabase client
 * (there are no real credentials in this environment), so this mocks
 * exactly the one seam the app itself listens on - onAuthStateChange -
 * and drives it directly, the same way the real client would.
 */
const { authStateHolder, signOutMock, navigateMock } = vi.hoisted(() => ({
  authStateHolder: { current: null as ((event: string) => void) | null },
  signOutMock: vi.fn(async () => {}),
  navigateMock: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string) => void) => {
        authStateHolder.current = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      signOut: signOutMock,
    },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { DataProvider, useData } from '../store'

afterEach(() => {
  localStorage.clear()
  authStateHolder.current = null
  navigateMock.mockClear()
  signOutMock.mockClear()
})

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter><DataProvider>{children}</DataProvider></MemoryRouter>
}

describe('a real session actually reacts when Supabase itself says the session is gone', () => {
  it('a SIGNED_OUT event while a real session was active clears the cached real data and redirects to login', async () => {
    const { result } = renderHook(() => useData(), { wrapper: Wrapper })

    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    expect(result.current.session.isRealSession).toBe(true)

    act(() => { authStateHolder.current?.('SIGNED_OUT') })

    await waitFor(() => {
      expect(result.current.session.isRealSession).toBe(false)
    })
    expect(navigateMock).toHaveBeenCalledWith('/login')
  })

  it('a SIGNED_OUT event when there was never a real session to begin with does nothing - a first-time public site visitor never trips this', async () => {
    const { result } = renderHook(() => useData(), { wrapper: Wrapper })

    expect(result.current.session.isRealSession).toBe(false)
    act(() => { authStateHolder.current?.('SIGNED_OUT') })

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('logout() actually calls Supabase\u2019s own signOut, not just clearing local state', async () => {
    const { result } = renderHook(() => useData(), { wrapper: Wrapper })

    act(() => {
      result.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })
    act(() => { result.current.logout() })

    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(result.current.session.isRealSession).toBe(false)
  })

  it('logging out of the local demo never calls Supabase\u2019s signOut at all - there was never a real session to end', async () => {
    const { result } = renderHook(() => useData(), { wrapper: Wrapper })

    act(() => { result.current.login('society_admin') })
    act(() => { result.current.logout() })

    expect(signOutMock).not.toHaveBeenCalled()
  })
})
