import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuoteStudio from '../QuoteStudio'

afterEach(() => { cleanup(); localStorage.clear() })
function setup() {
  localStorage.setItem('prangan_public_lang', 'en')
  render(<MemoryRouter><QuoteStudio /></MemoryRouter>)
}
describe('Quotation Studio', () => {
  it('creates a draft using the supplied amount and keeps it editable', () => {
    setup()
    for (const [label, value] of [
      ['Your business name', 'Alpha Repairs'],
      ['Customer name', 'Ravi'],
      ['Service / job', 'AC servicing'],
      ['Work details (optional)', 'Three AC units'],
    ]) {
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } })
    }
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Your quoted total (INR)' }), { target: { value: '4500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    const draft = screen.getByTestId('quote-preview') as HTMLTextAreaElement
    expect(draft.value).toContain('Alpha Repairs')
    expect(draft.value).toContain('₹4,500')
    fireEvent.change(draft, { target: { value: 'Edited quotation' } })
    expect(draft.value).toBe('Edited quotation')
    expect(screen.queryByRole('button', { name: 'Improve wording with Claude' })).not.toBeInTheDocument()
  })
  it('refuses incomplete input', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    expect((screen.getByTestId('quote-preview') as HTMLTextAreaElement).value).toBe('')
  })
})
