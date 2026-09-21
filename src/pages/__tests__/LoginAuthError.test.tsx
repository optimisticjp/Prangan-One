import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.doUnmock('../../lib/supabase')
  vi.doUnmock('../../lib/auth')
  vi.resetModules()
})

describe('portal login keeps auth failure generic', () => {
  it('does not leak the raw provider password error', async () => {
    vi.doMock('../../lib/supabase', () => ({ supabaseConfigured: true, supabase: null }))
    vi.doMock('../../lib/auth', async importActual => ({
      ...(await importActual<typeof import('../../lib/auth')>()),
      signInWithPassword: vi.fn().mockRejectedValue(new Error('Invalid login credentials')),
    }))
    const { default: PortalLogin } = await import('../PortalLogin')
    const { DataProvider } = await import('../../lib/store')

    render(<MemoryRouter><DataProvider><PortalLogin portal="resident" /></DataProvider></MemoryRouter>)

    fireEvent.click(await screen.findByText('Use password instead'))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'someone@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'definitely-wrong' } })
    fireEvent.click(screen.getByText('Login'))

    const error = await screen.findByText(/Login failed/)
    expect(error).toBeInTheDocument()
    expect(screen.queryByText(/Invalid login credentials/)).not.toBeInTheDocument()
  })
})
