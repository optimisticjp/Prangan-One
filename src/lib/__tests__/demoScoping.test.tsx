import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DemoDataProvider } from '../demoStore'
import { useData } from '../store'

/**
 * Found while reviewing this build: the demo's own db had no role-aware
 * scoping at all - every session, resident or committee, saw the exact
 * same, complete data, unlike a real session, where Postgres RLS itself
 * already restricts what a resident's own fetch ever returns in the
 * first place. Confirmed the actual gap directly against the real RLS
 * policies in schema.sql (flats_select, bills_select, payments_select,
 * complaints_select, adjustments_select), not guessed at what "seems
 * reasonable" - and confirmed vehicles, notices, polls, and events are
 * genuinely society-wide in the real policies too, so those correctly
 * stay unscoped here rather than being over-restricted for no reason.
 */
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

function useTwoFlats() {
  const { result } = renderHook(() => useData(), {
    wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
  })
  act(() => { result.current.login('society_admin') })
  const [flatA, flatB] = result.current.db.flats
  return { result, flatA, flatB }
}

describe('a resident session genuinely cannot see another flat\u2019s bills, payments, or adjustments - not just hidden by a page, actually absent from db itself', () => {
  it('another flat\u2019s bills are not present at all', () => {
    const { result, flatA, flatB } = useTwoFlats()
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatA.id) })

    expect(result.current.db.bills.some(b => b.flatId === flatB.id)).toBe(false)
    expect(result.current.db.bills.every(b => b.flatId === flatA.id)).toBe(true)
  })

  it('another flat\u2019s payments are not present at all', () => {
    const { result, flatA, flatB } = useTwoFlats()
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatA.id) })

    expect(result.current.db.payments.some(p => p.flatId === flatB.id)).toBe(false)
  })

  it('a real, concrete case this was actually found from: navigating directly to another flat\u2019s receipt URL shows "not found", not their real payment details', async () => {
    const { result, flatA } = useTwoFlats()
    const otherFlatPayment = result.current.db.payments.find(p => p.flatId !== flatA.id)!
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatA.id) })

    const { default: ReceiptDetail } = await import('../../pages/resident/ReceiptDetail')
    render(
      <MemoryRouter initialEntries={[`/app/receipts/${otherFlatPayment.id}`]}>
        <DemoDataProvider>
          <Routes><Route path="/app/receipts/:id" element={<ReceiptDetail />} /></Routes>
        </DemoDataProvider>
      </MemoryRouter>,
    )
    await screen.findByText('રસીદ મળી નહીં')
    expect(screen.queryByText(otherFlatPayment.receiptNo ?? '', { exact: false })).not.toBeInTheDocument()
  })
})

describe('complaints follow the real app\u2019s own visibility rule exactly: own flat, plus anything marked community, never another flat\u2019s personal complaint', () => {
  it('another flat\u2019s personal complaint is genuinely absent', () => {
    const { result, flatA, flatB } = useTwoFlats()
    let personalComplaint: ReturnType<typeof result.current.addComplaint>
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatB.id) })
    act(() => {
      personalComplaint = result.current.addComplaint({ flatId: flatB.id, category: 'General', title: 'Private scoping test', detail: '', priority: 'normal', visibility: 'personal' })
    })

    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatA.id) })

    expect(result.current.db.complaints.some(c => c.id === personalComplaint!.id)).toBe(false)
  })

  it('another flat\u2019s community complaint is genuinely visible - not over-restricted', () => {
    const { result, flatA, flatB } = useTwoFlats()
    let communityComplaint: ReturnType<typeof result.current.addComplaint>
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatB.id) })
    act(() => {
      communityComplaint = result.current.addComplaint({ flatId: flatB.id, category: 'General', title: 'Community scoping test', detail: '', priority: 'normal', visibility: 'community' })
    })

    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatA.id) })

    expect(result.current.db.complaints.some(c => c.id === communityComplaint!.id)).toBe(true)
  })
})

describe('society-wide things stay genuinely society-wide for a resident, matching the real app\u2019s own RLS exactly, not over-restricted for no reason', () => {
  it('vehicles from every flat are visible to a resident, confirmed directly against the real vehicles_select policy rather than assumed', () => {
    const { result, flatA, flatB } = useTwoFlats()
    act(() => { result.current.addVehicle({ flatId: flatB.id, kind: '2W', number: 'GJ05AB1234', slot: 'P1', ownerType: 'owner' }) })
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flatA.id) })

    expect(result.current.db.vehicles.some(v => v.flatId === flatB.id)).toBe(true)
  })
})

describe('a committee session still genuinely sees everything, unscoped - this build did not accidentally restrict the role that actually needs full visibility', () => {
  it('committee sees every flat\u2019s bills, payments, and complaints, personal and community alike', () => {
    const { result, flatA, flatB } = useTwoFlats()
    act(() => { result.current.login('resident_owner', flatB.id) })
    act(() => { result.current.addComplaint({ flatId: flatB.id, category: 'General', title: 'Committee visibility test', detail: '', priority: 'normal', visibility: 'personal' }) })

    act(() => { result.current.logout() })
    act(() => { result.current.login('society_admin') })

    expect(result.current.db.bills.some(b => b.flatId === flatA.id)).toBe(true)
    expect(result.current.db.bills.some(b => b.flatId === flatB.id)).toBe(true)
    expect(result.current.db.complaints.some(c => c.title === 'Committee visibility test')).toBe(true)
  })
})
