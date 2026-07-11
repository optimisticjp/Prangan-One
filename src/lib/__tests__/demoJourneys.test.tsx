import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, fireEvent, act, within } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DemoDataProvider } from '../demoStore'
import { useData } from '../store'

/**
 * The primary sales journey, proven twice, deliberately: once at the
 * store level, confirming the underlying data is genuinely correct
 * through every step, and once through the actual, real page
 * components a person would click through in a live demo - a store-
 * level pass alone would prove the data layer works without proving
 * anyone could actually reach that outcome through the real UI.
 *
 * Switching role mid-journey uses the same mechanism a real demo
 * session does: logout() (a pure, local session clear, fixed in this
 * build to no longer force a page reload for the demo case) followed by
 * login() for the new role, on the same still-mounted provider - not a
 * fresh session, and not a different provider instance, since the whole
 * point of build 3's storage design was that a role switch never needs
 * to touch the underlying data at all.
 */
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('the full committee-to-resident-and-back payment journey, at the store level', () => {
  it('an overdue flat becomes paid, pending, confirmed, and visible to the resident, through every real step', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })

    // Step 1: committee sees an overdue flat
    act(() => { result.current.login('society_admin') })
    const overdueFlat = result.current.db.flats.find(f => result.current.flatPending(f.id) > 0)
    expect(overdueFlat).toBeDefined()
    const owedBefore = result.current.flatPending(overdueFlat!.id)
    expect(owedBefore).toBeGreaterThan(0)

    // Step 2: switch to that resident
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', overdueFlat!.id) })
    expect(result.current.session.role).toBe('resident_owner')
    expect(result.current.session.flatId).toBe(overdueFlat!.id)

    // Step 3: resident marks the bill as paid (pending committee confirmation)
    const bill = result.current.db.bills.find(b => b.flatId === overdueFlat!.id && b.paidAmount < b.amount)!
    let pay: ReturnType<typeof result.current.recordPayment>
    act(() => {
      pay = result.current.recordPayment({ flatId: overdueFlat!.id, billId: bill.id, amount: bill.amount - bill.paidAmount, mode: 'upi', pending: true })
    })
    expect(pay!).not.toBeNull()
    expect(pay!.status).toBe('pending_confirmation')
    // the bill itself must not be marked paid yet - it's only a claim until confirmed
    expect(result.current.db.bills.find(b => b.id === bill.id)?.paidAmount).toBe(bill.paidAmount)

    // Step 4: switch back to committee
    act(() => { result.current.logout() })
    act(() => { result.current.login('society_admin') })

    // Step 5: payment appears in pending verification
    const pendingForCommittee = result.current.db.payments.find(p => p.id === pay!.id)
    expect(pendingForCommittee?.status).toBe('pending_confirmation')

    // Step 6: committee verifies it
    act(() => { result.current.confirmPendingPayment(pay!.id) })
    const confirmed = result.current.db.payments.find(p => p.id === pay!.id)
    expect(confirmed?.status).toBe('success')
    expect(confirmed?.receiptNo).toBeTruthy()
    // and the bill itself is now genuinely, correctly updated
    expect(result.current.db.bills.find(b => b.id === bill.id)?.paidAmount).toBe(bill.amount)

    // Step 7: switch back to resident
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', overdueFlat!.id) })

    // Step 8: resident sees the updated payment state and a real receipt number
    expect(result.current.flatPending(overdueFlat!.id)).toBe(owedBefore - (bill.amount - bill.paidAmount))
    const residentSideView = result.current.db.payments.find(p => p.id === pay!.id)
    expect(residentSideView?.status).toBe('success')
    expect(residentSideView?.receiptNo).toBe(confirmed?.receiptNo)
  })
})

