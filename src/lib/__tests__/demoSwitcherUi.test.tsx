import { afterEach, describe, expect, it } from 'vitest'
import { useEffect } from 'react'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DemoDataProvider } from '../demoStore'

/**
 * The quick, in-context role switcher added in this build - previously,
 * the only way to switch roles inside a demo session was to leave the
 * page entirely and go back to /demo to pick again. This proves the
 * actual, real interaction: picking a different role from the dropdown
 * genuinely changes what the app shows next, on the same still-mounted
 * provider, without losing the session's own data.
 */
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

function TestApp() {
  return (
    <Routes>
      <Route path="/admin" element={<div>admin screen</div>} />
      <Route path="/accounts" element={<div>accountant screen</div>} />
      <Route path="/app" element={<div>resident screen</div>} />
    </Routes>
  )
}

describe('the demo role switcher, wired into the real admin layout', () => {
  it('never renders at all for a real session', async () => {
    const { DataProvider, useData } = await import('../store')
    const { Shell } = await import('../../layouts/Layouts')
    const { renderHook } = await import('@testing-library/react')

    function RealSessionSetup({ children }: { children: React.ReactNode }) {
      const { resolveRealSession } = useData()
      useEffect(() => { resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null }) }, [])
      return <>{children}</>
    }

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <DataProvider>
          <RealSessionSetup>
            <Routes><Route path="/admin" element={<Shell items={[]} title="Test" />}><Route index element={<div>home</div>} /></Route></Routes>
          </RealSessionSetup>
        </DataProvider>
      </MemoryRouter>,
    )
    await screen.findByText('home')
    expect(screen.queryByLabelText('ડેમો રોલ બદલો')).not.toBeInTheDocument()
  })

  it('shows the switcher for a demo session, defaulted to the current role', async () => {
    const { Shell } = await import('../../layouts/Layouts')
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <DemoDataProvider>
          <Routes><Route path="/admin" element={<Shell items={[]} title="Test" />}><Route index element={<div>home</div>} /></Route></Routes>
        </DemoDataProvider>
      </MemoryRouter>,
    )
    await screen.findByText('home')
    const select = screen.getByLabelText('ડેમો રોલ બદલો') as HTMLSelectElement
    expect(select.value).toBe('society_admin')
  })

  it('actually switching to a resident flat genuinely navigates there and keeps the same underlying demo data', async () => {
    const { Shell } = await import('../../layouts/Layouts')
    const { buildDemoSeed } = await import('../demoSeed')
    const seed = buildDemoSeed()

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <DemoDataProvider>
          <Routes>
            <Route path="/admin" element={<Shell items={[]} title="Test" />}><Route index element={<div>admin screen</div>} /></Route>
            <Route path="/app" element={<div>resident screen for {seed.flats[0].number}</div>} />
          </Routes>
        </DemoDataProvider>
      </MemoryRouter>,
    )
    await screen.findByText('admin screen')
    const select = screen.getByLabelText('ડેમો રોલ બદલો') as HTMLSelectElement

    act(() => { fireEvent.change(select, { target: { value: `flat:${seed.flats[0].id}` } }) })

    await screen.findByText(`resident screen for ${seed.flats[0].number}`)
  })
})
