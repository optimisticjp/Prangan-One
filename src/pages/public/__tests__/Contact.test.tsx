import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DemoDataProvider } from '../../../lib/demoStore'
import Contact from '../Contact'
import { reportError } from '../../../lib/monitoring'
import { submitLeadToFormspree } from '../../../lib/formspree'

// Formspree (the primary path) succeeds; the Supabase lead write (the extra,
// shared record) fails - the exact case Contact's inner catch is written for.
vi.mock('../../../lib/monitoring', () => ({ reportError: vi.fn() }))
vi.mock('../../../lib/formspree', async (importActual) => ({
  ...(await importActual<typeof import('../../../lib/formspree')>()),
  submitLeadToFormspree: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../../lib/leads', async (importActual) => ({
  ...(await importActual<typeof import('../../../lib/leads')>()),
  submitPublicLeadToSupabase: vi.fn().mockRejectedValue(new Error('supabase lead write failed')),
}))

beforeEach(() => { localStorage.setItem('prangan_public_lang', 'en') })
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks() })

describe('Contact reports the silent Supabase lead-write failure without breaking the user', () => {
  it('reports the inner failure but the user still sees the success state, not an error', async () => {
    const { container } = render(
      <MemoryRouter><DemoDataProvider><Contact /></DemoDataProvider></MemoryRouter>,
    )
    const set = (id: string, value: string) => fireEvent.change(container.querySelector(id)!, { target: { value } })
    set('#contact-name', 'Test Person')
    set('#contact-phone', '9000000000')
    set('#contact-email', 'test@example.com')
    set('#contact-society', 'Test Society')

    fireEvent.submit(container.querySelector('form')!)

    // Formspree delivered, so the user sees success, never the error message.
    expect(await screen.findByText(/Thanks/)).toBeInTheDocument()

    // The otherwise-silent inner failure was reported, with safe context only.
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { where: 'contact_supabase_lead' })
    // The primary-path (Formspree) error report was NOT triggered - it succeeded.
    expect(reportError).not.toHaveBeenCalledWith(expect.anything(), { where: 'contact_formspree' })
  })

  it('shows a concise Gujarati failure message when the primary contact path fails', async () => {
    vi.mocked(submitLeadToFormspree).mockRejectedValueOnce(new Error('network internals should stay hidden'))
    localStorage.setItem('prangan_public_lang', 'gu')
    const { container } = render(
      <MemoryRouter><DemoDataProvider><Contact /></DemoDataProvider></MemoryRouter>,
    )
    const set = (id: string, value: string) => fireEvent.change(container.querySelector(id)!, { target: { value } })
    set('#contact-name', 'Test Person')
    set('#contact-phone', '9000000000')
    set('#contact-email', 'test@example.com')
    set('#contact-society', 'Test Society')

    fireEvent.submit(container.querySelector('form')!)

    expect(await screen.findByText(/વિનંતી મોકલી શકાઈ નથી/)).toBeInTheDocument()
    expect(screen.queryByText(/network internals/)).not.toBeInTheDocument()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { where: 'contact_formspree' })
  })

})