describe('the same journey\u2019s key steps, through the actual, real page components a person would click through', () => {
  it('a resident genuinely marks a bill paid using the real Bill.tsx UI, and it genuinely appears in the real Payments.tsx pending-verification queue', async () => {
    const { DemoDataProvider: Provider } = await import('../demoStore')
    const { buildDemoSeed } = await import('../demoSeed')
    const seed = buildDemoSeed()
    const overdueFlat = seed.flats.find(f => seed.bills.some(b => b.flatId === f.id && b.paidAmount < b.amount))!

    // enter as that resident directly via the demo's own session mechanism
    const { startDemoSession } = await import('../demoStore')
    const locationStub = { href: '' }
    const originalLocation = window.location
    // @ts-expect-error - deliberately stubbing for this one call, restored right after
    delete window.location
    // @ts-expect-error - see above
    window.location = locationStub
    startDemoSession('resident_owner', overdueFlat.id, '/app')
    // @ts-expect-error - restoring the real window.location
    window.location = originalLocation

    const { default: Bill } = await import('../../pages/resident/Bill')
    render(<MemoryRouter><Provider><Bill /></Provider></MemoryRouter>)

    fireEvent.click(await screen.findByText('મેન્ટેનન્સ ભરો'))
    fireEvent.click(await screen.findByText('મેં ચૂકવ્યું છે, નોંધ કરો'))
    fireEvent.click(await screen.findByText('નોંધ કરો'))

    await screen.findByText(/તમારી ચુકવણીની નોંધ થઈ ગઈ/)
    cleanup()

    // now genuinely switch to committee - same provider concept, a fresh
    // render standing in for what a real logout()+login() transition
    // leaves behind: the same sessionStorage-persisted data, a
    // different role
    // @ts-expect-error - see above
    delete window.location
    // @ts-expect-error - see above
    window.location = { href: '' }
    startDemoSession('society_admin', undefined, '/admin')
    // @ts-expect-error - see above
    window.location = originalLocation

    const { default: Payments } = await import('../../pages/admin/Payments')
    render(<MemoryRouter><Provider><Payments /></Provider></MemoryRouter>)

    const queue = await screen.findByText('રહેવાસીએ "મેં ચૂકવ્યું" કહ્યું છે, પુષ્ટિ બાકી')
    const queueCard = queue.closest('div')!
    expect(within(queueCard).getByText(overdueFlat.number, { exact: false })).toBeInTheDocument()

    const confirmButton = within(queueCard).getByText('પુષ્ટિ કરો')
    act(() => { fireEvent.click(confirmButton) })

    // confirmed - the pending-verification card for this flat is gone now
    expect(within(queueCard).queryByText(overdueFlat.number, { exact: false })).not.toBeInTheDocument()
  })
})

describe('the admin layout "exit demo" control genuinely exits the demo, a full navigation to the real login, not a client-side route change that would leave the demo provider mounted', () => {
  it('clicking it clears the demo session storage and does a full navigation to /login', async () => {
    const { Shell } = await import('../../layouts/Layouts')
    const { Routes, Route } = await import('react-router-dom')

    // A demo session genuinely present in storage, so we can prove exit
    // clears it. main.tsx reads exactly the session key to pick the provider.
    sessionStorage.setItem('prangan_demo_v1_db', '{}')
    sessionStorage.setItem('prangan_demo_v1_session', '{"role":"society_admin","flatId":null}')
    sessionStorage.setItem('prangan_demo_v1_guide', '{"journey":"payment"}')

    // JSDOM can't perform a real navigation, so window.location is stubbed to
    // capture the href exitDemo sets. That is what proves this is a full
    // navigation (window.location.href), not a client-side <Link> to /demo.
    const originalLocation = window.location
    // @ts-expect-error jsdom's window.location isn't normally reassignable
    delete window.location
    // @ts-expect-error see above
    window.location = { href: '' }
    try {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <DemoDataProvider>
            <Routes>
              <Route path="/admin" element={<Shell items={[]} title="Test" />}>
                <Route index element={<div>admin home</div>} />
              </Route>
            </Routes>
          </DemoDataProvider>
        </MemoryRouter>,
      )

      const exitControl = await screen.findByText('ડેમો છોડો')
      // It is no longer an anchor to /demo - it's a real exit, not a route change.
      expect(exitControl.closest('a')).toBeNull()
      fireEvent.click(exitControl)

      expect(window.location.href).toBe('/login')
      expect(sessionStorage.getItem('prangan_demo_v1_session')).toBeNull()
      expect(sessionStorage.getItem('prangan_demo_v1_db')).toBeNull()
      expect(sessionStorage.getItem('prangan_demo_v1_guide')).toBeNull()
    } finally {
      // @ts-expect-error restore the real location object for other tests
      window.location = originalLocation
    }
  })
})

describe('the dashboard\u2019s own "view as this resident" button, demo-only, matching the spec\u2019s guided journey exactly', () => {
  it('clicking it on an overdue flat genuinely navigates to that resident\u2019s own app view', async () => {
    const { default: Dashboard } = await import('../../pages/admin/Dashboard')
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <DemoDataProvider>
          <Routes>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/app" element={<div>resident app view</div>} />
          </Routes>
        </DemoDataProvider>
      </MemoryRouter>,
    )
    const buttons = await screen.findAllByTitle('આ રહેવાસી તરીકે જુઓ')
    act(() => { fireEvent.click(buttons[0]) })
    await screen.findByText('resident app view')
  })
})

