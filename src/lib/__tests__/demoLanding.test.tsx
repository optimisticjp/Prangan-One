import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DemoDataProvider } from '../demoStore'
import { useData } from '../store'
import { loadGuideState } from '../demoGuide'

/**
 * The actual landing experience and guided walkthrough, proven two
 * ways: that picking a problem-framed card on /demo genuinely sets up
 * the right guide and starts the right session, and that the guide
 * itself, once running, genuinely tracks real progress through a real
 * journey rather than being a static, disconnected checklist.
 */
function stubLocation() {
  const stub = { href: '' }
  const original = window.location
  // @ts-expect-error - deliberately stubbing window.location for this one call
  delete window.location
  // @ts-expect-error - see above
  window.location = stub
  return {
    stub, restore: () => {
      // @ts-expect-error - restoring the real window.location
      window.location = original
    },
  }
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('the new /demo landing page leads with problem-framed cards, not a role picker, matching the spec directly', () => {
  it('shows all three problem cards, and still keeps the role picker further down for free exploration', async () => {
    vi.doMock('../demoMode', () => ({ isDemoModeEnabled: () => true }))
    const { default: Demo } = await import('../../pages/Demo')
    render(<MemoryRouter><Demo /></MemoryRouter>)

    expect(screen.getByText('મેન્ટેનન્સ ઝડપથી ઉઘરાવો')).toBeInTheDocument()
    expect(screen.getByText('ફરિયાદ યોગ્ય રીતે ઉકેલો')).toBeInTheDocument()
    expect(screen.getByText('સોસાયટીના હિસાબ સ્પષ્ટ જુઓ')).toBeInTheDocument()
    // still there, for anyone who wants to explore freely instead
    expect(screen.getByText('હું કમિટી મેમ્બર છું')).toBeInTheDocument()
    vi.doUnmock('../demoMode')
  })

  it('picking the payment journey card genuinely sets up the real guide state and starts the right session, targeting a genuinely overdue flat', async () => {
    vi.doMock('../demoMode', () => ({ isDemoModeEnabled: () => true }))
    const { default: Demo } = await import('../../pages/Demo')
    const { buildDemoSeed } = await import('../demoSeed')
    const seed = buildDemoSeed()
    const { restore } = stubLocation()

    render(<MemoryRouter><Demo /></MemoryRouter>)
    fireEvent.click(screen.getByText('મેન્ટેનન્સ ઝડપથી ઉઘરાવો'))
    restore()

    const guide = loadGuideState()
    expect(guide.journey).toBe('payment')
    const targetFlat = seed.flats.find(f => f.id === guide.targetFlatId)!
    const hasUnpaidBill = seed.bills.some(b => b.flatId === targetFlat.id && b.paidAmount < b.amount)
    expect(hasUnpaidBill).toBe(true)

    const session = JSON.parse(sessionStorage.getItem('prangan_demo_v1_session')!)
    expect(session.role).toBe('society_admin')
    vi.doUnmock('../demoMode')
  })

  it('picking the complaint journey card sets up the complaint guide and starts as a resident', async () => {
    vi.doMock('../demoMode', () => ({ isDemoModeEnabled: () => true }))
    const { default: Demo } = await import('../../pages/Demo')
    const { restore } = stubLocation()

    render(<MemoryRouter><Demo /></MemoryRouter>)
    fireEvent.click(screen.getByText('ફરિયાદ યોગ્ય રીતે ઉકેલો'))
    restore()

    const guide = loadGuideState()
    expect(guide.journey).toBe('complaint')
    const session = JSON.parse(sessionStorage.getItem('prangan_demo_v1_session')!)
    expect(session.role).toBe('resident_owner')
    vi.doUnmock('../demoMode')
  })

  it('picking a free-exploration option (not a journey card) genuinely leaves no guide active', async () => {
    vi.doMock('../demoMode', () => ({ isDemoModeEnabled: () => true }))
    const { default: Demo } = await import('../../pages/Demo')
    const { restore } = stubLocation()

    render(<MemoryRouter><Demo /></MemoryRouter>)
    fireEvent.click(screen.getByText('હું કમિટી મેમ્બર છું'))
    restore()

    expect(loadGuideState().journey).toBeNull()
    vi.doUnmock('../demoMode')
  })
})

describe('the guide banner, once a journey is actually running, tracks real progress through the real payment journey', () => {
  it('shows step one at the start, updates as each real step actually happens, and shows completion at the end', async () => {
    const { DemoGuideBanner } = await import('../../components/DemoGuideBanner')
    const { saveGuideState } = await import('../demoGuide')

    let data: ReturnType<typeof useData>
    function Probe() {
      data = useData()
      return <DemoGuideBanner />
    }

    render(<MemoryRouter><DemoDataProvider><Probe /></DemoDataProvider></MemoryRouter>)
    act(() => { data!.login('society_admin') })
    const targetFlat = data!.db.flats.find(f => data!.flatPending(f.id) > 0)!
    const targetBill = data!.db.bills.find(b => b.flatId === targetFlat.id && b.paidAmount < b.amount)!
    act(() => { saveGuideState({ journey: 'payment', targetFlatId: targetFlat.id, targetBillId: targetBill.id, dismissed: false }) })
    act(() => { data!.login('society_admin') }) // re-trigger a render so the freshly-saved guide state is actually picked up

    // nothing has happened yet - still committee, guide just started
    await screen.findByText(/0\/4/)

    act(() => { data!.logout() })
    act(() => { data!.login('resident_owner', targetFlat.id) })
    await screen.findByText(/1\/4/)

    const bill = data!.db.bills.find(b => b.flatId === targetFlat.id && b.paidAmount < b.amount)!
    act(() => { data!.recordPayment({ flatId: targetFlat.id, billId: bill.id, amount: bill.amount - bill.paidAmount, mode: 'upi', pending: true }) })
    await screen.findByText(/2\/4/)

    act(() => { data!.logout() })
    act(() => { data!.login('society_admin') })
    const pay = data!.db.payments.find(p => p.flatId === targetFlat.id)!
    act(() => { data!.confirmPendingPayment(pay.id) })
    await screen.findByText(/3\/4/)

    act(() => { data!.logout() })
    act(() => { data!.login('resident_owner', targetFlat.id) })
    await screen.findByText('જર્ની પૂરી થઈ 🎉')
  })

  it('dismissing the guide genuinely, permanently hides it for the rest of the session, not just until the next render', async () => {
    const { DemoGuideBanner } = await import('../../components/DemoGuideBanner')
    const { saveGuideState } = await import('../demoGuide')

    let data: ReturnType<typeof useData>
    function Probe() {
      data = useData()
      return <DemoGuideBanner />
    }

    render(<MemoryRouter><DemoDataProvider><Probe /></DemoDataProvider></MemoryRouter>)
    act(() => { data!.login('society_admin') })
    const targetBill = data!.db.bills.find(b => b.paidAmount < b.amount)!
    act(() => { saveGuideState({ journey: 'payment', targetFlatId: targetBill.flatId, targetBillId: targetBill.id, dismissed: false }) })
    act(() => { data!.login('society_admin') }) // re-trigger a render so the freshly-saved guide state is actually picked up

    const dismissButton = await screen.findByLabelText('ગાઇડ બંધ કરો')
    act(() => { fireEvent.click(dismissButton) })

    expect(screen.queryByLabelText('ગાઇડ બંધ કરો')).not.toBeInTheDocument()
    cleanup()
    render(<MemoryRouter><DemoDataProvider><DemoGuideBanner /></DemoDataProvider></MemoryRouter>)
    expect(screen.queryByLabelText('ગાઇડ બંધ કરો')).not.toBeInTheDocument()
  })

  it('never renders at all for a real session', async () => {
    const { DemoGuideBanner } = await import('../../components/DemoGuideBanner')
    const { DataProvider } = await import('../store')
    render(<MemoryRouter><DataProvider><DemoGuideBanner /></DataProvider></MemoryRouter>)
    expect(screen.queryByLabelText('ગાઇડ બંધ કરો')).not.toBeInTheDocument()
  })
})
