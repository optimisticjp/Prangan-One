import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The root switcher (main.tsx) decides which provider to mount with a
 * simple, synchronous check: isDemoModeEnabled() && isDemoSessionActive().
 * Real browser navigation itself (window.location.href triggering an
 * actual reload) is standard, well-understood browser behavior this
 * project's code doesn't need to prove - what actually needs verifying
 * is the logic on either side of that reload: does starting a session
 * write the right thing to storage before attempting navigation, and
 * does the switcher's own check correctly read it back afterward. JSDOM
 * doesn't perform a real reload when window.location.href is set (a
 * known JSDOM limitation, not something specific to this code), so
 * window.location itself is mocked here specifically to isolate and
 * verify the storage side of this without needing a real browser.
 */
afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('startDemoSession writes the actual, correct session to storage before attempting navigation', () => {
  it('a role picked with no flat writes that exact role, with a null flatId', async () => {
    vi.stubGlobal('location', { href: '' })
    const { startDemoSession } = await import('../demoStore')

    startDemoSession('society_admin', undefined, '/admin')

    const raw = sessionStorage.getItem('prangan_demo_v1_session')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual({ role: 'society_admin', flatId: null })
  })

  it('picking a resident flat resolves the real role from that flat\u2019s own occupancy, not just whatever was passed in', async () => {
    vi.stubGlobal('location', { href: '' })
    const { startDemoSession } = await import('../demoStore')
    const { buildDemoSeed } = await import('../demoSeed')
    const seed = buildDemoSeed()
    const tenantFlat = seed.flats.find(f => f.occupancy === 'tenant')!

    startDemoSession('resident_owner', tenantFlat.id, '/app')

    const raw = sessionStorage.getItem('prangan_demo_v1_session')
    expect(JSON.parse(raw!)).toEqual({ role: 'resident_tenant', flatId: tenantFlat.id })
  })

  it('attempts navigation to the exact target route given', async () => {
    const locationStub = { href: '' }
    vi.stubGlobal('location', locationStub)
    const { startDemoSession } = await import('../demoStore')

    startDemoSession('accountant', undefined, '/accounts')

    expect(locationStub.href).toBe('/accounts')
  })
})

describe('the switcher\u2019s own decision, isDemoSessionActive, correctly reads back what startDemoSession actually wrote', () => {
  it('reports false before any session has been started at all', async () => {
    const { isDemoSessionActive } = await import('../demoStore')
    expect(isDemoSessionActive()).toBe(false)
  })

  it('reports true after a real role has genuinely been written to storage', async () => {
    vi.stubGlobal('location', { href: '' })
    const { startDemoSession, isDemoSessionActive } = await import('../demoStore')

    startDemoSession('society_admin', undefined, '/admin')

    expect(isDemoSessionActive()).toBe(true)
  })

  it('correctly reports false again after the session key is cleared, matching what a real logout/exit does', async () => {
    vi.stubGlobal('location', { href: '' })
    const { startDemoSession, isDemoSessionActive } = await import('../demoStore')
    startDemoSession('society_admin', undefined, '/admin')
    expect(isDemoSessionActive()).toBe(true)

    sessionStorage.removeItem('prangan_demo_v1_session')

    expect(isDemoSessionActive()).toBe(false)
  })
})
