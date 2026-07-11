import { describe, expect, it } from 'vitest'
import { buildDemoSeed } from '../demoSeed'
import { billStatus, flatPending, totalPending } from '../storeHelpers'

/**
 * The Sahaj Residency demo seed is meant to be internally consistent, not
 * approximately right. These prove the numbers actually add up: the exact
 * outstanding total, the exact count of overdue flats, and the specific bits
 * of realistic disorder the demo is supposed to show. If someone later edits
 * the seed and the money stops adding up, this fails loudly rather than
 * shipping a demo that quietly contradicts itself.
 */
describe('the Sahaj Residency demo seed adds up exactly', () => {
  const seed = buildDemoSeed()

  it('has the fictional society and 64 flats', () => {
    expect(seed.societies[0].nameEn).toBe('Sahaj Residency')
    expect(seed.flats).toHaveLength(64)
  })

  it('total outstanding across the whole society is exactly Rs 18,400, summed from flatPending across every flat', () => {
    const summed = seed.flats.reduce((s, f) => s + flatPending(seed, f.id), 0)
    expect(summed).toBe(18400)
  })

  it('the standalone totalPending computation agrees, also exactly 18,400', () => {
    expect(totalPending(seed)).toBe(18400)
  })

  it('exactly 6 flats are genuinely overdue on a bill', () => {
    const overdueFlats = seed.flats.filter(f =>
      seed.bills.some(b => b.flatId === f.id && billStatus(b) === 'overdue'),
    )
    expect(overdueFlats).toHaveLength(6)
  })

  it('exactly 1 payment is sitting in pending_confirmation, and it is a UPI claim', () => {
    const pending = seed.payments.filter(p => p.status === 'pending_confirmation')
    expect(pending).toHaveLength(1)
    expect(pending[0].mode).toBe('upi')
  })

  it('exactly 2 bills are genuinely partially paid (paidAmount above 0 but below the full amount)', () => {
    const partial = seed.bills.filter(b => b.paidAmount > 0 && b.paidAmount < b.amount)
    expect(partial).toHaveLength(2)
  })

  it('has 3 complaints, each in a different status, showing real variety', () => {
    expect(seed.complaints).toHaveLength(3)
    expect(new Set(seed.complaints.map(c => c.status))).toEqual(new Set(['new', 'assigned', 'done']))
  })

  it('has a lift AMC whose renewal is coming up', () => {
    const liftAmc = seed.vendors.find(v => v.service.includes('લિફ્ટ') && v.amcEnd)
    expect(liftAmc).toBeDefined()
    // amcEnd is in the near future relative to the demo's "today" (2026-07-11),
    // so the vendors page shows a renewal to actually act on.
    expect(liftAmc!.amcEnd! > '2026-07-11').toBe(true)
    expect(liftAmc!.amcEnd! < '2026-10-01').toBe(true)
  })

  it('has a handful of recent expenses, not one token row', () => {
    expect(seed.expenses.length).toBeGreaterThanOrEqual(5)
  })

  it('has exactly one pinned/important notice', () => {
    expect(seed.notices.filter(n => n.pinned)).toHaveLength(1)
  })

  it('has one active (open) poll', () => {
    expect(seed.polls.filter(p => p.status === 'open')).toHaveLength(1)
  })

  it('has one upcoming event', () => {
    const upcoming = seed.events.filter(e => e.date > '2026-07-11')
    expect(upcoming).toHaveLength(1)
  })
})
