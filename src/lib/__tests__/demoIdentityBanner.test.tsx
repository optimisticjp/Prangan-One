import { afterEach, describe, expect, it } from 'vitest'
import { useEffect } from 'react'
import { render, screen, cleanup, fireEvent, act, renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DemoDataProvider } from '../demoStore'
import { useData } from '../store'

/**
 * The permanent, always-visible identification the whole demo was
 * missing until this build - the role switcher alone, tucked into a
 * sidebar, doesn't say plainly enough on its own that nothing here is
 * real. Never appears for a real session, and its restart action is
 * the first genuinely visible, reachable one this demo has had -
 * previously the only way to reset was buried in the admin-only
 * Settings page, meaning a resident session had no way to restart at
 * all.
 */
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('actions this demo genuinely cannot support (file uploads, real storage) tell the person plainly, rather than silently doing nothing at all', () => {
  it('getDocumentUrl sets a real, visible reason via the existing toast mechanism, not just a silent null', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })
    act(() => { result.current.login('society_admin') })
    act(() => { result.current.getDocumentUrl('some/path') })
    expect(result.current.lastBlockedReason).toContain('સિમ્યુલેટ')
  })

  it('getComplaintPhotoUrl and getPaymentProofUrl do the same', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })
    act(() => { result.current.login('society_admin') })
    act(() => { result.current.getComplaintPhotoUrl('some/path') })
    expect(result.current.lastBlockedReason).toContain('સિમ્યુલેટ')
    act(() => { result.current.getPaymentProofUrl('some/path') })
    expect(result.current.lastBlockedReason).toContain('સિમ્યુલેટ')
  })
})

describe('the demo identity banner', () => {
  it('never renders at all for a real session', async () => {
    const { DataProvider, useData: useRealData } = await import('../store')
    const { DemoIdentityBanner } = await import('../../components/DemoIdentityBanner')
    function RealSessionSetup({ children }: { children: React.ReactNode }) {
      const { resolveRealSession } = useRealData()
      useEffect(() => { resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null }) }, [])
      return <>{children}</>
    }
    render(
      <MemoryRouter>
        <DataProvider>
          <RealSessionSetup><DemoIdentityBanner /></RealSessionSetup>
        </DataProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByText(/કાલ્પનિક ડેટા/)).not.toBeInTheDocument()
  })

  it('shows the real, required identification text for a demo session', async () => {
    const { DemoIdentityBanner } = await import('../../components/DemoIdentityBanner')
    render(<MemoryRouter><DemoDataProvider><DemoIdentityBanner /></DemoDataProvider></MemoryRouter>)
    expect(await screen.findByText(/ડેમો સોસાયટી.*કાલ્પનિક ડેટા.*ફેરફારો કામચલાઉ છે/)).toBeInTheDocument()
  })

  it('is genuinely reachable from a resident session, not just admin - the real gap this build closes', async () => {
    const { ResidentLayout } = await import('../../layouts/Layouts')
    render(
      <MemoryRouter initialEntries={['/app']}>
        <DemoDataProvider>
          <Routes><Route path="/app" element={<ResidentLayout />}><Route index element={<div>resident home</div>} /></Route></Routes>
        </DemoDataProvider>
      </MemoryRouter>,
    )
    await screen.findByText('resident home')
    expect(screen.getByText(/કાલ્પનિક ડેટા/)).toBeInTheDocument()
  })

  it('restarting genuinely, actually clears real progress made during the session, not just closes a dialog', async () => {
    const { DemoIdentityBanner } = await import('../../components/DemoIdentityBanner')
    let data: ReturnType<typeof useData>
    function Probe() {
      data = useData()
      return <DemoIdentityBanner />
    }
    render(<MemoryRouter><DemoDataProvider><Probe /></DemoDataProvider></MemoryRouter>)
    act(() => { data!.login('society_admin') })
    act(() => { data!.addNotice({ title: 'Restart test notice', body: '', category: 'general', pinned: false }) })
    expect(data!.db.notices.some(n => n.title === 'Restart test notice')).toBe(true)

    fireEvent.click(screen.getByText('રીસ્ટાર્ટ'))
    fireEvent.click(await screen.findByText('રીસ્ટાર્ટ કરો'))

    expect(data!.db.notices.some(n => n.title === 'Restart test notice')).toBe(false)
    expect(data!.session.role).toBeNull()
  })

  it('clicking restart but then backing out genuinely keeps everything exactly as it was', async () => {
    const { DemoIdentityBanner } = await import('../../components/DemoIdentityBanner')
    let data: ReturnType<typeof useData>
    function Probe() {
      data = useData()
      return <DemoIdentityBanner />
    }
    render(<MemoryRouter><DemoDataProvider><Probe /></DemoDataProvider></MemoryRouter>)
    act(() => { data!.login('society_admin') })
    act(() => { data!.addNotice({ title: 'Should survive', body: '', category: 'general', pinned: false }) })

    fireEvent.click(screen.getByText('રીસ્ટાર્ટ'))
    fireEvent.click(await screen.findByText('રહેવા દો'))

    expect(data!.db.notices.some(n => n.title === 'Should survive')).toBe(true)
    expect(data!.session.role).toBe('society_admin')
  })
})
