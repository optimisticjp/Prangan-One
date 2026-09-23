import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.doUnmock('../../lib/supabase')
  vi.resetModules()
})

async function renderLoginWith(supabaseConfigured: boolean) {
  vi.doMock('../../lib/supabase', () => ({ supabaseConfigured, supabase: null }))
  const { default: Login } = await import('../Login')
  const { DataProvider } = await import('../../lib/store')
  return render(<MemoryRouter><DataProvider><Login /></DataProvider></MemoryRouter>)
}

describe('Login never shows demo shortcuts, regardless of demo mode', () => {
  it('has no resident/admin/accountant/owner shortcut buttons', async () => {
    await renderLoginWith(true)
    expect(await screen.findByText('લોગિન')).toBeInTheDocument()
    expect(screen.queryByText('હું રહેવાસી છું')).not.toBeInTheDocument()
    expect(screen.queryByText('Prangan One ઓનર કન્સોલ')).not.toBeInTheDocument()
  })

  it('shows the real email login form when Supabase is configured', async () => {
    await renderLoginWith(true)
    expect(await screen.findByPlaceholderText('આપનો ઈમેલ')).toBeInTheDocument()
  })

  it('shows an honest not-configured message instead of a fake email form when Supabase is not configured', async () => {
    await renderLoginWith(false)
    expect(await screen.findByText(/લોગિન સેવા હાલમાં સેટ થઈ રહી છે/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('આપનો ઈમેલ')).not.toBeInTheDocument()
  })
})

describe('Login branding depends on explicit society context, not the raw default', () => {
  it('shows generic Prangan One branding for a brand-new session (the bug this fixes)', async () => {
    await renderLoginWith(true)
    // Rajhans Tower is the seeded default society - a generic visitor must
    // never see it by name, only Prangan One's own identity.
    expect(screen.queryByText('રાજહંસ ટાવર')).not.toBeInTheDocument()
    expect(screen.getByText('The Society OS')).toBeInTheDocument()
  })

  it('shows the specific society once a share link set an explicit context', async () => {
    localStorage.setItem('rt_session_v3', JSON.stringify({ role: null, flatId: null, societyId: 'soc_rajhans', explicitSociety: true }))
    await renderLoginWith(true)
    expect(await screen.findByText('રાજહંસ ટાવર')).toBeInTheDocument()
  })
})
