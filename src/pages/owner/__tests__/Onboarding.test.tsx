import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, useData } from '../../../lib/store'
import { TestDataProvider } from '../../../lib/__tests__/testUtils'
import { renderHook } from '@testing-library/react'
import Onboarding from '../Onboarding'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderOnboarding() {
  return render(<MemoryRouter><DataProvider><Onboarding /></DataProvider></MemoryRouter>)
}

function fillStep0(nameEn = 'Test Onboarding Society') {
  fireEvent.change(screen.getByPlaceholderText('દા.ત. શ્રી હરિ રેસિડન્સી'), { target: { value: 'ટેસ્ટ સોસાયટી' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Shree Hari Residency'), { target: { value: nameEn } })
  fireEvent.change(screen.getByPlaceholderText('દા.ત. કતારગામ, સુરત'), { target: { value: 'Test Address' } })
}

describe('Onboarding wizard: the society is created right after step 1, not at the very end', () => {
  it('creating step 1 actually creates a real society, immediately reachable in db.societies', () => {
    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    const before = result.current.rawDb.societies.length

    renderOnboarding()
    fillStep0('Early Creation Society')
    fireEvent.click(screen.getByText('આગળ'))

    // a fresh useData() read reflects the same underlying db - confirms
    // the society genuinely exists now, one step in, not ten
    const { result: after } = renderHook(() => useData(), { wrapper: TestDataProvider })
    expect(after.current.rawDb.societies.length).toBe(before + 1)
    expect(after.current.rawDb.societies.some(s => s.nameEn === 'Early Creation Society')).toBe(true)
  })

  it('the newly created society has no trialStartedAt yet - the trial has not started counting down', () => {
    renderOnboarding()
    fillStep0('No Trial Yet Society')
    fireEvent.click(screen.getByText('આગળ'))

    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    const soc = result.current.rawDb.societies.find(s => s.nameEn === 'No Trial Yet Society')
    expect(soc?.trialStartedAt).toBeUndefined()
    expect(soc?.subscriptionStatus).toBe('trial')
  })
})

describe('Onboarding wizard: flats and bills actually attach to the real society mid-wizard', () => {
  it('importing a CSV of flats during the wizard adds real flats scoped to this exact society, not some other one', async () => {
    renderOnboarding()
    fillStep0('Flats Import Society')
    fireEvent.click(screen.getByText('આગળ')) // creates the society, -> branding
    fireEvent.click(screen.getByText('આગળ')) // -> billing
    fireEvent.click(screen.getByText('આગળ')) // -> access
    fireEvent.click(screen.getByText('આગળ')) // -> modules
    fireEvent.click(screen.getByText('આગળ')) // -> flats

    const csv = 'number,floor,ownerName,phone,email,occupancy,tenantName,tenantEmail,sqft\n101,1,Test Owner,9000000000,,owner,,,900'
    const file = new File([csv], 'flats.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"][accept=".csv,text/csv"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    // the CSV parse is async (file.text()) - wait for the review table to
    // actually show up before confirming the import
    await screen.findByText('1 યોગ્ય હરોળ')
    fireEvent.click(screen.getByText('1 ફ્લેટ ઉમેરો'))
    await screen.findByText('1 ફ્લેટ ઉમેરાયા')

    const { result } = renderHook(() => useData(), { wrapper: TestDataProvider })
    const soc = result.current.rawDb.societies.find(s => s.nameEn === 'Flats Import Society')
    const flat = result.current.rawDb.flats.find(f => f.number === '101' && f.societyId === soc?.id)
    expect(flat?.ownerName).toBe('Test Owner')
  })
})

describe('Onboarding wizard: activation is a real, separate step, not automatic', () => {
  it('the society stays without a start trial date all the way up to the activate step, then gets one', () => {
    renderOnboarding()
    fillStep0('Activation Step Society')
    fireEvent.click(screen.getByText('આગળ')) // creates the society, -> branding
    fireEvent.click(screen.getByText('આગળ')) // -> billing
    fireEvent.click(screen.getByText('આગળ')) // -> access
    fireEvent.click(screen.getByText('આગળ')) // -> modules
    fireEvent.click(screen.getByText('આગળ')) // -> flats
    fireEvent.click(screen.getByText('આગળ')) // -> preview
    fireEvent.click(screen.getByText('આગળ')) // -> bills
    fireEvent.click(screen.getByText('આગળ')) // -> activate

    const { result: beforeActivate } = renderHook(() => useData(), { wrapper: TestDataProvider })
    const socBefore = beforeActivate.current.rawDb.societies.find(s => s.nameEn === 'Activation Step Society')
    expect(socBefore?.trialStartedAt).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: /સોસાયટી સક્રિય કરો/ }))

    const { result: afterActivate } = renderHook(() => useData(), { wrapper: TestDataProvider })
    const socAfter = afterActivate.current.rawDb.societies.find(s => s.nameEn === 'Activation Step Society')
    expect(socAfter?.trialStartedAt).toBeDefined()
  })
})