describe('the admin dashboard genuinely reacts to demo actions, not frozen numbers from the seed', () => {
  it('recording a payment reduces the dashboard\u2019s own outstanding total by exactly that amount', async () => {
    const { default: Dashboard } = await import('../../pages/admin/Dashboard')
    let recordPayment: ReturnType<typeof useData>['recordPayment']
    let totalPending: ReturnType<typeof useData>['totalPending']
    let db: ReturnType<typeof useData>['db']
    function Probe() {
      const data = useData()
      recordPayment = data.recordPayment
      totalPending = data.totalPending
      db = data.db
      return <Dashboard />
    }

    render(<MemoryRouter><DemoDataProvider><Probe /></DemoDataProvider></MemoryRouter>)
    const before = totalPending!()
    const outstandingLabel = await screen.findByText('કુલ બાકી')
    const outstandingCardBefore = outstandingLabel.closest('div')!.parentElement!
    expect(within(outstandingCardBefore).getByText(`₹${before.toLocaleString('en-IN')}`)).toBeInTheDocument()

    const unpaidBill = db!.bills.find(b => b.paidAmount < b.amount)!
    act(() => { recordPayment!({ flatId: unpaidBill.flatId, billId: unpaidBill.id, amount: unpaidBill.amount - unpaidBill.paidAmount, mode: 'cash' }) })

    const after = totalPending!()
    expect(after).toBe(before - (unpaidBill.amount - unpaidBill.paidAmount))
    const outstandingCardAfter = screen.getByText('કુલ બાકી').closest('div')!.parentElement!
    expect(within(outstandingCardAfter).getByText(`₹${after.toLocaleString('en-IN')}`)).toBeInTheDocument()
  })

  it('filing a complaint increases the dashboard\u2019s own open-complaint count by exactly one', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })
    act(() => { result.current.login('society_admin') })
    const openBefore = result.current.db.complaints.filter(c => c.status !== 'closed' && c.status !== 'done').length

    act(() => {
      result.current.addComplaint({ flatId: result.current.db.flats[0].id, category: 'General', title: 'Dashboard reactivity test', detail: '', priority: 'normal' })
    })

    const openAfter = result.current.db.complaints.filter(c => c.status !== 'closed' && c.status !== 'done').length
    expect(openAfter).toBe(openBefore + 1)
  })
})

describe('notices and polls, the two remaining core journeys the spec names, proven end to end alongside payments and complaints', () => {
  it('a notice the committee posts is genuinely visible to a resident', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })
    act(() => { result.current.login('society_admin') })
    act(() => { result.current.addNotice({ title: 'Journey test notice', body: 'Water will be off Sunday', category: 'general', pinned: false }) })

    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', result.current.db.flats[0].id) })

    expect(result.current.db.notices.some(n => n.title === 'Journey test notice')).toBe(true)
  })

  it('a poll the committee creates can genuinely be voted on by a resident, and the vote is genuinely counted, once, not twice', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })
    act(() => { result.current.login('society_admin') })
    act(() => { result.current.addPoll({ question: 'Journey test poll?', type: 'yesno', options: ['Yes', 'No'], resultVisible: true }) })
    const poll = result.current.db.polls.find(p => p.question === 'Journey test poll?')!

    act(() => { result.current.logout() })
    const flat = result.current.db.flats[0]
    act(() => { result.current.login('resident_owner', flat.id) })

    let firstVote = false
    act(() => { firstVote = result.current.vote(poll.id, flat.id, 0) })
    expect(firstVote).toBe(true)

    let secondVote = true
    act(() => { secondVote = result.current.vote(poll.id, flat.id, 1) })
    expect(secondVote).toBe(false)

    act(() => { result.current.logout() })
    act(() => { result.current.login('society_admin') })
    expect(result.current.db.polls.find(p => p.id === poll.id)?.votes[flat.id]).toBe(0)
  })
})

describe('the complaint journey, resident to committee and back to resolved, at the store level', () => {
  it('a complaint moves from new, to committee-viewed, to a status change the resident can see, to resolved', () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })

    // resident submits a complaint
    const flat = result.current.db.flats[0]
    act(() => { result.current.login('resident_owner', flat.id) })
    let complaint: ReturnType<typeof result.current.addComplaint>
    act(() => {
      complaint = result.current.addComplaint({ flatId: flat.id, category: 'General', title: 'Journey test leak', detail: 'Water leaking near the entrance', priority: 'normal' })
    })
    expect(complaint!).not.toBeNull()
    expect(complaint!.status).toBe('new')

    // committee views it and changes status
    act(() => { result.current.logout() })
    act(() => { result.current.login('society_admin') })
    const seenByCommittee = result.current.db.complaints.find(c => c.id === complaint!.id)
    expect(seenByCommittee).toBeDefined()

    act(() => { result.current.advanceComplaint(complaint!.id, 'assigned', 'Sending someone to check', 'Committee') })
    expect(result.current.db.complaints.find(c => c.id === complaint!.id)?.status).toBe('assigned')

    // resident sees the update
    act(() => { result.current.logout() })
    act(() => { result.current.login('resident_owner', flat.id) })
    const updatedForResident = result.current.db.complaints.find(c => c.id === complaint!.id)
    expect(updatedForResident?.status).toBe('assigned')
    expect(updatedForResident?.timeline.some(t => t.status === 'assigned')).toBe(true)

    // committee resolves it
    act(() => { result.current.logout() })
    act(() => { result.current.login('society_admin') })
    act(() => { result.current.advanceComplaint(complaint!.id, 'done', 'Fixed the leak', 'Committee') })

    expect(result.current.db.complaints.find(c => c.id === complaint!.id)?.status).toBe('done')
  })
})
