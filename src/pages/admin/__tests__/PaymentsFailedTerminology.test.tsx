import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, useData } from '../../../lib/store'
import { TestDataProvider } from '../../../lib/__tests__/testUtils'
import type { Payment } from '../../../lib/types'
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

describe('a failed payment creates no receipt and leaves the bill untouched (high-risk meaning)', () => {
  it('recordPayment with failed:true yields a failed status, no receipt number, and an unchanged bill', () => {
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })

    const bill = result.current.db.bills.find(b => b.paidAmount < b.amount) ?? result.current.db.bills[0]
    expect(bill).toBeDefined()
    const paidBefore = bill.paidAmount

    let pay: Payment | null = null
    act(() => {
      pay = result.current.recordPayment({ flatId: bill.flatId, billId: bill.id, amount: bill.amount, mode: 'upi', failed: true })
    })

    expect((pay as Payment | null)?.status).toBe('failed')
    expect((pay as Payment | null)?.receiptNo).toBeUndefined() // no receipt for a failed payment
    const billAfter = result.current.db.bills.find(b => b.id === bill.id)
    expect(billAfter?.paidAmount).toBe(paidBefore) // bill is unaffected
  })
})
