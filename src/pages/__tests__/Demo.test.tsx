import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.doUnmock('../../lib/demoMode')
  vi.doUnmock('../../lib/demoStore')
  vi.resetModules()
})

async function renderDemoWith(demoMode: boolean) {
  vi.doMock('../../lib/demoMode', () => ({ isDemoModeEnabled: () => demoMode }))
  const { default: Demo } = await import('../Demo')
  // Demo.tsx deliberately no longer needs DataProvider at all - it reads
  // the demo's own seed data directly and never calls useData().
  return render(<MemoryRouter><Demo /></MemoryRouter>)
}

describe('/demo page', () => {
  it('shows the role shortcuts when demo mode is enabled', async () => {
    await renderDemoWith(true)
    expect(await screen.findByText('હું રહેવાસી છું')).toBeInTheDocument()
    expect(screen.getByText('હું કમિટી મેમ્બર છું')).toBeInTheDocument()
    expect(screen.getByText('હું એકાઉન્ટન્ટ છું')).toBeInTheDocument()
  })

  it('never offers the owner console role at all - the public sales demo should never expose it', async () => {
    await renderDemoWith(true)
    await screen.findByText('હું રહેવાસી છું')
    expect(screen.queryByText('Prangan One ઓનર કન્સોલ')).not.toBeInTheDocument()
    expect(screen.queryByText(/ઓનર/)).not.toBeInTheDocument()
  })

  it('shows an honest not-available message instead when demo mode is disabled', async () => {
    await renderDemoWith(false)
    expect(await screen.findByText('ડેમો હાલમાં ચાલુ નથી')).toBeInTheDocument()
    expect(screen.queryByText('હું રહેવાસી છું')).not.toBeInTheDocument()
  })

  it('the "real login is here" link genuinely calls exitDemo (a full exit), not a plain client-side navigate', async () => {
    // exitDemo is what unmounts the demo provider (clear storage + full
    // reload). A plain nav('/login') would leave DemoDataProvider mounted, so
    // a real login attempt from there would silently do nothing. Spy on
    // exitDemo to prove the link goes through it now.
    vi.doMock('../../lib/demoMode', () => ({ isDemoModeEnabled: () => true }))
    const exitDemo = vi.fn()
    vi.doMock('../../lib/demoStore', async () => {
      const actual = await vi.importActual<typeof import('../../lib/demoStore')>('../../lib/demoStore')
      return { ...actual, exitDemo }
    })
    const { default: Demo } = await import('../Demo')
    render(<MemoryRouter><Demo /></MemoryRouter>)

    fireEvent.click(await screen.findByText('અહીં'))
    expect(exitDemo).toHaveBeenCalledTimes(1)
  })
})
