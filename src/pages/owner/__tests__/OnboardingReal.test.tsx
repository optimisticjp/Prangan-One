import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestDataProvider } from '../../../lib/__tests__/testUtils'

/**
 * The test that would have caught the real bug this build fixes, and the
 * existing Onboarding.test.tsx genuinely could not have, no matter how
 * many scenarios it covered - every one of those tests only ever checks
 * db.societies/db.flats, which is the exact same shared local state a
 * real session's optimistic updates also write to. A wizard that quietly
 * never reached the real database at all would have made every one of
 * those tests pass anyway. This test is the difference: a real owner
 * session, walked through the actual wizard, checked against whether the
 * real write functions were actually called, not just whether the
 * screen looked right afterward.
 *
 * Hoisted mock, same reasoning as syncRetry.test.tsx: store.tsx imports
 * realData.ts statically, so this has to be set up before either module
 * is imported for the mock to actually intercept calls made from inside
 * the wizard's own calls into the store.
 */
vi.mock('../../../lib/realData', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/realData')>('../../../lib/realData')
  return {
    ...actual,
    insertSocietyReal: vi.fn(async () => {}),
    insertFlatReal: vi.fn(async () => {}),
    insertBillsReal: vi.fn(async () => {}),
    updateSocietyStatusReal: vi.fn(async () => {}),
    updateSocietyReal: vi.fn(async () => {}),
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

function fillStep0(nameEn = 'Real Session Society') {
  fireEvent.change(screen.getByPlaceholderText('દા.ત. શ્રી હરિ રેસિડન્સી'), { target: { value: 'ટેસ્ટ સોસાયટી' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Shree Hari Residency'), { target: { value: nameEn } })
  fireEvent.change(screen.getByPlaceholderText('દા.ત. કતારગામ, સુરત'), { target: { value: 'Test Address' } })
}

describe('Onboarding wizard, walked through as a genuinely real owner session - this is the test that actually proves the bug is fixed', () => {
  it('society creation calls the real insert function, not just local state', async () => {
    const { DataProvider, useData } = await import('../../../lib/store')
    const realData = await import('../../../lib/realData')
    const Onboarding = (await import('../Onboarding')).default

    const { result: session } = renderHook(() => useData(), { wrapper: TestDataProvider })
    // a real owner, exactly like a genuine login would resolve - not the
    // local demo path every previous onboarding test used
    fireEventResolveOwner(session)

    render(<MemoryRouter><DataProvider><Onboarding /></DataProvider></MemoryRouter>)
    fillStep0('Real Session Society')
    fireEvent.click(screen.getByText('આગળ'))

    await waitFor(() => {
      expect(realData.insertSocietyReal).toHaveBeenCalledTimes(1)
    })
    const createdSociety = (realData.insertSocietyReal as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(createdSociety.nameEn).toBe('Real Session Society')
  })

  it('the full wizard - flats import and bill generation - actually reaches the real database, not just the screen', async () => {
    const realData = await import('../../../lib/realData')
    const { DataProvider, useData } = await import('../../../lib/store')
    const Onboarding = (await import('../Onboarding')).default

    const { result: session } = renderHook(() => useData(), { wrapper: TestDataProvider })
    fireEventResolveOwner(session)

    render(<MemoryRouter><DataProvider><Onboarding /></DataProvider></MemoryRouter>)
    fillStep0('Full Real Wizard Society')
    fireEvent.click(screen.getByText('આગળ')) // creates the society -> branding
    await waitFor(() => { expect(realData.insertSocietyReal).toHaveBeenCalledTimes(1) })

    fireEvent.click(screen.getByText('આગળ')) // -> billing
    fireEvent.click(screen.getByText('આગળ')) // -> access
    fireEvent.click(screen.getByText('આગળ')) // -> modules
    fireEvent.click(screen.getByText('આગળ')) // -> flats

    const csv = 'number,floor,ownerName,phone,email,occupancy,tenantName,tenantEmail,sqft\n101,1,Real Owner,9000000000,,owner,,,900'
    const file = new File([csv], 'flats.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"][accept=".csv,text/csv"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText('1 યોગ્ય હરોળ')
    fireEvent.click(screen.getByText('1 ફ્લેટ ઉમેરો'))
    await screen.findByText('1 ફ્લેટ ઉમેરાયા')

    // this is the actual proof: a real flat insert reaching the real
    // write function, mid-wizard, not deferred to some later reconnect step
    await waitFor(() => {
      expect(realData.insertFlatReal).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('આગળ')) // -> preview (read-only summary)
    fireEvent.click(screen.getByText('આગળ')) // -> bills, where the actual "generate" button lives
    fireEvent.click(await screen.findByText('1 બિલ બનાવો'))
    await waitFor(() => {
      expect(realData.insertBillsReal).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('આગળ')) // -> activate
    fireEvent.click(screen.getByRole('button', { name: /સોસાયટી સક્રિય કરો/ }))
    await waitFor(() => {
      expect(realData.updateSocietyStatusReal).toHaveBeenCalled()
    })
  })

  it('a real owner\u2019s session role stays "owner" throughout the wizard - never silently switches to a local impersonation the way the old, buggy version did', async () => {
    const { DataProvider, useData } = await import('../../../lib/store')
    const Onboarding = (await import('../Onboarding')).default

    const { result: session } = renderHook(() => useData(), { wrapper: TestDataProvider })
    fireEventResolveOwner(session)

    render(<MemoryRouter><DataProvider><Onboarding /></DataProvider></MemoryRouter>)
    fillStep0('Role Check Society')
    fireEvent.click(screen.getByText('આગળ'))

    let afterCreate: ReturnType<typeof renderHook<ReturnType<typeof useData>, unknown>>['result']
    act(() => {
      afterCreate = renderHook(() => useData(), { wrapper: TestDataProvider }).result
    })
    expect(afterCreate!.current.session.role).toBe('owner')
    expect(afterCreate!.current.session.isRealSession).toBe(true)
  })
})

function fireEventResolveOwner(session: { current: { resolveRealSession: (m: { role: 'owner'; societyId: string; flatId: null }) => void } }) {
  act(() => {
    session.current.resolveRealSession({ role: 'owner', societyId: 'soc_rajhans', flatId: null })
  })
}
