import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.doUnmock('../../lib/demoMode')
  vi.doUnmock('../../lib/supabase')
  vi.resetModules()
})

async function renderLoginWith(demoMode: boolean, supabaseConfigured: boolean) {
  vi.doMock('../../lib/demoMode', () => ({ isDemoModeEnabled: () => demoMode }))
  vi.doMock('../../lib/supabase', () => ({ supabaseConfigured, supabase: null }))
  // Import both from the same fresh resolution pass - Login pulls in
  // useData from store.tsx, and vi.resetModules() in the previous test's
  // afterEach means a stale, separately-imported DataProvider would be a
  // different module instance (different React Context object) than the
  // one Login's fresh copy of useData() looks up.
  const { default: Login } = await import('../Login')
  const { DataProvider } = await import('../../lib/store')
  return render(<MemoryRouter><DataProvider><Login /></DataProvider></MemoryRouter>)
}

describe('Login demo mode gating', () => {
  it('shows demo shortcuts when demo mode is enabled', async () => {
    await renderLoginWith(true, true)
    expect(await screen.findByText('હું રહેવાસી છું')).toBeInTheDocument()
    expect(screen.getByText('Prangan One ઓનર કન્સોલ')).toBeInTheDocument()
  })

  it('hides demo shortcuts when demo mode is disabled', async () => {
    await renderLoginWith(false, true)
    expect(await screen.findByText('લોગિન')).toBeInTheDocument()
    expect(screen.queryByText('હું રહેવાસી છું')).not.toBeInTheDocument()
    expect(screen.queryByText('Prangan One ઓનર કન્સોલ')).not.toBeInTheDocument()
  })

  it('shows the real email login form when Supabase is configured', async () => {
    await renderLoginWith(false, true)
    expect(await screen.findByPlaceholderText('તમારો ઈમેલ')).toBeInTheDocument()
  })

  it('shows an honest not-configured message instead of a fake email form when Supabase is not configured', async () => {
    await renderLoginWith(false, false)
    expect(await screen.findByText(/લોગિન સેવા હાલમાં સેટ થઈ રહી છે/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('તમારો ઈમેલ')).not.toBeInTheDocument()
  })
})
