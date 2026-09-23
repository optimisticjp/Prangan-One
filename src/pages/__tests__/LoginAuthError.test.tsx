import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.doUnmock('../../lib/supabase')
  vi.doUnmock('../../lib/auth')
  vi.resetModules()
})

describe('Login keeps auth failure generic and non-revealing', () => {
  it('shows one combined error that never says whether the email or the password was wrong', async () => {
    vi.doMock('../../lib/supabase', () => ({ supabaseConfigured: true, supabase: null }))
    vi.doMock('../../lib/auth', async (importActual) => ({
      ...(await importActual<typeof import('../../lib/auth')>()),
      signInWithPassword: vi.fn().mockRejectedValue(new Error('Invalid login credentials')),
    }))
    const { default: Login } = await import('../Login')
    const { DataProvider } = await import('../../lib/store')

    render(<MemoryRouter><DataProvider><Login /></DataProvider></MemoryRouter>)

    fireEvent.click(await screen.findByText('પાસવર્ડથી લોગિન કરો'))
    fireEvent.change(screen.getByLabelText('ઈમેલ'), { target: { value: 'someone@example.com' } })
    fireEvent.change(screen.getByLabelText('પાસવર્ડ'), { target: { value: 'definitely-wrong' } })
    fireEvent.click(screen.getByText('લોગિન કરો'))

    const err = await screen.findByText(/લોગિન થઈ શક્યું નથી/)
    expect(err).toBeInTheDocument()
    // Standardised retry wording.
    expect(err.textContent).toContain('ફરી પ્રયાસ કરો')
    // The raw provider error must never leak to the user.
    expect(screen.queryByText(/Invalid login credentials/)).not.toBeInTheDocument()
    // It must not disclose which field was wrong, or whether the account exists.
    expect(err.textContent).not.toMatch(/મળ્યો નથી|અસ્તિત્વ|ખોટો પાસવર્ડ|ખોટો ઈમેલ|નોંધાયેલ નથી/)
  })
})
