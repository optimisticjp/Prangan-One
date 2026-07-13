import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider } from '../../../lib/store'
import Payments from '../Payments'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

function renderPayments() {
  return render(<MemoryRouter><DataProvider><Payments /></DataProvider></MemoryRouter>)
}

describe('failed-payment wording uses નિષ્ફળ, not the colloquial ફેલ', () => {
  it('labels the "record as failed" option with નિષ્ફળ', () => {
    renderPayments()
    const label = screen.getByText(/ચુકવણી તરીકે નોંધો/).closest('label')!
    expect(label.textContent).toContain('નિષ્ફળ')
    expect(label.textContent).not.toContain('ફેલ')
  })

  it('records a failed payment with the professional term while preserving the exact financial meaning', () => {
    const { container } = renderPayments()
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    fireEvent.click(checkbox)
    fireEvent.change(screen.getByPlaceholderText('1200'), { target: { value: '1500' } })
    fireEvent.click(screen.getByText('ચુકવણી નોંધો'))

    const msg = screen.getByText(/નિષ્ફળ ગયેલી ચુકવણી નોંધાઈ/)
    expect(msg).toBeInTheDocument()
    // The high-risk facts must stay intact: the bill is unaffected and no
    // receipt is created for a failed payment.
    expect(msg.textContent).toContain('બિલ પર અસર નહીં થાય')
    expect(msg.textContent).toContain('રસીદ નહીં બને')
    expect(msg.textContent).not.toContain('ફેલ')
  })
})
