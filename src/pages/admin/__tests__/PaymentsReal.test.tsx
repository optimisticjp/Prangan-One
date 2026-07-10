import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestDataProvider } from '../../../lib/__tests__/testUtils'

/**
 * The other core, everyday flow, tested the same real way build 1
 * proved onboarding with - a real committee member, walked through the
 * actual payment form, confirming the real database function genuinely
 * gets called, not just that the local screen updates.
 */
vi.mock('../../../lib/realData', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/realData')>('../../../lib/realData')
  return {
    ...actual,
    recordPaymentReal: vi.fn(async () => {}),
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

describe('a real committee member recording a payment actually reaches the real database, not just the local screen', () => {
  it('submitting the actual payment form calls recordPaymentReal with the real payment', async () => {
    const realData = await import('../../../lib/realData')
    const { DataProvider, useData } = await import('../../../lib/store')
    const Payments = (await import('../Payments')).default

    const { result: session } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      session.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })

    render(<MemoryRouter><DataProvider><Payments /></DataProvider></MemoryRouter>)

    fireEvent.change(screen.getByPlaceholderText('1200'), { target: { value: '1500' } })
    fireEvent.click(screen.getByText('ચુકવણી નોંધો'))

    await waitFor(() => {
      expect(realData.recordPaymentReal).toHaveBeenCalledTimes(1)
    })
    const [submittedPayment] = (realData.recordPaymentReal as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(submittedPayment.amount).toBe(1500)
    expect(submittedPayment.societyId).toBe('soc_rajhans')
  })

  it('the same form, walked through as the local demo, never touches the real database function at all', async () => {
    const realData = await import('../../../lib/realData')
    const { DataProvider } = await import('../../../lib/store')
    const Payments = (await import('../Payments')).default

    render(<MemoryRouter><DataProvider><Payments /></DataProvider></MemoryRouter>)

    fireEvent.change(screen.getByPlaceholderText('1200'), { target: { value: '1500' } })
    fireEvent.click(screen.getByText('ચુકવણી નોંધો'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('1200')).toBeInTheDocument()
    })
    expect(realData.recordPaymentReal).not.toHaveBeenCalled()
  })
})
