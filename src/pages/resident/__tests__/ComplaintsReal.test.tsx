import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestDataProvider } from '../../../lib/__tests__/testUtils'

/**
 * A real resident, walked through the actual complaint form, confirming
 * the real database function genuinely gets called - the same kind of
 * proof build 1 in this plan wrote for onboarding, applied to the other
 * core, everyday flow every resident actually uses. This is what "check
 * everything, don't just fix the one thing that got named" is supposed
 * to mean in practice, not just a search for suspicious code.
 */
vi.mock('../../../lib/realData', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/realData')>('../../../lib/realData')
  return {
    ...actual,
    insertComplaintReal: vi.fn(async () => {}),
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

describe('a real resident filing a complaint actually reaches the real database, not just the local screen', () => {
  it('submitting the actual complaint form calls insertComplaintReal with the real complaint', async () => {
    const realData = await import('../../../lib/realData')
    const { DataProvider, useData } = await import('../../../lib/store')
    const Complaints = (await import('../Complaints')).default

    const { result: session } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      session.current.resolveRealSession({ role: 'resident_owner', societyId: 'soc_rajhans', flatId: 'flat_101' })
    })

    render(<MemoryRouter><DataProvider><Complaints /></DataProvider></MemoryRouter>)

    fireEvent.click(screen.getByText('ફરિયાદ કરો'))
    fireEvent.change(await screen.findByPlaceholderText('દા.ત. લિફ્ટ અવાજ કરે છે'), { target: { value: 'Real complaint end to end' } })
    fireEvent.click(screen.getByText('ફરિયાદ નોંધાવો'))

    await waitFor(() => {
      expect(realData.insertComplaintReal).toHaveBeenCalledTimes(1)
    })
    const submitted = (realData.insertComplaintReal as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(submitted.title).toBe('Real complaint end to end')
    expect(submitted.flatId).toBe('flat_101')
  })

  it('the same form, walked through as the local demo, never touches the real database function at all', async () => {
    const realData = await import('../../../lib/realData')
    const { DataProvider } = await import('../../../lib/store')
    const Complaints = (await import('../Complaints')).default

    render(<MemoryRouter><DataProvider><Complaints /></DataProvider></MemoryRouter>)

    fireEvent.click(screen.getByText('ફરિયાદ કરો'))
    fireEvent.change(await screen.findByPlaceholderText('દા.ત. લિફ્ટ અવાજ કરે છે'), { target: { value: 'Demo complaint, should stay local' } })
    fireEvent.click(screen.getByText('ફરિયાદ નોંધાવો'))

    await waitFor(() => {
      expect(screen.queryByText('ફરિયાદ કરો')).toBeInTheDocument()
    })
    expect(realData.insertComplaintReal).not.toHaveBeenCalled()
  })
})
