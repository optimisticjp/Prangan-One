> **Archived, historical document, not current.** This describes a state with no test runner wired up at all, from before real tests existed. The app now has 251 real, passing tests (`npm test`), run automatically in CI on every push. Kept here for history, not as a current reference.

# Testing plan

No test runner is wired into `package.json` on purpose, this ships as a working app first. This document is the plan for when you add one: what to test, why it matters for a society app specifically, and scaffolds ready to drop in.

## Why these four flows

Everything else in the app is CRUD (add a notice, add a vendor). These four are the flows where a silent bug either costs someone money, hides a safety issue, or breaks trust in the hisab (accounts). They're the ones worth testing first.

1. **Payment → receipt → dues update.** If this drifts, someone gets chased for money they already paid, or a shortfall goes unnoticed. This is the one residents will actually complain loudly about.
2. **Complaint lifecycle.** A complaint that silently gets stuck (never advances, or advances without the resident seeing it) undermines the whole "this app makes the committee accountable" pitch.
3. **One vote per flat.** Poll results are only meaningful if `flat_402` can't quietly vote three times. This is a small function (`vote()` in `store.tsx`) with an easy-to-verify contract.
4. **CSV export.** This is the accountant's audit trail. If a CSV is missing rows, has garbled Gujarati (encoding), or double-counts, it's the kind of bug nobody notices until an actual audit.

## Setup (when you're ready to add this)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom --save-dev
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
Add a `vitest.config.ts` with `environment: 'jsdom'`.

## Flow 1: Payment → receipt → dues

**Acceptance criteria**
- Recording a full payment against a bill sets `bill.paidAmount === bill.amount` and `billStatus(bill) === 'paid'`.
- A partial payment (e.g. ₹700 against a ₹1200 bill) leaves the bill `pending` (or `overdue` if past due date), and `flatPending()` reflects the ₹500 shortfall.
- A successful payment gets a `receiptNo` in the format `RT-2026-####`, sequential, never reused.
- A `failed: true` payment does NOT touch `bill.paidAmount` and does NOT get a `receiptNo`.
- `recordPayment()` never lets `paidAmount` exceed `amount`, even if someone fat-fingers an overpayment (currently clamped with `Math.min`).

```ts
// src/lib/store.test.tsx (scaffold)
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DataProvider, useData } from './store'

const wrapper = ({ children }: { children: React.ReactNode }) => <DataProvider>{children}</DataProvider>

describe('recordPayment', () => {
  it('marks a bill paid on full payment and issues a receipt', () => {
    const { result } = renderHook(() => useData(), { wrapper })
    const bill = result.current.db.bills.find(b => b.paidAmount < b.amount)!
    act(() => {
      result.current.recordPayment({ flatId: bill.flatId, billId: bill.id, amount: bill.amount - bill.paidAmount, mode: 'upi' })
    })
    const updated = result.current.db.bills.find(b => b.id === bill.id)!
    expect(result.current.billStatus(updated)).toBe('paid')
  })

  it('does not update bill or issue a receipt on a failed payment', () => {
    const { result } = renderHook(() => useData(), { wrapper })
    const bill = result.current.db.bills.find(b => b.paidAmount < b.amount)!
    const before = bill.paidAmount
    let pay
    act(() => {
      pay = result.current.recordPayment({ flatId: bill.flatId, billId: bill.id, amount: bill.amount, mode: 'upi', failed: true })
    })
    expect(pay!.receiptNo).toBeUndefined()
    expect(result.current.db.bills.find(b => b.id === bill.id)!.paidAmount).toBe(before)
  })
})
```

## Flow 2: Complaint lifecycle

**Acceptance criteria**
- A new complaint starts at `status: 'new'` with a one-entry timeline.
- `advanceComplaint()` appends to the timeline rather than replacing it (full history stays visible to the resident).
- Status only moves forward through `new → assigned → inprogress → done → closed` (the admin UI enforces this via the `FLOW` map; worth also asserting it at the store level if this logic ever moves there).
- Feedback (`addFeedback`) can only be meaningfully left once `status` is `done` or `closed` (UI-enforced today in `ComplaintDetail.tsx`; consider enforcing in the store when this becomes a backend call).

```ts
describe('complaint lifecycle', () => {
  it('records timeline history on each advance, not just the latest status', () => {
    const { result } = renderHook(() => useData(), { wrapper })
    let complaint
    act(() => {
      complaint = result.current.addComplaint({ flatId: 'flat_101', category: 'પાણી', title: 'ટેસ્ટ', detail: '', priority: 'normal' })
    })
    act(() => {
      result.current.advanceComplaint(complaint!.id, 'assigned', 'વેન્ડરને કહ્યું', 'કમિટી')
    })
    const updated = result.current.db.complaints.find(c => c.id === complaint!.id)!
    expect(updated.timeline).toHaveLength(2)
    expect(updated.status).toBe('assigned')
  })
})
```

## Flow 3: One vote per flat

**Acceptance criteria**
- `vote(pollId, flatId, optionIdx)` returns `true` and records the vote the first time.
- Calling it again for the same `flatId` on the same poll returns `false` and does NOT change the previously recorded vote (even to a different option).
- Voting on a `closed` poll always returns `false`.

```ts
describe('vote', () => {
  it('rejects a second vote from the same flat', () => {
    const { result } = renderHook(() => useData(), { wrapper })
    const poll = result.current.db.polls.find(p => p.status === 'open')!
    let first, second
    act(() => { first = result.current.vote(poll.id, 'flat_999', 0) })
    act(() => { second = result.current.vote(poll.id, 'flat_999', 1) })
    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(result.current.db.polls.find(p => p.id === poll.id)!.votes['flat_999']).toBe(0)
  })
})
```

## Flow 4: CSV export

**Acceptance criteria**
- Row count in the CSV matches the row count passed in (no silent drops, no duplicate header rows).
- Output starts with a UTF-8 BOM (`\uFEFF`) so Gujarati text opens correctly in Excel instead of showing mojibake.
- Any field containing a comma, quote, or newline gets properly quoted/escaped (test with a note like `નોંધ: "ખાસ", વિનંતી`).

```ts
import { describe, it, expect, vi } from 'vitest'

describe('exportCsv', () => {
  it('escapes commas and quotes and includes a BOM', () => {
    const created: string[] = []
    const origCreateObjectURL = URL.createObjectURL
    URL.createObjectURL = vi.fn((blob: Blob) => { blob.text().then(t => created.push(t)); return 'blob:mock' })

    // exportCsv(...) call here, then flush microtasks and assert on `created[0]`
    // expect(created[0].startsWith('\uFEFF')).toBe(true)
    // expect(created[0]).toContain('"નોંધ: ""ખાસ"", વિનંતી"')

    URL.createObjectURL = origCreateObjectURL
  })
})
```

## What's deliberately out of scope for now

- End-to-end/browser tests (Playwright), worth adding once the Supabase swap lands, since that's when real navigation/auth flows exist to break.
- Visual regression: the design is still young enough that visuals will keep shifting, so lock this in later.
- Load testing: not meaningful until there's a real backend to load-test.
